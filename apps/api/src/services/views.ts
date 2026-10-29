// Read models for the UI: everything a screen needs in one request.

import { ACTIVE_STATES, attentionFor, tabForState, type OutreachSnapshot } from "@rc/core";
import { prisma, type Prisma } from "@rc/db";
import { notFound } from "../http/errors";

const outreachInclude = {
  contact: { include: { tags: true, educations: true } },
  messages: { where: { status: "DRAFT" as const }, orderBy: { createdAt: "desc" as const } },
};

type OutreachRow = Awaited<ReturnType<typeof loadOutreach>>[number];

function loadOutreach(where: Prisma.OutreachWhereInput) {
  return prisma.outreach.findMany({ where, include: outreachInclude, orderBy: [{ isReserve: "asc" }, { rank: "asc" }] });
}

function reasonsFor(row: OutreachRow): string[] {
  // Discovered people carry the ranking's own explanation.
  const breakdown = row.scoreBreakdown as { reasons?: string[]; warnings?: string[] } | null;
  if (breakdown?.reasons) {
    const extra = row.contact.educations.length ? [] : ["School unknown"];
    return [...breakdown.reasons, ...(breakdown.warnings ?? []), ...extra];
  }
  const reasons: string[] = [];
  const tags = new Set(row.contact.tags.map((t) => t.tag));
  if (tags.has("COLLEGE_ALUMNI")) reasons.push(`${row.contact.educations[0]?.institutionRaw ?? "Same college"} alum`);
  if (tags.has("RECRUITER")) reasons.push("Recruiter");
  if (tags.has("OPEN_TO_REFER")) reasons.push("Open to referrals");
  if (row.contact.isConnected) reasons.push("Already connected");
  if (!row.contact.educations.length) reasons.push("School unknown");
  return reasons;
}

function serialize(row: OutreachRow, now: Date) {
  const snapshot = row as unknown as OutreachSnapshot & { stateChangedAt: Date };
  return {
    id: row.id,
    version: row.version,
    state: row.state,
    tab: tabForState(row.state),
    rank: row.rank,
    isReserve: row.isReserve,
    matchScore: row.matchScore,
    followupCount: row.followupCount,
    lastSentAt: row.lastSentAt,
    stateChangedAt: row.stateChangedAt,
    nextCheckAt: row.nextCheckAt,
    attention: attentionFor(snapshot, now),
    reasons: reasonsFor(row),
    isAlumni: row.contact.tags.some((t) => t.tag === "COLLEGE_ALUMNI"),
    contact: {
      id: row.contact.id,
      fullName: row.contact.fullName,
      currentTitle: row.contact.currentTitle,
      linkedinUrl: row.contact.linkedinUrl,
      location: row.contact.location,
      school: row.contact.educations[0]?.institutionRaw ?? null,
      isConnected: row.contact.isConnected,
      source: row.contact.source,
    },
    draft: row.messages[0]
      ? {
          id: row.messages[0].id,
          kind: row.messages[0].kind,
          body: row.messages[0].body,
          source: (row.messages[0].factsUsed as { source?: string } | null)?.source ?? "template",
        }
      : null,
  };
}

const TODAY_KINDS: string[] = ["MESSAGE_READY", "WITHDRAW_SUGGESTED", "NO_RESPONSE_SUGGESTED"];

/** Companies with active jobs, plus how many people need attention in each. */
export async function sidebar(userId: string) {
  const now = new Date();
  const companies = await prisma.company.findMany({
    where: { userId, jobs: { some: { status: { in: ["ACTIVE", "APPLIED"] } } } },
    include: {
      jobs: {
        where: { status: { in: ["ACTIVE", "APPLIED"] } },
        select: { id: true, title: true, outreach: { where: { state: { in: [...ACTIVE_STATES] } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    isSample: c.isSample,
    jobs: c.jobs.map((j) => ({ id: j.id, title: j.title })),
    // Count only what Today shows (follow-ups and checks were removed from Today).
    attentionCount: c.jobs
      .flatMap((j) => j.outreach)
      .filter((o) => {
        const a = attentionFor(o as unknown as OutreachSnapshot & { stateChangedAt: Date }, now);
        return a !== null && TODAY_KINDS.includes(a.kind);
      }).length,
  }));
}

export async function companyDetail(userId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    include: { jobs: { orderBy: { createdAt: "desc" } } },
  });
  if (!company) throw notFound("Company");
  return company;
}

export async function jobDetail(userId: string, jobId: string) {
  const now = new Date();
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId }, include: { company: true } });
  if (!job) throw notFound("Job");
  const rows = await loadOutreach({ jobId, userId });
  const people = rows.map((r) => serialize(r, now));
  const counts = { to_connect: 0, pending: 0, message_ready: 0, awaiting_reply: 0, done: 0 };
  for (const p of people) if (!p.isReserve || p.tab !== "to_connect") counts[p.tab]++;
  return { job, people, counts };
}

/** Everything that needs the user today, across all jobs. */
export async function today(userId: string) {
  const now = new Date();
  const rows = await prisma.outreach.findMany({
    where: { userId, state: { in: [...ACTIVE_STATES] }, job: { status: { in: ["ACTIVE", "APPLIED"] } } },
    include: { ...outreachInclude, job: { include: { company: true } } },
  });
  const items = rows
    .map((r) => ({ ...serialize(r, now), job: { id: r.job.id, title: r.job.title, companyId: r.job.companyId, companyName: r.job.company.name } }))
    .filter((i) => i.attention !== null);

  const group = (kinds: string[]) => items.filter((i) => kinds.includes(i.attention!.kind));
  return {
    messageReady: group(["MESSAGE_READY"]),
    followUps: group(["FOLLOWUP_DUE"]),
    checkReplies: group(["CHECK_REPLY"]),
    checkAccepted: group(["CHECK_ACCEPTED"]),
    cleanup: group(["WITHDRAW_SUGGESTED", "NO_RESPONSE_SUGGESTED"]),
    budget: await inviteBudget(userId),
  };
}

/** Invites sent today and this week, against the user's caps (plan §9.4). */
export async function inviteBudget(userId: string) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const base = { type: "REQUEST_SENT", outreach: { userId } };
  const [sentToday, sentWeek, profile] = await Promise.all([
    prisma.outreachEvent.count({ where: { ...base, createdAt: { gte: startOfDay } } }),
    prisma.outreachEvent.count({ where: { ...base, createdAt: { gte: weekAgo } } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { settings: true } }),
  ]);
  const settings = (profile?.settings ?? {}) as { dailyInviteCap?: number; weeklyInviteCap?: number };
  return { sentToday, sentWeek, dailyCap: settings.dailyInviteCap ?? 15, weeklyCap: settings.weeklyInviteCap ?? 100 };
}
