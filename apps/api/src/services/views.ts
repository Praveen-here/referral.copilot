// Read models for the UI: everything a screen needs in one request.

import { ACTIVE_STATES, attentionFor, dedupeCombinedPeople, readyToSend, tabForState, type OutreachSnapshot } from "@rc/core";
import { prisma, type Prisma } from "@rc/db";
import { notFound } from "../http/errors";

const outreachInclude = {
  contact: { include: { tags: true, educations: true } },
  // Open drafts, plus their replies so the Awaiting reply tab knows who is talking.
  messages: {
    where: { OR: [{ status: "DRAFT" as const }, { kind: "INBOUND_REPLY" as const }] },
    orderBy: { createdAt: "desc" as const },
  },
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
  const draft = row.messages.find((m) => m.status === "DRAFT");
  const lastReply = row.messages.find((m) => m.kind === "INBOUND_REPLY");
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
    lastReplyAt: lastReply ? (lastReply.sentAt ?? lastReply.createdAt) : null,
    readyToSend: readyToSend(row.state, draft?.kind ?? null),
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
    draft: draft
      ? {
          id: draft.id,
          kind: draft.kind,
          body: draft.body,
          source: (draft.factsUsed as { source?: string } | null)?.source ?? "template",
        }
      : null,
  };
}

/** Companies with active jobs, plus how many messages are waiting to be sent in each. */
export async function sidebar(userId: string) {
  const companies = await prisma.company.findMany({
    where: { userId, jobs: { some: { status: { in: ["ACTIVE", "APPLIED"] } } } },
    include: {
      jobs: {
        where: { status: { in: ["ACTIVE", "APPLIED"] } },
        select: {
          id: true,
          title: true,
          mergedIntoId: true,
          outreach: {
            where: { state: { in: [...ACTIVE_STATES] } },
            select: {
              state: true,
              contactId: true,
              isReserve: true,
              stateChangedAt: true,
              messages: { where: { status: "DRAFT" }, select: { kind: true }, orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return companies.map((c) => {
    // A person in two combined roles counts once (they get one message).
    const rows = c.jobs.flatMap((j) => j.outreach.map((o) => ({ ...o, lead: j.mergedIntoId ?? j.id, isLead: !j.mergedIntoId })));
    const people = dedupeCombinedPeople(rows, (r) => r.lead, (r) => r.isLead);
    return {
      id: c.id,
      name: c.name,
      isSample: c.isSample,
      jobs: c.jobs.map((j) => ({ id: j.id, title: j.title })),
      // The badge means one thing: messages written and waiting to be sent.
      attentionCount: people.filter((o) => readyToSend(o.state, o.messages[0]?.kind ?? null)).length,
    };
  });
}

export async function companyDetail(userId: string, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId },
    include: { jobs: { orderBy: { createdAt: "desc" } } },
  });
  if (!company) throw notFound("Company");
  return company;
}

/**
 * One job's page. Combined roles show as one: asked for any of them, this returns the
 * lead job, every role in the group, and one people list across them.
 */
export async function jobDetail(userId: string, jobId: string) {
  const now = new Date();
  const asked = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId }, select: { id: true, mergedIntoId: true } });
  if (!asked) throw notFound("Job");
  const leadId = asked.mergedIntoId ?? asked.id;
  const group = await prisma.jobOpportunity.findMany({
    where: { userId, OR: [{ id: leadId }, { mergedIntoId: leadId }] },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  const job = group.find((j) => j.id === leadId)!;
  const roles = [job, ...group.filter((j) => j.id !== leadId)].map(({ company: _, ...r }) => r);
  const rows = await loadOutreach({ jobId: { in: roles.map((r) => r.id) }, userId });
  const people = dedupeCombinedPeople(rows, () => leadId, (r) => r.jobId === leadId).map((r) => serialize(r, now));
  const counts = { to_connect: 0, pending: 0, message_ready: 0, awaiting_reply: 0, done: 0 };
  for (const p of people) if (!p.isReserve || p.tab !== "to_connect") counts[p.tab]++;
  return { job, roles, people, counts };
}

/** One person with their job, for the chat sheet (which outlives whichever list opened it). */
export async function personDetail(userId: string, outreachId: string) {
  const row = await prisma.outreach.findFirst({
    where: { id: outreachId, userId },
    include: { ...outreachInclude, job: { include: { company: true } } },
  });
  if (!row) throw notFound("Outreach");
  return {
    ...serialize(row, new Date()),
    job: { id: row.job.id, title: row.job.title, companyId: row.job.companyId, companyName: row.job.company.name },
  };
}

/** Everything that needs the user today, across all jobs. */
export async function today(userId: string) {
  const now = new Date();
  const rows = await prisma.outreach.findMany({
    where: { userId, state: { in: [...ACTIVE_STATES] }, job: { status: { in: ["ACTIVE", "APPLIED"] } } },
    include: { ...outreachInclude, job: { include: { company: true } } },
  });
  // A person in two combined roles shows once.
  const items = dedupeCombinedPeople(rows, (r) => r.job.mergedIntoId ?? r.jobId, (r) => !r.job.mergedIntoId)
    .map((r) => ({ ...serialize(r, now), job: { id: r.job.id, title: r.job.title, companyId: r.job.companyId, companyName: r.job.company.name } }))
    .filter((i) => i.attention !== null || i.readyToSend);

  const group = (kinds: string[]) => items.filter((i) => i.attention && kinds.includes(i.attention.kind));
  return {
    // Same rule as the company badge: referral requests and drafted answers.
    messageReady: items.filter((i) => i.readyToSend),
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
