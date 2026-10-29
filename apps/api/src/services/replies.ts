// "Paste their reply": the AI reads what the person wrote back, the app suggests the
// matching status, and a reply is drafted. The user confirms before anything changes.

import { readReplyTask, type ReplyReading } from "@rc/ai";
import { stripDashes, transition, type OutreachEvent, type OutreachSnapshot } from "@rc/core";
import { prisma } from "@rc/db";
import { notFound } from "../http/errors";
import { runAi } from "./ai";
import { generateDraft, type DraftKind } from "./messages";
import { applyEvent } from "./outreach";

const EVENT_FOR: Record<ReplyReading["outcome"], OutreachEvent> = {
  REFERRED: "REFERRED",
  WILL_REFER: "REPLIED",
  RESUME_REQUESTED: "RESUME_REQUESTED",
  QUESTION: "REPLIED",
  DECLINED: "DECLINED",
  NOT_NOW: "REPLIED",
  OTHER: "REPLIED",
};

const DRAFT_FOR: Record<ReplyReading["outcome"], DraftKind> = {
  REFERRED: "THANK_YOU",
  WILL_REFER: "RESUME_SHARE",
  RESUME_REQUESTED: "RESUME_SHARE",
  QUESTION: "REPLY_RESPONSE",
  DECLINED: "THANKS_ANYWAY",
  NOT_NOW: "REPLY_RESPONSE",
  OTHER: "REPLY_RESPONSE",
};

export async function readReply(userId: string, outreachId: string, text: string) {
  const o = await prisma.outreach.findFirst({
    where: { id: outreachId, userId },
    include: { job: { include: { company: true } }, messages: { where: { status: "SENT" }, orderBy: { sentAt: "desc" }, take: 1 } },
  });
  if (!o) throw notFound("Outreach");

  const whatWeAsked = o.messages[0]?.body ?? `A referral for ${o.job.title} at ${o.job.company.name}`;
  let reading: ReplyReading;
  try {
    reading = (await runAi(userId, readReplyTask({ reply: text, whatWeAsked }))).data;
  } catch {
    reading = { outcome: "OTHER", summary: "Couldn't read this automatically. Pick what happened below." };
  }

  await prisma.message.create({ data: { outreachId, kind: "INBOUND_REPLY", status: "SENT", body: text, sentAt: new Date() } });

  // Suggest only an event the state machine allows from where this person is now.
  const event = EVENT_FOR[reading.outcome];
  const allowed = transition(o as unknown as OutreachSnapshot, event).ok;

  // The answer depends on what they said: thanks for a referral, grace for a no, details if asked.
  const draft = await generateDraft(userId, outreachId, DRAFT_FOR[reading.outcome], { theirReply: text }).catch(() => null);
  return {
    outcome: reading.outcome,
    summary: stripDashes(reading.summary),
    suggestedEvent: allowed ? event : null,
    draftId: draft?.id ?? null,
    draftKind: draft?.kind ?? null,
  };
}

/** The whole thread with one person, oldest first: what we sent, what they said, and any open draft. */
export async function getConversation(userId: string, outreachId: string) {
  const o = await prisma.outreach.findFirst({
    where: { id: outreachId, userId },
    select: { messages: { where: { status: { in: ["SENT", "DRAFT"] } }, orderBy: { createdAt: "asc" } } },
  });
  if (!o) throw notFound("Outreach");
  return o.messages
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      status: m.status,
      body: m.body,
      at: m.sentAt ?? m.createdAt,
      fromThem: m.kind === "INBOUND_REPLY",
      source: (m.factsUsed as { source?: string } | null)?.source ?? "template",
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * "I sent something else": the user wrote their own message on LinkedIn instead of the draft.
 * Logged so the thread (and the AI's next answer) stays accurate; the unsent draft is set aside.
 */
export async function logOwnMessage(userId: string, outreachId: string, text: string) {
  const o = await prisma.outreach.findFirst({ where: { id: outreachId, userId } });
  if (!o) throw notFound("Outreach");
  await prisma.$transaction([
    prisma.message.updateMany({ where: { outreachId, status: "DRAFT", kind: { not: "FOLLOW_UP" } }, data: { status: "DISCARDED" } }),
    prisma.message.create({
      data: { outreachId, kind: "REPLY_RESPONSE", status: "SENT", body: stripDashes(text), sentAt: new Date(), factsUsed: { source: "user" }, editedByUser: true },
    }),
  ]);
  // Our turn is over: an open conversation goes back to waiting for them.
  if (transition(o as unknown as OutreachSnapshot, "MESSAGE_SENT").ok) await applyEvent(userId, outreachId, "MESSAGE_SENT");
}
