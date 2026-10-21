// Discovery run (plan §9.1): analyze → search → verify → classify → rank → save.
// Runs in-process (no queue in v1); progress lives on the discovery_run row.

import { classifyPeopleTask, parsePeopleTask, type Classification, type JobAnalysis } from "@rc/ai";
import {
  heuristicFunction,
  heuristicSeniority,
  keywordOverlap,
  normalizeName,
  parseProfileResult,
  planQueries,
  scoreCandidate,
  selectTop,
  verifyCandidate,
  type Candidate,
  type Rejection,
  type Score,
} from "@rc/core";
import { prisma, type Prisma, type RelationshipTag } from "@rc/db";
import { HttpError, notFound } from "../http/errors";
import { runAi } from "./ai";
import { ensureAnalysis } from "./jobs";
import { searchProvider, type SearchProvider } from "./search";

const MAX_TO_CLASSIFY = 60;
const DAY = 86_400_000;

export type DiscoveryStep = "ANALYZING" | "SEARCHING" | "VERIFYING" | "RANKING" | "SAVING" | "DONE";

export async function startDiscovery(userId: string, jobId: string) {
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId } });
  if (!job) throw notFound("Job");
  searchProvider(); // fail fast with a clear message when search isn't configured

  const running = await prisma.discoveryRun.findFirst({
    where: { jobId, status: "RUNNING", createdAt: { gte: new Date(Date.now() - 5 * 60_000) } },
  });
  if (running) return running;

  const run = await prisma.discoveryRun.create({ data: { jobId, progress: { step: "ANALYZING" } } });
  void runDiscovery(userId, jobId, run.id).catch(async (e) => {
    console.error(`Discovery ${run.id} failed`, e);
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: e instanceof HttpError ? e.message : "Search failed. Try again in a minute." },
    });
  });
  return run;
}

export async function latestDiscovery(userId: string, jobId: string) {
  return prisma.discoveryRun.findFirst({ where: { jobId, job: { userId } }, orderBy: { createdAt: "desc" } });
}

async function progress(runId: string, step: DiscoveryStep, extra: Prisma.DiscoveryRunUpdateInput = {}) {
  await prisma.discoveryRun.update({ where: { id: runId }, data: { progress: { step }, ...extra } });
}

/** Exported for tests, which pass a fake search provider. */
export async function runDiscovery(userId: string, jobId: string, runId: string, search: SearchProvider = searchProvider()) {
  // 1. Understand the job.
  const analysis = await ensureAnalysis(userId, jobId);
  const [job, education] = await Promise.all([
    prisma.jobOpportunity.findUniqueOrThrow({ where: { id: jobId }, include: { company: true } }),
    prisma.education.findFirst({ where: { userId } }),
  ]);
  const university = education?.institutionRaw ?? null;
  const companyNames = dedupeNames([job.company.name, analysis.company, ...analysis.companyAliases]);

  // 2. Search.
  await progress(runId, "SEARCHING");
  const queries = planQueries({
    companyNames,
    location: job.location ?? analysis.location,
    roleFamily: analysis.roleFamily,
    contactTitles: analysis.recommendedContactTitles,
    university,
  });
  const settled = await Promise.allSettled(queries.map((q) => search.search(q.query)));
  const results = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const failures = settled.filter((s) => s.status === "rejected");
  if (failures.length === settled.length) throw new HttpError(502, "SEARCH_FAILED", `Search failed: ${(failures[0] as PromiseRejectedResult).reason}`);

  // 3. Verify: keep only people a real search result shows working there now.
  await progress(runId, "VERIFYING", { queries: queries as unknown as Prisma.InputJsonValue, candidatesFound: results.length });
  const rejections: Partial<Record<Rejection, number>> = {};
  const byUrl = new Map<string, Candidate>();
  for (const r of results) {
    const parsed = parseProfileResult(r);
    if (!parsed) {
      rejections.NOT_A_PROFILE = (rejections.NOT_A_PROFILE ?? 0) + 1;
      continue;
    }
    const v = verifyCandidate(parsed, { companyNames, university });
    if (!v.ok) rejections[v.reason] = (rejections[v.reason] ?? 0) + 1;
    else if (!byUrl.has(v.candidate.url)) byUrl.set(v.candidate.url, v.candidate);
  }

  // 4–5. Classify, rank and save.
  await progress(runId, "RANKING", { candidatesVerified: byUrl.size });
  const { top, reserves } = await rankAndSave(userId, job, analysis, [...byUrl.values()], "WEB_EVIDENCE", () => progress(runId, "SAVING"));

  await prisma.discoveryRun.update({
    where: { id: runId },
    data: {
      status: "DONE",
      progress: {
        step: "DONE",
        added: top.length,
        reserves: reserves.length,
        alumniFound: [...top, ...reserves].filter((s) => s.candidate.isAlumni).length,
        university,
        rejections,
        failedQueries: failures.length,
      },
    },
  });
}

type JobWithCompany = Prisma.JobOpportunityGetPayload<{ include: { company: true } }>;
type Confidence = "WEB_EVIDENCE" | "LINKEDIN_PASTE";

const PASTED = "pasted:";
const isPasted = (key: string) => key.startsWith(PASTED);

/**
 * Shared by web discovery and LinkedIn-page pastes: skip people already on this job,
 * classify (AI, rules fallback), score, pick the top + reserves, and save in batches.
 */
async function rankAndSave(
  userId: string,
  job: JobWithCompany,
  analysis: JobAnalysis,
  verified: Candidate[],
  confidence: Confidence,
  beforeSave?: () => Promise<void>,
  opts: { top: number; reserves: number } = { top: 15, reserves: 10 },
) {
  // Existing contacts: by profile URL for web results, by name within the company for pastes.
  const urls = verified.map((c) => c.url).filter((u) => !isPasted(u));
  const names = verified.filter((c) => isPasted(c.url)).map((c) => c.fullName);
  const existing = await prisma.contact.findMany({
    where: {
      userId,
      OR: [
        ...(urls.length ? [{ linkedinUrl: { in: urls } }] : []),
        ...(names.length ? [{ companyId: job.companyId, fullName: { in: names, mode: "insensitive" as const } }] : []),
      ],
    },
    include: { outreach: true },
  });
  const keyOf = (c: { linkedinUrl: string | null; fullName: string }) => c.linkedinUrl ?? `${PASTED}${normalizeName(c.fullName)}`;
  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const c of existing) {
    existingByKey.set(keyOf(c), c);
    existingByKey.set(`${PASTED}${normalizeName(c.fullName)}`, c);
  }
  const candidates = verified.filter((c) => !existingByKey.get(c.url)?.outreach.some((o) => o.jobId === job.id)).slice(0, MAX_TO_CLASSIFY);

  const classes = await classify(userId, analysis, candidates);
  const city = normalizeName((job.location ?? analysis.location ?? "").split(",")[0] ?? "");
  const keywords = [...analysis.requiredSkills, ...analysis.preferredSkills, ...analysis.domains];
  const now = Date.now();

  const scored = candidates.map((c, i) => {
    const cls = classes.get(String(i));
    const known = existingByKey.get(c.url);
    const seniority = cls?.seniority ?? heuristicSeniority(c.titleText ?? c.headline);
    const fn = cls?.function ?? heuristicFunction(c.titleText ?? c.headline);
    const score: Score = scoreCandidate(
      {
        isAlumni: c.isAlumni,
        roleRelevance: cls?.roleRelevance ?? (fn === "ENGINEERING" && /engineer|developer/i.test(analysis.roleFamily) ? 1 : 0.5),
        seniority,
        function: fn,
        domainOverlap: keywordOverlap(c.headline, keywords),
        alreadyConnected: Boolean(known?.isConnected || c.isConnected),
        sameLocation: Boolean(city && c.location && normalizeName(c.location).includes(city)),
        // Explicit offers only: a recruiter's "University Hiring" title isn't one.
        openToRefer: /\b(referrals?|happy to refer|dm (me )?for|we'?re hiring|#hiring)\b/i.test(c.text),
        companyReferralBonus: job.company.hasReferralBonus === true,
        recentlyContactedForOtherJob: Boolean(known?.outreach.some((o) => o.lastSentAt && now - o.lastSentAt.getTime() < 30 * DAY)),
        previouslyDeclined: Boolean(known?.outreach.some((o) => o.state === "DECLINED")),
        confidence,
      },
      undefined,
      { school: c.isAlumni ? c.school : null },
    );
    return { candidate: c, score, seniority, fn };
  });
  const { top, reserves } = selectTop(scored, { ...opts, maxRecruiters: 2 });

  await beforeSave?.();
  await saveCandidates(
    userId,
    job.id,
    job.companyId,
    [...top.map((s) => ({ ...s, isReserve: false })), ...reserves.map((s) => ({ ...s, isReserve: true }))],
    existingByKey,
    confidence,
  );
  return { top, reserves, skippedExisting: verified.length - candidates.length };
}

export interface PasteSummary {
  added: number;
  alumni: number;
  alreadyOnList: number;
  skipped: Partial<Record<Rejection | "NOT_IN_TEXT", number>>;
}

/**
 * People copied from a LinkedIn page by the user (plan §9.1, People-tab paste). The AI only
 * extracts; every name must appear verbatim in the pasted text, then the usual checks run.
 * `source` says what the page was, which decides what can be taken as given.
 */
export async function addPastedPeople(
  userId: string,
  jobId: string,
  text: string,
  source: "COMPANY_PEOPLE" | "COMPANY_PEOPLE_COLLEGE" | "SEARCH",
): Promise<PasteSummary> {
  const analysis = await ensureAnalysis(userId, jobId);
  const [job, education] = await Promise.all([
    prisma.jobOpportunity.findFirstOrThrow({ where: { id: jobId, userId }, include: { company: true } }),
    prisma.education.findFirst({ where: { userId } }),
  ]);
  const university = education?.institutionRaw ?? null;
  const companyNames = dedupeNames([job.company.name, analysis.company, ...analysis.companyAliases]);

  const { data } = await runAi(userId, parsePeopleTask(text));
  const haystack = normalizeName(text);
  const inText = (s: string | null) => (s && haystack.includes(normalizeName(s)) ? s : null);

  const skipped: PasteSummary["skipped"] = {};
  const byKey = new Map<string, Candidate>();
  for (const person of data.people) {
    // Anti-hallucination: the name (and every other field) must literally be in the paste.
    if (!inText(person.fullName) || /linkedin member/i.test(person.fullName)) {
      skipped.NOT_IN_TEXT = (skipped.NOT_IN_TEXT ?? 0) + 1;
      continue;
    }
    const headline = inText(person.headline);
    const current = inText(person.currentLine)?.replace(/^current:\s*/i, "") ?? null;
    const school = inText(person.schoolText);
    const parsed = {
      url: `${PASTED}${normalizeName(person.fullName)}`,
      fullName: person.fullName.trim(),
      titleText: headline,
      headline: [headline, current].filter(Boolean).join(" · ") || person.fullName,
      experience: current,
      education: school,
      location: inText(person.location),
      text: [person.fullName, headline, current, school, person.location].filter(Boolean).join("\n"),
    };
    const v = verifyCandidate(parsed, {
      companyNames,
      university,
      trustCompany: source !== "SEARCH",
      trustAlumni: source === "COMPANY_PEOPLE_COLLEGE",
    });
    if (!v.ok) {
      skipped[v.reason] = (skipped[v.reason] ?? 0) + 1;
      continue;
    }
    byKey.set(parsed.url, { ...v.candidate, isConnected: person.degree === "1st" });
  }

  // Everything pasted is kept; anything beyond the visible list (e.g. extra recruiters) goes to reserves.
  const { top, reserves, skippedExisting } = await rankAndSave(userId, job, analysis, [...byKey.values()], "LINKEDIN_PASTE", undefined, {
    top: 50,
    reserves: 50,
  });
  return {
    added: top.length + reserves.length,
    alumni: top.filter((s) => s.candidate.isAlumni).length,
    alreadyOnList: skippedExisting,
    skipped,
  };
}

async function classify(userId: string, analysis: JobAnalysis, candidates: Candidate[]): Promise<Map<string, Classification>> {
  if (!candidates.length) return new Map();
  try {
    const { data } = await runAi(
      userId,
      classifyPeopleTask(
        analysis,
        candidates.map((c, i) => ({ id: String(i), headline: c.titleText ?? c.headline })),
      ),
    );
    return new Map(data.people.map((p) => [p.id, p]));
  } catch (e) {
    console.warn(`Classification unavailable, using rules: ${(e as Error).message}`);
    return new Map();
  }
}

type Ranked = { candidate: Candidate; score: Score; seniority: Classification["seniority"]; fn: Classification["function"]; isReserve: boolean };

async function saveCandidates(
  userId: string,
  jobId: string,
  companyId: string,
  ranked: Ranked[],
  existingByKey: Map<string, { id: string }>,
  confidence: Confidence,
) {
  if (!ranked.length) return;
  const fresh = ranked.filter((r) => !existingByKey.has(r.candidate.url));
  const created = fresh.length
    ? await prisma.contact.createManyAndReturn({
        data: fresh.map(({ candidate: c, seniority, fn }) => ({
          userId,
          companyId,
          fullName: c.fullName,
          // Pasted text carries no profile link; "Open LinkedIn" then searches by name + company.
          linkedinUrl: isPasted(c.url) ? null : c.url,
          headline: c.headline,
          currentTitle: c.currentTitle,
          location: c.location,
          seniority,
          function: fn,
          isConnected: c.isConnected ?? false,
          source: confidence === "LINKEDIN_PASTE" ? ("PEOPLE_TAB_PASTE" as const) : ("AI_SEARCH" as const),
          confidence,
          evidence: c.evidence,
        })),
      })
    : [];
  // createManyAndReturn returns rows in insertion order.
  const idByUrl = new Map<string, string>([
    ...[...existingByKey].map(([key, c]) => [key, c.id] as [string, string]),
    ...created.map((c, i) => [fresh[i]!.candidate.url, c.id] as [string, string]),
  ]);

  const tags: { contactId: string; tag: RelationshipTag; source: "RULE" | "AI"; evidence?: string }[] = [];
  const educations: { contactId: string; institutionRaw: string }[] = [];
  for (const r of fresh) {
    const contactId = idByUrl.get(r.candidate.url)!;
    if (r.candidate.school) educations.push({ contactId, institutionRaw: r.candidate.school });
    if (r.candidate.isAlumni) tags.push({ contactId, tag: "COLLEGE_ALUMNI", source: "RULE", evidence: r.candidate.school ?? undefined });
    if (r.fn === "RECRUITING") tags.push({ contactId, tag: "RECRUITER", source: "AI" });
    if (r.score.features.openToRefer) tags.push({ contactId, tag: "OPEN_TO_REFER", source: "RULE" });
  }

  const maxRank = (await prisma.outreach.aggregate({ where: { jobId }, _max: { rank: true } }))._max.rank ?? 0;
  await Promise.all([
    educations.length ? prisma.education.createMany({ data: educations }) : null,
    tags.length ? prisma.contactTag.createMany({ data: tags, skipDuplicates: true }) : null,
    prisma.outreach.createMany({
      skipDuplicates: true,
      data: ranked.map((r, i) => ({
        userId,
        jobId,
        contactId: idByUrl.get(r.candidate.url)!,
        rank: maxRank + i + 1,
        isReserve: r.isReserve,
        matchScore: r.score.score,
        scoreBreakdown: { reasons: r.score.reasons, warnings: r.score.warnings, bucket: r.score.bucket, features: r.score.features, weightsVersion: r.score.weightsVersion } as unknown as Prisma.InputJsonValue,
      })),
    }),
  ]);
}

function dedupeNames(names: string[]) {
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = normalizeName(n);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
