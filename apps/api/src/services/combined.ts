// Combined roles: several jobs at one company asked about in one referral message.
// The lead job stays as it is; the others point at it with `mergedIntoId`, so
// separating them again is one update and nothing is moved or deleted.

import { MAX_COMBINED_ROLES, roleFact, type RoleFact } from "@rc/core";
import { prisma, type Prisma } from "@rc/db";
import { HttpError, notFound } from "../http/errors";

type Db = Prisma.TransactionClient | typeof prisma;

const OPEN = ["ACTIVE", "APPLIED"] as const;

type JobLike = { id: string; mergedIntoId: string | null; title: string; externalJobId: string | null; url: string | null; location: string | null };

/** IDs of every job in this job's group, lead first (just the job itself when it isn't combined). */
export async function groupJobIds(db: Db, userId: string, job: { id: string; mergedIntoId: string | null }) {
  const leadId = job.mergedIntoId ?? job.id;
  const others = await db.jobOpportunity.findMany({
    where: { userId, mergedIntoId: leadId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return { leadId, ids: [leadId, ...others.map((o) => o.id)] };
}

/**
 * The roles a message for this job should ask about: every open job in its group, lead
 * first. A closed or archived role drops out of new messages. One role when not combined.
 */
export async function rolesForJob(db: Db, userId: string, job: JobLike): Promise<RoleFact[]> {
  const leadId = job.mergedIntoId ?? job.id;
  const group = await db.jobOpportunity.findMany({
    where: { userId, OR: [{ id: leadId }, { mergedIntoId: leadId }], status: { in: [...OPEN] } },
    orderBy: { createdAt: "asc" },
  });
  if (group.length < 2 || !group.some((j) => j.id === job.id)) return [roleFact(job)];
  group.sort((a, b) => Number(b.id === leadId) - Number(a.id === leadId));
  return group.slice(0, MAX_COMBINED_ROLES).map(roleFact);
}

/** Combines `otherIds` into `leadId`. Returns every job ID in the resulting group. */
export async function combineJobs(userId: string, leadId: string, otherIds: string[]) {
  const ids = [...new Set(otherIds)].filter((id) => id !== leadId);
  if (!ids.length) throw new HttpError(400, "NOTHING_TO_COMBINE", "Pick at least one other role.");
  const jobs = await prisma.jobOpportunity.findMany({ where: { userId, id: { in: [leadId, ...ids] } } });
  const lead = jobs.find((j) => j.id === leadId);
  if (!lead || jobs.length !== ids.length + 1) throw notFound("Job");
  if (lead.mergedIntoId) throw new HttpError(409, "ALREADY_COMBINED", "That role is already combined into another one.");
  if (jobs.some((j) => j.companyId !== lead.companyId)) throw new HttpError(400, "DIFFERENT_COMPANY", "Only roles at the same company can be combined.");
  // A role that already leads its own group can't be nested inside another group.
  const nested = await prisma.jobOpportunity.count({ where: { userId, mergedIntoId: { in: ids } } });
  if (nested) throw new HttpError(409, "ALREADY_COMBINED", "Separate that role's group first.");

  const current = await prisma.jobOpportunity.count({ where: { userId, mergedIntoId: leadId } });
  if (1 + current + ids.length > MAX_COMBINED_ROLES) {
    throw new HttpError(400, "TOO_MANY_ROLES", `One message can ask about at most ${MAX_COMBINED_ROLES} roles.`);
  }
  await prisma.jobOpportunity.updateMany({ where: { userId, id: { in: ids } }, data: { mergedIntoId: leadId } });
  return (await groupJobIds(prisma, userId, lead)).ids;
}

/**
 * Deletes one role and the people found for it. If it led a group of combined roles, the
 * oldest remaining role takes over as lead so the others stay combined. Returns the job IDs
 * still in its group (empty when it wasn't combined).
 */
export async function deleteRole(userId: string, jobId: string) {
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId }, select: { id: true, mergedIntoId: true } });
  if (!job) throw notFound("Job");
  const { leadId, ids } = await groupJobIds(prisma, userId, job);
  const remaining = ids.filter((i) => i !== job.id);
  await prisma.$transaction(async (tx) => {
    if (job.id === leadId && remaining.length) {
      const [newLead, ...rest] = remaining;
      await tx.jobOpportunity.update({ where: { id: newLead }, data: { mergedIntoId: null } });
      if (rest.length) await tx.jobOpportunity.updateMany({ where: { userId, id: { in: rest } }, data: { mergedIntoId: newLead } });
    }
    await tx.jobOpportunity.delete({ where: { id: job.id } });
  });
  return remaining;
}

/** Splits a group back into separate jobs. Returns the job IDs that were in it. */
export async function separateJobs(userId: string, jobId: string) {
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId }, select: { id: true, mergedIntoId: true } });
  if (!job) throw notFound("Job");
  const { leadId, ids } = await groupJobIds(prisma, userId, job);
  await prisma.jobOpportunity.updateMany({ where: { userId, mergedIntoId: leadId }, data: { mergedIntoId: null } });
  return ids;
}
