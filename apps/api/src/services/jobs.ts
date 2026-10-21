import { analyzeJobTask, type JobAnalysis } from "@rc/ai";
import { prisma } from "@rc/db";
import { notFound } from "../http/errors";
import { runAi } from "./ai";

export interface PostingDraft {
  companyName: string | null;
  title: string | null;
  externalJobId: string | null;
  location: string | null;
  descriptionRaw: string | null;
  /** True when we can't read the page and the user should paste the description. */
  needsPaste: boolean;
  source: "greenhouse" | "lever" | "linkedin" | "unknown";
}

const empty = (source: PostingDraft["source"], extra: Partial<PostingDraft> = {}): PostingDraft => ({
  companyName: null,
  title: null,
  externalJobId: null,
  location: null,
  descriptionRaw: null,
  needsPaste: true,
  source,
  ...extra,
});

/**
 * Reads a job posting from public applicant-tracking APIs. Only known hosts are
 * fetched (SSRF guard), and LinkedIn is never fetched: for LinkedIn links we
 * only read the job ID out of the URL text (plan §12).
 */
export async function readJobPosting(rawUrl: string): Promise<PostingDraft> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return empty("unknown");
  }
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  // LinkedIn's posting number isn't the company's job ID, so it's never used as one.
  if (host.endsWith("linkedin.com")) return empty("linkedin");

  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const jobsAt = segments.indexOf("jobs");
    const board = segments[jobsAt - 1] ?? url.searchParams.get("for");
    const id = segments[jobsAt + 1] ?? url.searchParams.get("token");
    if (!board || !id) return empty("greenhouse");
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs/${encodeURIComponent(id)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return empty("greenhouse");
    const job = (await res.json()) as { title?: string; location?: { name?: string }; content?: string };
    return {
      companyName: titleCase(board),
      title: job.title ?? null,
      externalJobId: id,
      location: job.location?.name ?? null,
      descriptionRaw: htmlToText(decodeEntities(job.content ?? "")),
      needsPaste: !job.content,
      source: "greenhouse",
    };
  }

  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
    const [company, id] = segments;
    if (!company || !id) return empty("lever");
    const api = host === "jobs.eu.lever.co" ? "api.eu.lever.co" : "api.lever.co";
    const res = await fetch(`https://${api}/v0/postings/${encodeURIComponent(company)}/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return empty("lever");
    const job = (await res.json()) as {
      text?: string;
      categories?: { location?: string };
      descriptionPlain?: string;
      lists?: { text?: string; content?: string }[];
      additionalPlain?: string;
    };
    const lists = (job.lists ?? []).map((l) => `${l.text ?? ""}\n${htmlToText(l.content ?? "")}`).join("\n\n");
    const description = [job.descriptionPlain, lists, job.additionalPlain].filter(Boolean).join("\n\n");
    return {
      companyName: titleCase(company),
      title: job.text ?? null,
      externalJobId: id,
      location: job.categories?.location ?? null,
      descriptionRaw: description || null,
      needsPaste: !description,
      source: "lever",
    };
  }

  return empty("unknown");
}

/** Analyzes a job with the AI; falls back to a minimal analysis so discovery can still run. */
export async function ensureAnalysis(userId: string, jobId: string): Promise<JobAnalysis> {
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId }, include: { company: true } });
  if (!job) throw notFound("Job");
  if (job.analysis) return job.analysis as JobAnalysis;

  let analysis: JobAnalysis;
  try {
    const { data } = await runAi(
      userId,
      analyzeJobTask({ company: job.company.name, title: job.title, jobId: job.externalJobId, location: job.location, description: job.descriptionRaw }),
    );
    // The user's own inputs win over the model's reading of them, and interns
    // can't refer, so they're never a target even if the model lists them.
    const titles = data.recommendedContactTitles.filter((t) => !/\b(intern|internship|apprentice)\b/i.test(t));
    analysis = {
      ...data,
      company: job.company.name,
      title: job.title,
      jobId: job.externalJobId ?? data.jobId,
      location: job.location ?? data.location,
      recommendedContactTitles: titles.length ? titles : fallbackAnalysis(job.company.name, job.title, job.location).recommendedContactTitles,
    };
  } catch (e) {
    console.warn(`Job analysis unavailable, using defaults: ${(e as Error).message}`);
    analysis = fallbackAnalysis(job.company.name, job.title, job.location);
  }
  await prisma.jobOpportunity.update({ where: { id: job.id }, data: { analysis } });
  return analysis;
}

function fallbackAnalysis(company: string, title: string, location: string | null): JobAnalysis {
  const engineering = /engineer|developer|sde|software|backend|frontend|full.?stack/i.test(title);
  return {
    company,
    companyAliases: [],
    title,
    jobId: null,
    location,
    employmentType: /intern/i.test(title) ? "INTERNSHIP" : "UNKNOWN",
    experienceLevel: /intern/i.test(title) ? "STUDENT" : "UNKNOWN",
    roleFamily: engineering ? "software engineering" : title,
    requiredSkills: [],
    preferredSkills: [],
    domains: [],
    recommendedContactTitles: engineering ? ["Software Engineer", "Senior Software Engineer", "Engineering Manager"] : [title.replace(/\bintern(ship)?\b/i, "").trim() || title],
  };
}

function titleCase(slug: string) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function decodeEntities(s: string) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(br|\/p|\/li|\/h\d|\/div)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
