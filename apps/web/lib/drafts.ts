import type { OutreachEvent } from "@rc/core";
import type { DraftKind } from "@/components/message-card";
import type { Person } from "./types";

const OPTIONAL_DRAFTS = ["THANK_YOU", "THANKS_ANYWAY", "RESUME_SHARE", "REPLY_RESPONSE"] as const;
export const CONVERSING: Person["state"][] = ["AWAITING_REPLY", "IN_CONVERSATION"];

/**
 * Which draft this person needs right now, and what "sent" means for it.
 * Answers inside a conversation live in the chat sheet (`inChat`), not on the row.
 * Follow-ups appear only after the user taps Nudge (`nudging`) or one is already drafted.
 */
export function draftFor(
  p: Person,
  { inChat = false, nudging = false }: { inChat?: boolean; nudging?: boolean } = {},
): { template: DraftKind; sentEvent: OutreachEvent | null; optional: boolean } | null {
  // A drafted answer to their reply comes first: it's the most recent thing to act on.
  const kind = p.draft?.kind as (typeof OPTIONAL_DRAFTS)[number] | undefined;
  if (kind && OPTIONAL_DRAFTS.includes(kind)) {
    const conversing = CONVERSING.includes(p.state);
    if (conversing && !inChat) return null;
    // Answers that keep the conversation going move it to "awaiting reply"; thank-yous don't change state.
    const continues = (kind === "RESUME_SHARE" || kind === "REPLY_RESPONSE") && conversing;
    return { template: kind, sentEvent: continues ? "MESSAGE_SENT" : null, optional: true };
  }
  if (p.state === "ACCEPTED_MESSAGE_READY") return { template: "REFERRAL_REQUEST", sentEvent: "MESSAGE_SENT", optional: false };
  if (p.state === "AWAITING_REPLY" && (nudging || p.draft?.kind === "FOLLOW_UP")) {
    return { template: p.followupCount === 0 ? "FOLLOW_UP_1" : "FOLLOW_UP_2", sentEvent: "FOLLOWUP_SENT", optional: true };
  }
  return null;
}
