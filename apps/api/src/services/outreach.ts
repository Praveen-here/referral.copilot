import {
  firstName,
  renderTemplate,
  stripDashes,
  transition,
  type OutreachEvent,
  type OutreachSnapshot,
  type TemplateKind,
} from "@rc/core";
import { prisma, type MessageKind, type Prisma } from "@rc/db";
import { HttpError, notFound } from "../http/errors";

const UNDO_WINDOW_MS = 2 * 60 * 1000;

/** Outcomes that come with a ready-to-send reply. */
const DRAFT_AFTER_EVENT: Partial<Record<OutreachEvent, TemplateKind>> = {
  RESUME_REQUESTED: "RESUME_SHARE",
  REFERRED: "THANK_YOU",
  DECLINED: "THANKS_ANYWAY",
};

type Tx = Prisma.TransactionClient;

const snapshotOf = (o: { state: string; nextCheckAt: Date | null; followupCount: number; lastSentAt: Date | null }) =>
  ({
    state: o.state,
    nextCheckAt: o.nextCheckAt,
    followupCount: o.followupCount,
    lastSentAt: o.lastSentAt,
  }) as OutreachSnapshot;

/** Applies one user action to an outreach, logging it and preparing any drafts it unlocks. */
export async function applyEvent(userId: string, outreachId: string, event: OutreachEvent, expectedVersion?: number) {
  return prisma.$transaction(async (tx) => {
    const outreach = await tx.outreach.findFirst({ where: { id: outreachId, userId } });
    if (!outreach) throw notFound("Outreach");
    if (expectedVersion !== undefined && expectedVersion !== outreach.version) {
      throw new HttpError(409, "STALE_VERSION", "This person was updated elsewhere. Refresh and try again.");
    }

    const before = snapshotOf(outreach);
    const result = transition(before, event);
    if (!result.ok) throw new HttpError(409, result.error, result.message);

    await persistTransition(tx, outreach.id, outreach.version, before, result.next, event);

    if (event === "MESSAGE_SENT" || event === "FOLLOWUP_SENT") {
      await tx.message.updateMany({
        where: { outreachId, status: "DRAFT", kind: event === "FOLLOWUP_SENT" ? "FOLLOW_UP" : { not: "FOLLOW_UP" } },
        data: { status: "SENT", sentAt: new Date() },
      });
    }

    // Removing someone from the top list brings the best reserve up, so there are always 15.
    if ((event === "WRONG_PERSON" || event === "SKIP") && before.state === "DISCOVERED" && !outreach.isReserve) {
      const reserve = await tx.outreach.findFirst({
        where: { jobId: outreach.jobId, isReserve: true, state: "DISCOVERED" },
        orderBy: [{ matchScore: "desc" }, { rank: "asc" }],
      });
      if (reserve) await tx.outreach.update({ where: { id: reserve.id }, data: { isReserve: false } });
    }

    const followUpDraft = DRAFT_AFTER_EVENT[event];
    if (followUpDraft) await ensureDraft(tx, userId, outreach.id, followUpDraft);

    if (result.connectedNow) {
      await tx.contact.update({ where: { id: outreach.contactId }, data: { isConnected: true } });
      await ensureDraft(tx, userId, outreach.id, "REFERRAL_REQUEST");
      // One LinkedIn connection covers every job: advance this person's other pending invites too.
      const others = await tx.outreach.findMany({
        where: { userId, contactId: outreach.contactId, state: "CONNECTION_SENT", id: { not: outreach.id } },
      });
      for (const other of others) {
        const r = transition(snapshotOf(other), "ACCEPTED");
        if (!r.ok) continue;
        await persistTransition(tx, other.id, other.version, snapshotOf(other), r.next, "ACCEPTED", { via: outreach.id });
        await ensureDraft(tx, userId, other.id, "REFERRAL_REQUEST");
      }
    }

    return tx.outreach.findUniqueOrThrow({ where: { id: outreach.id } });
  });
}

async function persistTransition(
  tx: Tx,
  id: string,
  version: number,
  before: OutreachSnapshot,
  next: OutreachSnapshot,
  event: OutreachEvent,
  extra: Record<string, unknown> = {},
) {
  const updated = await tx.outreach.updateMany({
    where: { id, version },
    data: {
      state: next.state,
      nextCheckAt: next.nextCheckAt,
      followupCount: next.followupCount,
      lastSentAt: next.lastSentAt,
      ...(next.state !== before.state ? { stateChangedAt: new Date() } : {}),
      version: { increment: 1 },
    },
  });
  if (updated.count === 0) throw new HttpError(409, "STALE_VERSION", "This person was updated elsewhere. Refresh and try again.");
  await tx.outreachEvent.create({
    data: {
      outreachId: id,
      type: event,
      fromState: before.state,
      toState: next.state,
      // `prev` lets the user undo a misclick.
      payload: { prev: { ...before, nextCheckAt: before.nextCheckAt?.toISOString() ?? null, lastSentAt: before.lastSentAt?.toISOString() ?? null }, ...extra },
    },
  });
}

/** Reverts the most recent event if it happened within the undo window. */
export async function undoLastEvent(userId: string, outreachId: string) {
  return prisma.$transaction(async (tx) => {
    const outreach = await tx.outreach.findFirst({ where: { id: outreachId, userId } });
    if (!outreach) throw notFound("Outreach");
    const last = await tx.outreachEvent.findFirst({
      where: { outreachId, type: { not: "UNDO" } },
      orderBy: { createdAt: "desc" },
    });
    const prev = (last?.payload as { prev?: Record<string, unknown> } | null)?.prev;
    if (!last || !prev || Date.now() - last.createdAt.getTime() > UNDO_WINDOW_MS) {
      throw new HttpError(409, "UNDO_EXPIRED", "Nothing to undo");
    }
    await tx.outreach.update({
      where: { id: outreachId },
      data: {
        state: prev.state as OutreachSnapshot["state"],
        nextCheckAt: prev.nextCheckAt ? new Date(prev.nextCheckAt as string) : null,
        lastSentAt: prev.lastSentAt ? new Date(prev.lastSentAt as string) : null,
        followupCount: prev.followupCount as number,
        stateChangedAt: new Date(),
        version: { increment: 1 },
      },
    });
    // Drafts created by the undone event are discarded; drafts it marked sent go back to drafts.
    await tx.message.updateMany({
      where: { outreachId, status: "DRAFT", createdAt: { gte: last.createdAt } },
      data: { status: "DISCARDED" },
    });
    if (last.type === "MESSAGE_SENT" || last.type === "FOLLOWUP_SENT") {
      await tx.message.updateMany({
        where: { outreachId, status: "SENT", sentAt: { gte: last.createdAt } },
        data: { status: "DRAFT", sentAt: null },
      });
    }
    await tx.outreachEvent.delete({ where: { id: last.id } });
    await tx.outreachEvent.create({ data: { outreachId, type: "UNDO", payload: { undid: last.type } } });
    return tx.outreach.findUniqueOrThrow({ where: { id: outreachId } });
  });
}

const KIND_FOR_TEMPLATE: Record<TemplateKind, MessageKind> = {
  REFERRAL_REQUEST: "REFERRAL_REQUEST",
  FOLLOW_UP_1: "FOLLOW_UP",
  FOLLOW_UP_2: "FOLLOW_UP",
  RESUME_SHARE: "RESUME_SHARE",
  THANK_YOU: "THANK_YOU",
  THANKS_ANYWAY: "THANKS_ANYWAY",
};

/** Returns the open draft of this kind, creating one from verified facts if needed. */
export async function ensureDraft(tx: Tx, userId: string, outreachId: string, template: TemplateKind) {
  const kind = KIND_FOR_TEMPLATE[template];
  const existing = await tx.message.findFirst({ where: { outreachId, kind, status: "DRAFT" } });
  if (existing) return existing;

  const o = await tx.outreach.findFirstOrThrow({
    where: { id: outreachId, userId },
    include: { job: { include: { company: true } }, contact: { include: { tags: true } }, user: { include: { profile: true, educations: true } } },
  });
  const profile = o.user.profile;
  const projects = (profile?.projects ?? []) as { oneLiner?: string }[];
  const alumni = o.contact.tags.some((t) => t.tag === "COLLEGE_ALUMNI");
  const settings = (profile?.settings ?? {}) as { signOffName?: string };

  const body = stripDashes(
    renderTemplate(
      template,
      {
        contactFirstName: firstName(o.contact.fullName),
        companyName: o.job.company.name,
        jobTitle: o.job.title,
        jobId: o.job.externalJobId,
        jobUrl: o.job.url,
        sharedInstitution: alumni ? (o.user.educations[0]?.institutionRaw ?? null) : null,
        userDegree: profile?.degree ?? null,
        userSemester: profile?.currentSemester ?? null,
        fitReason: projects[0]?.oneLiner ?? null,
        resumeUrl: profile?.resumeUrl ?? null,
        signOffName: settings.signOffName || firstName(o.user.name),
      },
      o.followupCount + o.contact.fullName.length,
    ),
  );

  return tx.message.create({ data: { outreachId, kind, body, factsUsed: { source: "template", template } } });
}

export async function getOrCreateDraft(userId: string, outreachId: string, template: TemplateKind) {
  return prisma.$transaction((tx) => ensureDraft(tx, userId, outreachId, template));
}
