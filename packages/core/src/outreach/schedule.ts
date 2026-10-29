// What needs attention, computed from timestamps when a page loads (plan §8.2).
// No background jobs: nothing here has to "wake up".

import type { OutreachSnapshot, OutreachState } from "./machine";

const DAY = 24 * 60 * 60 * 1000;

export const PIPELINE_TABS = ["to_connect", "pending", "message_ready", "awaiting_reply", "done"] as const;
export type PipelineTab = (typeof PIPELINE_TABS)[number];

export function tabForState(state: OutreachState): PipelineTab {
  switch (state) {
    case "DISCOVERED":
      return "to_connect";
    case "CONNECTION_SENT":
      return "pending";
    case "ACCEPTED_MESSAGE_READY":
      return "message_ready";
    case "AWAITING_REPLY":
    case "IN_CONVERSATION":
      return "awaiting_reply";
    default:
      return "done";
  }
}

export const STALE_INVITE_DAYS = 21;
export const MAX_FOLLOWUPS = 2;

export type Attention =
  | { kind: "MESSAGE_READY" }
  | { kind: "CHECK_ACCEPTED"; daysWaiting: number }
  | { kind: "WITHDRAW_SUGGESTED"; daysWaiting: number }
  | { kind: "CHECK_REPLY"; daysSinceSent: number }
  | { kind: "FOLLOWUP_DUE"; followupNumber: 1 | 2; daysSinceSent: number }
  | { kind: "NO_RESPONSE_SUGGESTED"; daysSinceSent: number };

/** Returns what the user should do about this outreach right now, if anything. */
export function attentionFor(
  o: OutreachSnapshot & { stateChangedAt: Date },
  now = new Date(),
): Attention | null {
  const daysSince = (d: Date | null) => (d ? Math.floor((now.getTime() - d.getTime()) / DAY) : 0);
  const due = o.nextCheckAt !== null && o.nextCheckAt <= now;

  switch (o.state) {
    case "ACCEPTED_MESSAGE_READY":
      return { kind: "MESSAGE_READY" };
    case "CONNECTION_SENT": {
      const waiting = daysSince(o.stateChangedAt);
      if (waiting >= STALE_INVITE_DAYS) return { kind: "WITHDRAW_SUGGESTED", daysWaiting: waiting };
      return due ? { kind: "CHECK_ACCEPTED", daysWaiting: waiting } : null;
    }
    case "AWAITING_REPLY": {
      const sinceSent = daysSince(o.lastSentAt);
      if (o.followupCount === 0 && sinceSent >= 5) return { kind: "FOLLOWUP_DUE", followupNumber: 1, daysSinceSent: sinceSent };
      if (o.followupCount === 1 && sinceSent >= 7) return { kind: "FOLLOWUP_DUE", followupNumber: 2, daysSinceSent: sinceSent };
      if (o.followupCount >= MAX_FOLLOWUPS && sinceSent >= 7) return { kind: "NO_RESPONSE_SUGGESTED", daysSinceSent: sinceSent };
      return due ? { kind: "CHECK_REPLY", daysSinceSent: sinceSent } : null;
    }
    case "IN_CONVERSATION":
      return due ? { kind: "CHECK_REPLY", daysSinceSent: daysSince(o.lastSentAt) } : null;
    default:
      return null;
  }
}

/** Drafted answers to something they said (resume, reply, thanks). These wait for the user to send. */
export const ANSWER_DRAFT_KINDS = ["RESUME_SHARE", "REPLY_RESPONSE", "THANK_YOU", "THANKS_ANYWAY"] as const;

/**
 * True when a written message is just waiting to be sent: the referral request after
 * they accepted, or a drafted answer to their reply. This is what the company badge counts.
 */
export function readyToSend(state: OutreachState, openDraftKind: string | null): boolean {
  if (state === "ACCEPTED_MESSAGE_READY") return true;
  return openDraftKind !== null && (ANSWER_DRAFT_KINDS as readonly string[]).includes(openDraftKind);
}

/** After this long with no word from either side, a thread drops into "Gone quiet". */
export const QUIET_DAYS = 14;

export type ConversationGroup = "talking" | "waiting" | "quiet";

/**
 * Groups the Awaiting reply tab without asking anyone to check anything:
 * "talking" = they've replied at least once, "waiting" = no reply yet,
 * "quiet" = we're waiting and nothing happened for QUIET_DAYS (display only; state is untouched).
 */
export function conversationGroup(
  o: { state: OutreachState; lastSentAt: Date | null; lastReplyAt: Date | null },
  now = new Date(),
): ConversationGroup {
  const last = Math.max(o.lastSentAt?.getTime() ?? 0, o.lastReplyAt?.getTime() ?? 0);
  // IN_CONVERSATION means the next move is ours, so it never goes quiet on its own.
  if (o.state === "AWAITING_REPLY" && last > 0 && now.getTime() - last >= QUIET_DAYS * DAY) return "quiet";
  return o.lastReplyAt || o.state === "IN_CONVERSATION" ? "talking" : "waiting";
}
