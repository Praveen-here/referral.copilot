// Deterministic message templates (plan §10). Used before the AI writer exists,
// and later as the fallback when the AI fails validation. Only facts passed in
// here may appear in a message; nothing is invented.

export interface FactSheet {
  contactFirstName: string;
  companyName: string;
  jobTitle: string;
  jobId?: string | null;
  jobUrl?: string | null;
  /** Set only when the alumni tag has evidence. */
  sharedInstitution?: string | null;
  userDegree?: string | null;
  userSemester?: number | null;
  /** One concrete reason the user fits, taken from their own profile. */
  fitReason?: string | null;
  resumeUrl?: string | null;
  signOffName: string;
}

export type TemplateKind =
  | "REFERRAL_REQUEST"
  | "FOLLOW_UP_1"
  | "FOLLOW_UP_2"
  | "RESUME_SHARE"
  | "THANK_YOU"
  | "THANKS_ANYWAY";

const pick = <T,>(options: readonly T[], seed: number): T => options[Math.abs(seed) % options.length]!;

const ordinal = (n: number) => {
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix}`;
};

function roleRef(f: FactSheet): string {
  const id = f.jobId ? ` (Job ID ${f.jobId})` : "";
  return `the ${f.jobTitle} role at ${f.companyName}${id}`;
}

function aboutMe(f: FactSheet): string | null {
  if (!f.userDegree) return null;
  return f.userSemester ? `${f.userDegree}, ${ordinal(f.userSemester)} sem` : f.userDegree;
}

function referralRequest(f: FactSheet, seed: number): string {
  const me = aboutMe(f);
  const opener = f.sharedInstitution
    ? pick(
        [
          `Hi ${f.contactFirstName}, fellow ${f.sharedInstitution} student here${me ? ` (${me})` : ""}.`,
          `Hi ${f.contactFirstName}, I saw you studied at ${f.sharedInstitution}. I'm there now${
            f.userDegree ? `, ${f.userSemester ? `in my ${ordinal(f.userSemester)} sem of ` : "doing my "}${f.userDegree}` : ""
          }.`,
        ],
        seed,
      )
    : pick(
        [
          `Hi ${f.contactFirstName}, thanks for connecting.`,
          `Hi ${f.contactFirstName}, thanks for accepting my request.`,
        ],
        seed,
      );

  const role = f.fitReason
    ? `I'm applying for ${roleRef(f)} and it lines up well with ${f.fitReason}.`
    : `I'm applying for ${roleRef(f)} and I think it's a good fit for me.`;

  const ask = pick(
    [
      "Would you be open to referring me? Happy to send my resume, and totally fine if it's not something you do.",
      "Would you be comfortable referring me for it? I can share my resume, and no worries at all if not.",
    ],
    seed + 1,
  );

  const link = f.jobUrl ? `\n\nHere's the job link: ${f.jobUrl}` : "";
  return `${opener} ${role}\n\n${ask}${link}\n\nThanks,\n${f.signOffName}`;
}

export function renderTemplate(kind: TemplateKind, f: FactSheet, seed = 0): string {
  switch (kind) {
    case "REFERRAL_REQUEST":
      return referralRequest(f, seed);
    case "FOLLOW_UP_1":
      return pick(
        [
          `Hi ${f.contactFirstName}, just bumping this in case it got buried. Totally understand if you're busy.\n\nThanks,\n${f.signOffName}`,
          `Hi ${f.contactFirstName}, following up on my note about ${roleRef(f)}. No pressure at all if it's not a good time.\n\nThanks,\n${f.signOffName}`,
        ],
        seed,
      );
    case "FOLLOW_UP_2":
      return `Hi ${f.contactFirstName}, one last nudge on ${roleRef(f)}. If it's not possible, no worries, and thanks for reading.\n\n${f.signOffName}`;
    case "RESUME_SHARE":
      return `Thanks so much, ${f.contactFirstName}! Here's my resume${f.resumeUrl ? `: ${f.resumeUrl}` : " (attached)"}.${f.jobId ? ` The Job ID is ${f.jobId}.` : ""} Let me know if you need anything else from me.\n\n${f.signOffName}`;
    case "THANK_YOU":
      return `Thank you so much for the referral, ${f.contactFirstName}. Really appreciate you taking the time. I'll keep you posted on how it goes.\n\n${f.signOffName}`;
    case "THANKS_ANYWAY":
      return `Totally understand, ${f.contactFirstName}. Thanks for getting back to me, appreciate it.\n\n${f.signOffName}`;
  }
}
