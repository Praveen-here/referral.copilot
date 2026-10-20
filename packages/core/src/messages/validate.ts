// Style and fact checks for every outgoing draft (plan §10.4). Prompts alone
// don't stop models from writing em dashes or stock phrases, so code does.

export const BANNED_PHRASES = [
  "i hope this message finds you well",
  "i hope this finds you well",
  "i am reaching out",
  "i'm reaching out to",
  "delve",
  "leverage",
  "passionate",
  "esteemed",
  "synergy",
  "impressive profile",
  "dear sir",
  "dear madam",
  "as we discussed",
  "great to reconnect",
  "i came across your profile and was impressed",
] as const;

export const WORD_LIMITS = {
  REFERRAL_REQUEST: 110,
  FOLLOW_UP: 50,
  DEFAULT: 120,
} as const;

export interface ValidationIssue {
  code: "DASH" | "BANNED_PHRASE" | "TOO_LONG" | "WRONG_NAME" | "UNVERIFIED_SCHOOL";
  detail: string;
}

/** Replace em/en dashes used as punctuation with commas; keep hyphenated words intact. */
export function stripDashes(text: string): string {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/\s+--\s+/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.!?])/g, "$1");
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function validateMessage(
  body: string,
  opts: { contactFirstName: string; maxWords?: number; knownInstitutions?: string[]; allowedInstitution?: string | null },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lower = body.toLowerCase();

  if (/[—–]/.test(body)) issues.push({ code: "DASH", detail: "Contains an em or en dash" });

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) issues.push({ code: "BANNED_PHRASE", detail: phrase });
  }

  const max = opts.maxWords ?? WORD_LIMITS.DEFAULT;
  const words = countWords(body);
  if (words > max) issues.push({ code: "TOO_LONG", detail: `${words} words (max ${max})` });

  const greeting = body.match(/^\s*(?:hi|hey|hello)\s+([^\s,!.]+)/i);
  if (greeting && greeting[1]!.toLowerCase() !== opts.contactFirstName.toLowerCase()) {
    issues.push({ code: "WRONG_NAME", detail: `Greets "${greeting[1]}" instead of "${opts.contactFirstName}"` });
  }

  // A school may only be named if the alumni link has evidence.
  for (const school of opts.knownInstitutions ?? []) {
    const named = lower.includes(school.toLowerCase());
    const allowed = opts.allowedInstitution && school.toLowerCase() === opts.allowedInstitution.toLowerCase();
    if (named && !allowed) issues.push({ code: "UNVERIFIED_SCHOOL", detail: school });
  }

  return issues;
}
