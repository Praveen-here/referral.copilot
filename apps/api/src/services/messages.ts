// AI-written drafts (plan §10): verified facts in, Gemini writes, code checks, template
// as the fallback. Generation happens outside DB transactions (it takes seconds).

import { writeMessageTask, type MessageGoal, type MessageStyle } from "@rc/ai";
import {
  claimsSharedCollege,
  countWords,
  firstName,
  institutionAliases,
  renderTemplate,
  stripDashes,
  validateMessage,
  WORD_LIMITS,
  type TemplateKind,
} from "@rc/core";
import { prisma, type MessageKind } from "@rc/db";
import { HttpError, notFound } from "../http/errors";
import { runAi } from "./ai";

export type DraftKind = TemplateKind | "REPLY_RESPONSE";

const MESSAGE_KIND: Record<DraftKind, MessageKind> = {
  REFERRAL_REQUEST: "REFERRAL_REQUEST",
  FOLLOW_UP_1: "FOLLOW_UP",
  FOLLOW_UP_2: "FOLLOW_UP",
  RESUME_SHARE: "RESUME_SHARE",
  THANK_YOU: "THANK_YOU",
  THANKS_ANYWAY: "THANKS_ANYWAY",
  REPLY_RESPONSE: "REPLY_RESPONSE",
};

const MAX_WORDS: Record<MessageGoal, number> = {
  REFERRAL_REQUEST: WORD_LIMITS.REFERRAL_REQUEST,
  RECRUITER_INTRO: 95,
  FOLLOW_UP_1: WORD_LIMITS.FOLLOW_UP,
  FOLLOW_UP_2: WORD_LIMITS.FOLLOW_UP,
  RESUME_SHARE: 70,
  THANK_YOU: 60,
  THANKS_ANYWAY: 45,
  REPLY_RESPONSE: 90,
};

// One generation per outreach+kind at a time (the card and a background caller may race).
const inFlight = new Map<string, ReturnType<typeof writeDraft>>();

export function generateDraft(
  userId: string,
  outreachId: string,
  kind: DraftKind,
  opts: { style?: MessageStyle; theirReply?: string; replaceMessageId?: string } = {},
) {
  const key = `${outreachId}:${MESSAGE_KIND[kind]}:${opts.replaceMessageId ?? "new"}`;
  const running = inFlight.get(key);
  if (running) return running;
  const job = writeDraft(userId, outreachId, kind, opts).finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

async function writeDraft(
  userId: string,
  outreachId: string,
  kind: DraftKind,
  opts: { style?: MessageStyle; theirReply?: string; replaceMessageId?: string },
) {
  const o = await prisma.outreach.findFirst({
    where: { id: outreachId, userId },
    include: {
      job: { include: { company: true } },
      contact: { include: { tags: true } },
      user: { include: { profile: true, educations: true } },
      messages: { where: { status: "SENT" }, orderBy: { sentAt: "asc" } },
    },
  });
  if (!o) throw notFound("Outreach");

  const profile = o.user.profile;
  const settings = (profile?.settings ?? {}) as { signOffName?: string | null };
  const signOff = settings.signOffName || firstName(o.user.name);
  const college = o.user.educations[0]?.institutionRaw ?? null;
  const isAlumni = o.contact.tags.some((t) => t.tag === "COLLEGE_ALUMNI");
  const isRecruiter = o.contact.tags.some((t) => t.tag === "RECRUITER") || o.contact.function === "RECRUITING";
  const fitReason = ((profile?.projects ?? []) as { oneLiner?: string }[])[0]?.oneLiner ?? null;
  const analysis = (o.job.analysis ?? {}) as { requiredSkills?: string[]; preferredSkills?: string[] };
  const jobSkills = new Set([...(analysis.requiredSkills ?? []), ...(analysis.preferredSkills ?? [])].map((s) => s.toLowerCase()));
  const matchingSkills = (profile?.skills ?? []).filter((s) => jobSkills.has(s.toLowerCase())).slice(0, 4);
  const recipient = firstName(o.contact.fullName);

  // Only stored, verified facts reach the model.
  const facts: Record<string, string> = {
    recipientFirstName: recipient,
    ...(o.contact.currentTitle ? { recipientTitle: o.contact.currentTitle } : {}),
    company: o.job.company.name,
    role: o.job.title,
    ...(o.job.externalJobId ? { jobId: o.job.externalJobId } : {}),
    ...(o.job.url ? { jobLink: o.job.url } : {}),
    ...(isAlumni && college ? { sharedCollege: college } : {}),
    ...(college ? { yourCollege: college } : {}),
    yourStatus: ["current", profile?.degree, "student", profile?.currentSemester ? `(${ordinal(profile.currentSemester)} semester)` : null, college ? `at ${college}` : null]
      .filter(Boolean)
      .join(" "),
    ...(profile?.degree ? { yourDegree: profile.degree } : {}),
    ...(profile?.currentSemester ? { yourSemester: String(profile.currentSemester) } : {}),
    ...(fitReason ? { whyYouFit: fitReason } : {}),
    ...(matchingSkills.length ? { yourSkillsThatMatchTheJob: matchingSkills.join(", ") } : {}),
    ...(profile?.resumeUrl ? { resumeLink: profile.resumeUrl } : {}),
    signOffName: signOff,
  };

  const goal: MessageGoal = kind === "REFERRAL_REQUEST" && isRecruiter ? "RECRUITER_INTRO" : kind;

  // "Shorter" must actually be shorter: about 25% under the current draft.
  let maxWords = MAX_WORDS[goal];
  if (opts.style === "shorter" && opts.replaceMessageId) {
    const current = await prisma.message.findUnique({ where: { id: opts.replaceMessageId }, select: { body: true } });
    const currentWords = current ? countWords(current.body) : maxWords;
    maxWords = Math.min(maxWords, Math.max(25, Math.round(currentWords * 0.75)));
  }
  const recent = await prisma.message.findMany({
    where: { outreach: { userId }, status: "SENT", kind: { in: ["REFERRAL_REQUEST", "FOLLOW_UP"] } },
    orderBy: { sentAt: "desc" },
    take: 5,
    select: { body: true },
  });
  const avoidPhrases = recent.map((m) => m.body.split(/\s+/).slice(0, 8).join(" "));
  const conversation = o.messages.slice(-4).map((m) => `${m.kind === "INBOUND_REPLY" ? recipient : "You"}: ${m.body}`);

  const check = (body: string) => {
    const issues = validateMessage(body, {
      contactFirstName: recipient,
      maxWords,
      knownInstitutions: college ? institutionAliases(college) : [],
      allowedInstitution: college,
    }).map((i) => `${i.code}: ${i.detail}`);
    // The user's own college is a true fact; claiming the recipient shares it is not, unless tagged.
    if (!isAlumni && claimsSharedCollege(body, college ? institutionAliases(college) : [])) {
      issues.push("Claims or implies the recipient studied at the same college, but they did not; remove that");
    }
    if ((goal === "REFERRAL_REQUEST" || goal === "RECRUITER_INTRO") && o.job.externalJobId && !body.includes(o.job.externalJobId)) {
      issues.push(`Must include the job ID ${o.job.externalJobId}`);
    }
    if (!new RegExp(`^(hi|hello|hey)\\s+${recipient}\\b`, "i").test(body)) issues.push(`Must start with "Hi ${recipient},"`);
    // The sender is a student; only the recipient can be the alum.
    if (/\b(as|we're|we are|i'm|i am)\s+(a\s+)?(fellow\s+)?(alumn(us|a|i)|alums?|graduates?)\b/i.test(body)) {
      issues.push("The sender is a current student, not an alum or graduate");
    }
    return issues;
  };

  let body: string | null = null;
  let source: "ai" | "template" = "ai";
  let mustFix: string[] = [];
  for (let attempt = 0; attempt < 2 && !body; attempt++) {
    try {
      const { data } = await runAi(
        userId,
        writeMessageTask({ goal, facts, style: opts.style ?? "default", conversation, theirReply: opts.theirReply, avoidPhrases, mustFix, maxWords }),
      );
      const candidate = stripDashes(data.body.trim());
      const issues = check(candidate);
      if (issues.length === 0) body = candidate;
      else mustFix = issues;
    } catch (e) {
      console.warn(`AI draft unavailable (${goal}): ${(e as Error).message}`);
      break;
    }
  }

  if (!body) {
    if (kind === "REPLY_RESPONSE") throw new HttpError(503, "AI_UNAVAILABLE", "Couldn't write a reply right now. Try again in a minute.");
    // A failed rewrite keeps the user's current draft rather than swapping in a template.
    if (opts.replaceMessageId) throw new HttpError(503, "AI_UNAVAILABLE", "Couldn't rewrite it this time. Your draft is unchanged.");
    source = "template";
    body = stripDashes(
      renderTemplate(kind, {
        contactFirstName: recipient,
        companyName: o.job.company.name,
        jobTitle: o.job.title,
        jobId: o.job.externalJobId,
        jobUrl: o.job.url,
        sharedInstitution: isAlumni ? college : null,
        userDegree: profile?.degree ?? null,
        userSemester: profile?.currentSemester ?? null,
        fitReason,
        resumeUrl: profile?.resumeUrl ?? null,
        signOffName: signOff,
      }, o.followupCount + o.contact.fullName.length),
    );
  }

  const factsUsed = { source, goal, style: opts.style ?? "default" };
  if (opts.replaceMessageId) {
    return prisma.message.update({ where: { id: opts.replaceMessageId }, data: { body, factsUsed, editedByUser: false } });
  }
  const existing = await prisma.message.findFirst({ where: { outreachId, kind: MESSAGE_KIND[kind], status: "DRAFT" } });
  if (existing) return prisma.message.update({ where: { id: existing.id }, data: { body, factsUsed, editedByUser: false } });
  return prisma.message.create({ data: { outreachId, kind: MESSAGE_KIND[kind], body, factsUsed } });
}

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

/** Returns the open draft of this kind, writing one with the AI if there isn't one. */
export async function getOrWriteDraft(userId: string, outreachId: string, kind: DraftKind) {
  const outreach = await prisma.outreach.findFirst({ where: { id: outreachId, userId }, select: { id: true } });
  if (!outreach) throw notFound("Outreach");
  const existing = await prisma.message.findFirst({
    where: { outreachId, kind: MESSAGE_KIND[kind], status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  if (kind === "REPLY_RESPONSE") throw notFound("Draft");
  return generateDraft(userId, outreachId, kind);
}
