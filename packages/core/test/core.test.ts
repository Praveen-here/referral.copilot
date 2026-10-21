import { describe, expect, it } from "vitest";
import {
  ACTIVE_STATES,
  OUTREACH_EVENTS,
  OUTREACH_STATES,
  attentionFor,
  renderTemplate,
  stripDashes,
  transition,
  validateMessage,
  type OutreachSnapshot,
  type OutreachState,
} from "../src";

const NOW = new Date("2026-10-20T10:00:00Z");
const DAY = 86_400_000;
const snap = (state: OutreachState, extra: Partial<OutreachSnapshot> = {}): OutreachSnapshot => ({
  state,
  nextCheckAt: null,
  followupCount: 0,
  lastSentAt: null,
  ...extra,
});

describe("state machine", () => {
  it("walks the happy path", () => {
    let s = snap("DISCOVERED");
    for (const [event, expected] of [
      ["REQUEST_SENT", "CONNECTION_SENT"],
      ["ACCEPTED", "ACCEPTED_MESSAGE_READY"],
      ["MESSAGE_SENT", "AWAITING_REPLY"],
      ["RESUME_REQUESTED", "IN_CONVERSATION"],
      ["MESSAGE_SENT", "AWAITING_REPLY"],
      ["REFERRED", "REFERRAL_RECEIVED"],
    ] as const) {
      const r = transition(s, event, NOW);
      expect(r.ok, `${s.state} + ${event}`).toBe(true);
      if (r.ok) s = r.next;
      expect(s.state).toBe(expected);
    }
  });

  it("skips the connection stage when already connected", () => {
    const r = transition(snap("DISCOVERED"), "ALREADY_CONNECTED", NOW);
    expect(r.ok && r.next.state).toBe("ACCEPTED_MESSAGE_READY");
    expect(r.ok && r.connectedNow).toBe(true);
  });

  it("schedules acceptance and reply checks", () => {
    const sent = transition(snap("DISCOVERED"), "REQUEST_SENT", NOW);
    expect(sent.ok && sent.next.nextCheckAt?.getTime()).toBe(NOW.getTime() + 3 * DAY);
    const msg = transition(snap("ACCEPTED_MESSAGE_READY"), "MESSAGE_SENT", NOW);
    expect(msg.ok && msg.next.lastSentAt).toEqual(NOW);
    expect(msg.ok && msg.next.nextCheckAt?.getTime()).toBe(NOW.getTime() + 2 * DAY);
  });

  it("counts follow-ups", () => {
    const r = transition(snap("AWAITING_REPLY", { lastSentAt: new Date(NOW.getTime() - 6 * DAY) }), "FOLLOWUP_SENT", NOW);
    expect(r.ok && r.next.followupCount).toBe(1);
    expect(r.ok && r.next.lastSentAt).toEqual(NOW);
  });

  it("never lets terminal states move except by REOPEN", () => {
    const terminal = OUTREACH_STATES.filter((s) => !ACTIVE_STATES.includes(s));
    for (const state of terminal) {
      for (const event of OUTREACH_EVENTS) {
        const r = transition(snap(state), event, NOW);
        if (event === "REOPEN" && state !== "REFERRAL_RECEIVED" && state !== "DECLINED" && state !== "JOB_CLOSED") continue;
        expect(r.ok, `${state} + ${event}`).toBe(false);
      }
    }
  });

  it("rejects out-of-order events", () => {
    expect(transition(snap("DISCOVERED"), "MESSAGE_SENT", NOW).ok).toBe(false);
    expect(transition(snap("CONNECTION_SENT"), "REFERRED", NOW).ok).toBe(false);
  });
});

describe("attention", () => {
  const base = { stateChangedAt: NOW };
  it("asks for a follow-up after 5 quiet days", () => {
    const a = attentionFor({ ...snap("AWAITING_REPLY", { lastSentAt: new Date(NOW.getTime() - 5 * DAY) }), ...base }, NOW);
    expect(a).toEqual({ kind: "FOLLOWUP_DUE", followupNumber: 1, daysSinceSent: 5 });
  });
  it("suggests no-response after the second follow-up", () => {
    const a = attentionFor(
      { ...snap("AWAITING_REPLY", { followupCount: 2, lastSentAt: new Date(NOW.getTime() - 8 * DAY) }), ...base },
      NOW,
    );
    expect(a?.kind).toBe("NO_RESPONSE_SUGGESTED");
  });
  it("suggests withdrawing stale invites", () => {
    const a = attentionFor({ ...snap("CONNECTION_SENT"), stateChangedAt: new Date(NOW.getTime() - 22 * DAY) }, NOW);
    expect(a?.kind).toBe("WITHDRAW_SUGGESTED");
  });
});

describe("messages", () => {
  const facts = {
    contactFirstName: "Rahul",
    companyName: "HPE",
    jobTitle: "Software Engineer Intern",
    jobId: "123456",
    sharedInstitution: "PES University",
    userDegree: "MCA",
    userSemester: 3,
    fitReason: "my backend work in Java and Spring Boot",
    signOffName: "Praveen",
  };

  it("renders clean referral requests for every variant", () => {
    for (let seed = 0; seed < 6; seed++) {
      for (const shared of ["PES University", null]) {
        const body = renderTemplate("REFERRAL_REQUEST", { ...facts, sharedInstitution: shared }, seed);
        expect(validateMessage(body, { contactFirstName: "Rahul", maxWords: 110 })).toEqual([]);
        expect(body.includes("PES University")).toBe(shared !== null);
      }
    }
  });

  it("strips dashes and flags stock phrases", () => {
    expect(stripDashes("I saw the role — it fits")).toBe("I saw the role, it fits");
    expect(stripDashes("full-stack work")).toBe("full-stack work");
    const issues = validateMessage("Hi Rahul, I hope this message finds you well — let's delve in.", { contactFirstName: "Rahul" });
    expect(issues.map((i) => i.code)).toEqual(["DASH", "BANNED_PHRASE", "BANNED_PHRASE"]);
  });

  it("flags a wrong name and an unverified school", () => {
    const issues = validateMessage("Hi Karthik, fellow PES University student here.", {
      contactFirstName: "Rahul",
      knownInstitutions: ["PES University"],
      allowedInstitution: null,
    });
    expect(issues.map((i) => i.code)).toEqual(["WRONG_NAME", "UNVERIFIED_SCHOOL"]);
  });
});

import { isSameInstitution } from "../src";

describe("alumni matching", () => {
  it("treats PES aliases as one school", () => {
    expect(isSameInstitution("PESIT", "PES University")).toBe(true);
    expect(isSameInstitution("PES University, EC Campus", "pesu")).toBe(true);
    expect(isSameInstitution("RV College of Engineering", "PES University")).toBe(false);
    expect(isSameInstitution(null, "PES University")).toBe(false);
  });
});

import { claimsSharedCollege } from "../src";

describe("shared-college claims", () => {
  const pes = ["PES University", "PESIT", "PESU"];
  it("catches implied shared college for non-alumni", () => {
    expect(claimsSharedCollege("Hi Ishita,\n\nI saw you studied at PES University too, I'm a current MCA student there.", pes)).toBe(true);
    expect(claimsSharedCollege("Hi Ishita, fellow PES student here.", pes)).toBe(true);
  });
  it("allows the sender to say where they study", () => {
    expect(claimsSharedCollege("Hi Ishita,\n\nI'm an MCA student at PES University. Would you be open to referring me?", pes)).toBe(false);
  });
});
