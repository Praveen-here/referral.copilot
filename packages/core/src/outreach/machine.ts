// Outreach state machine (plan §8). Pure: returns the next state and the
// bookkeeping changes; the API service persists them with an event row.

export const OUTREACH_STATES = [
  "DISCOVERED",
  "CONNECTION_SENT",
  "ACCEPTED_MESSAGE_READY",
  "AWAITING_REPLY",
  "IN_CONVERSATION",
  "REFERRAL_RECEIVED",
  "DECLINED",
  "NO_RESPONSE",
  "DROPPED",
  "SKIPPED",
  "WRONG_PERSON",
  "JOB_CLOSED",
  "STOPPED",
] as const;
export type OutreachState = (typeof OUTREACH_STATES)[number];

export const OUTREACH_EVENTS = [
  "REQUEST_SENT",
  "ALREADY_CONNECTED",
  "NOT_ACCEPTED_YET",
  "ACCEPTED",
  "MESSAGE_SENT",
  "NO_REPLY_YET",
  "FOLLOWUP_SENT",
  "REPLIED",
  "RESUME_REQUESTED",
  "REFERRED",
  "DECLINED",
  "NO_RESPONSE",
  "WITHDRAW",
  "SKIP",
  "WRONG_PERSON",
  "STOP",
  "JOB_CLOSED",
  "REOPEN",
] as const;
export type OutreachEvent = (typeof OUTREACH_EVENTS)[number];

export const ACTIVE_STATES: readonly OutreachState[] = [
  "DISCOVERED",
  "CONNECTION_SENT",
  "ACCEPTED_MESSAGE_READY",
  "AWAITING_REPLY",
  "IN_CONVERSATION",
];

const REOPENABLE: readonly OutreachState[] = ["SKIPPED", "DROPPED", "NO_RESPONSE", "STOPPED", "WRONG_PERSON"];

export interface OutreachSnapshot {
  state: OutreachState;
  nextCheckAt: Date | null;
  followupCount: number;
  lastSentAt: Date | null;
}

export type TransitionResult =
  | { ok: true; next: OutreachSnapshot; connectedNow?: boolean }
  | { ok: false; error: "INVALID_TRANSITION"; message: string };

const DAY = 24 * 60 * 60 * 1000;
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY);

// Check cadence (plan §8.2).
export const CHECK_DAYS = {
  firstAcceptanceCheck: 3,
  repeatAcceptanceCheck: 4,
  firstReplyCheck: 2,
  secondReplyCheck: 5,
  afterFollowup: 3,
} as const;

type Handler = (s: OutreachSnapshot, now: Date) => TransitionResult;

const to =
  (state: OutreachState, patch: (s: OutreachSnapshot, now: Date) => Partial<OutreachSnapshot> = () => ({ nextCheckAt: null })) =>
  (s: OutreachSnapshot, now: Date): TransitionResult => ({ ok: true, next: { ...s, state, ...patch(s, now) } });

const markSent = (s: OutreachSnapshot, now: Date): Partial<OutreachSnapshot> => ({
  lastSentAt: now,
  nextCheckAt: addDays(now, CHECK_DAYS.firstReplyCheck),
});

/** After "no reply yet": check again at day 5 since the last message, else in 3 days. */
const nextReplyCheck = (s: OutreachSnapshot, now: Date): Partial<OutreachSnapshot> => {
  const sent = s.lastSentAt ?? now;
  const dayFive = addDays(sent, CHECK_DAYS.secondReplyCheck);
  return { nextCheckAt: dayFive > now ? dayFive : addDays(now, CHECK_DAYS.afterFollowup) };
};

const TABLE: Record<OutreachState, Partial<Record<OutreachEvent, Handler>>> = {
  DISCOVERED: {
    REQUEST_SENT: to("CONNECTION_SENT", (_s, now) => ({ nextCheckAt: addDays(now, CHECK_DAYS.firstAcceptanceCheck) })),
    ALREADY_CONNECTED: (s, now) => ({ ...to("ACCEPTED_MESSAGE_READY")(s, now), connectedNow: true }) as TransitionResult,
    SKIP: to("SKIPPED"),
    WRONG_PERSON: to("WRONG_PERSON"),
  },
  CONNECTION_SENT: {
    ACCEPTED: (s, now) => ({ ...to("ACCEPTED_MESSAGE_READY")(s, now), connectedNow: true }) as TransitionResult,
    NOT_ACCEPTED_YET: to("CONNECTION_SENT", (_s, now) => ({ nextCheckAt: addDays(now, CHECK_DAYS.repeatAcceptanceCheck) })),
    WITHDRAW: to("DROPPED"),
    WRONG_PERSON: to("WRONG_PERSON"),
  },
  ACCEPTED_MESSAGE_READY: {
    MESSAGE_SENT: to("AWAITING_REPLY", markSent),
    SKIP: to("SKIPPED"),
  },
  AWAITING_REPLY: {
    NO_REPLY_YET: to("AWAITING_REPLY", nextReplyCheck),
    FOLLOWUP_SENT: to("AWAITING_REPLY", (s, now) => ({
      followupCount: s.followupCount + 1,
      lastSentAt: now,
      nextCheckAt: addDays(now, CHECK_DAYS.afterFollowup),
    })),
    REPLIED: to("IN_CONVERSATION"),
    RESUME_REQUESTED: to("IN_CONVERSATION"),
    REFERRED: to("REFERRAL_RECEIVED"),
    DECLINED: to("DECLINED"),
    NO_RESPONSE: to("NO_RESPONSE"),
  },
  IN_CONVERSATION: {
    MESSAGE_SENT: to("AWAITING_REPLY", markSent),
    REPLIED: to("IN_CONVERSATION"),
    RESUME_REQUESTED: to("IN_CONVERSATION"),
    REFERRED: to("REFERRAL_RECEIVED"),
    DECLINED: to("DECLINED"),
    NO_RESPONSE: to("NO_RESPONSE"),
  },
  REFERRAL_RECEIVED: {},
  DECLINED: {},
  NO_RESPONSE: {},
  DROPPED: {},
  SKIPPED: {},
  WRONG_PERSON: {},
  JOB_CLOSED: {},
  STOPPED: {},
};

export function transition(s: OutreachSnapshot, event: OutreachEvent, now = new Date()): TransitionResult {
  if (event === "STOP" || event === "JOB_CLOSED") {
    if (!ACTIVE_STATES.includes(s.state)) return invalid(s.state, event);
    return to(event === "STOP" ? "STOPPED" : "JOB_CLOSED")(s, now);
  }
  if (event === "REOPEN") {
    if (!REOPENABLE.includes(s.state)) return invalid(s.state, event);
    return to("DISCOVERED")(s, now);
  }
  const handler = TABLE[s.state][event];
  return handler ? handler(s, now) : invalid(s.state, event);
}

export function allowedEvents(state: OutreachState): OutreachEvent[] {
  return OUTREACH_EVENTS.filter((e) => transition({ state, nextCheckAt: null, followupCount: 0, lastSentAt: null }, e).ok);
}

function invalid(state: OutreachState, event: OutreachEvent): TransitionResult {
  return { ok: false, error: "INVALID_TRANSITION", message: `Can't apply ${event} while ${state}` };
}
