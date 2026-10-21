// "Paste their reply": the AI reads what the person wrote back, the app suggests the
// matching status, and a reply is drafted. The user confirms before anything changes.

import { readReplyTask, type ReplyReading } from "@rc/ai";
import { stripDashes, transition, type OutreachEvent, type OutreachSnapshot } from "@rc/core";
import { prisma } from "@rc/db";
import { notFound } from "../http/errors";
import { runAi } from "./ai";
import { generateDraft, type DraftKind } from "./messages";

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
