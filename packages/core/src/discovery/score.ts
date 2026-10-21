// Ranking (plan §9.3): explainable weighted features. The AI supplies some
// features (seniority, function, relevance); this formula decides the order.

import { normalizeName } from "../text";

export type Seniority = "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "STAFF_PLUS" | "MANAGER" | "DIRECTOR_PLUS" | "UNKNOWN";
export type JobFunction = "ENGINEERING" | "RECRUITING" | "PRODUCT" | "DATA" | "OTHER" | "UNKNOWN";

export interface Features {
  isAlumni: boolean;
  roleRelevance: number;
  seniority: Seniority;
  function: JobFunction;
  domainOverlap: number;
  alreadyConnected: boolean;
  sameLocation: boolean;
  openToRefer: boolean;
  companyReferralBonus: boolean;
  recentlyContactedForOtherJob: boolean;
  previouslyDeclined: boolean;
  confidence: "USER_VERIFIED" | "LINKEDIN_PASTE" | "WEB_EVIDENCE";
}

export const DEFAULT_WEIGHTS = {
  sameInstitution: 40,
  roleRelevance: 20,
  seniorityFit: 10,
  domainOverlap: 10,
  alreadyConnected: 8,
  sameLocation: 5,
  recruiterForRole: 5,
  openToRefer: 5,
  companyReferralBonus: 3,
  recentlyContactedForOtherJob: -15,
  previouslyDeclined: -25,
} as const;
export type Weights = { [K in keyof typeof DEFAULT_WEIGHTS]: number };

// Who actually refers a fresher (research 2026-10-21, docs/DECISIONS.md #14): mid-level
// ICs (~1–3 years in) refer most and still remember their own job hunt; juniors refer
// readily (often bonus-driven) once past probation; seniors and staff refer selectively
// because their name is on it; directors rarely submit referrals; interns can't.
export const SENIORITY_FIT: Record<Seniority, number> = {
  MID: 1,
  JUNIOR: 0.9,
  SENIOR: 0.8,
  MANAGER: 0.6,
  STAFF_PLUS: 0.5,
  DIRECTOR_PLUS: 0.2,
  INTERN: 0.1,
  UNKNOWN: 0.6,
};

const SENIORITY_LABEL: Partial<Record<Seniority, string>> = {
  MID: "Mid-level: most likely to refer",
  JUNIOR: "Early-career: usually happy to refer",
  SENIOR: "Senior: refers selectively",
  STAFF_PLUS: "Very senior: replies less often",
  MANAGER: "Manager: busy, but can push directly",
  DIRECTOR_PLUS: "Director level: rarely refers",
  INTERN: "Intern: can't refer",
};

export interface Score {
  score: number;
  /** Uncapped score for ordering: two people shown as 90 can still differ. */
  sortKey: number;
  bucket: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  warnings: string[];
  features: Features;
  weightsVersion: string;
}

export function scoreCandidate(f: Features, w: Weights = DEFAULT_WEIGHTS, extra: { school?: string | null } = {}): Score {
  const isRecruiter = f.function === "RECRUITING";
  const contributions: [number, number][] = [
    [w.sameInstitution, f.isAlumni ? 1 : 0],
    // Recruiters can't judge technical fit but are a valid route; score them on their own terms.
    [w.roleRelevance, isRecruiter ? 0.5 : f.roleRelevance],
    [w.seniorityFit, isRecruiter ? 0.7 : SENIORITY_FIT[f.seniority]],
    [w.domainOverlap, f.domainOverlap],
    [w.alreadyConnected, f.alreadyConnected ? 1 : 0],
    [w.sameLocation, f.sameLocation ? 1 : 0],
    [w.recruiterForRole, isRecruiter ? 1 : 0],
    [w.openToRefer, f.openToRefer ? 1 : 0],
    [w.companyReferralBonus, f.companyReferralBonus ? 1 : 0],
  ];
  let raw = contributions.reduce((sum, [weight, value]) => sum + weight * value, 0);
  if (f.recentlyContactedForOtherJob) raw += w.recentlyContactedForOtherJob;
  if (f.previouslyDeclined) raw += w.previouslyDeclined;

  let multiplier = f.confidence === "WEB_EVIDENCE" ? 0.9 : 1;
  // Interns generally can't refer, and someone in an unrelated function can't
  // vouch for fit; being an alum shouldn't lift either above a relevant engineer.
  if (f.seniority === "INTERN") multiplier *= 0.4;
  else if (!isRecruiter && f.roleRelevance === 0) multiplier *= 0.75;
  // Scaled so an alum in a relevant role at the right level reaches ~100 and a
  // strong non-alum engineer lands mid-range; extras push towards the cap.
  const scale = w.sameInstitution + w.roleRelevance + w.seniorityFit;
  const uncapped = Math.max(0, (100 * raw) / scale) * multiplier;
  const score = Math.round(Math.min(100, (100 * raw) / scale) * multiplier);

  const reasons: string[] = [];
  const warnings: string[] = [];
  if (f.isAlumni) reasons.push(extra.school ? `${extra.school} alum` : "Same college");
  if (isRecruiter) reasons.push("Recruiter: can't refer, but can route you");
  else if (f.roleRelevance >= 1) reasons.push("Works in the same area as the role");
  else if (f.roleRelevance >= 0.5) reasons.push("Works in a related area");
  const label = SENIORITY_LABEL[f.seniority];
  if (label && !isRecruiter) (SENIORITY_FIT[f.seniority] >= 0.8 ? reasons : warnings).push(label);
  if (f.alreadyConnected) reasons.push("Already connected");
  if (f.sameLocation) reasons.push("Same city");
  if (f.openToRefer) reasons.push("Says they're open to referrals");
  if (f.recentlyContactedForOtherJob) warnings.push("You contacted them recently for another job");
  if (f.previouslyDeclined) warnings.push("Declined before");

  return { score: Math.max(0, score), sortKey: uncapped, bucket: score >= 75 ? "HIGH" : score >= 50 ? "MEDIUM" : "LOW", reasons, warnings, features: f, weightsVersion: "v1" };
}

/** Top N (max `maxRecruiters` recruiters) plus reserves, best first. */
export function selectTop<T extends { score: Score }>(items: T[], opts = { top: 15, reserves: 10, maxRecruiters: 2 }) {
  const sorted = [...items].sort((a, b) => b.score.sortKey - a.score.sortKey);
  const top: T[] = [];
  const rest: T[] = [];
  let recruiters = 0;
  for (const item of sorted) {
    const isRecruiter = item.score.features.function === "RECRUITING";
    if (top.length < opts.top && (!isRecruiter || recruiters < opts.maxRecruiters)) {
      top.push(item);
      if (isRecruiter) recruiters++;
    } else rest.push(item);
  }
  return { top, reserves: rest.slice(0, opts.reserves) };
}

// ───────────── Rule-based fallback when the AI is unavailable ─────────────

export function heuristicSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  // "Graduate Engineer Trainee" is a full-time fresher role in India, not an internship.
  if (/\bgraduate (engineer(ing)? )?trainee\b/.test(t)) return "JUNIOR";
  if (/\bintern(ship)?\b|\btrainee\b/.test(t)) return "INTERN";
  if (/\b(director|vp|vice president|head of|chief|cto|ceo)\b/.test(t)) return "DIRECTOR_PLUS";
  if (/\b(manager|mgr)\b/.test(t) && !/product manager|program manager/.test(t)) return "MANAGER";
  if (/\b(staff|principal|architect|distinguished|fellow)\b/.test(t)) return "STAFF_PLUS";
  if (/\b(senior|sr\.?|lead|sde[- ]?3|iii)\b/.test(t)) return "SENIOR";
  if (/\b(associate|junior|jr\.?|graduate|sde[- ]?1|engineer i)\b/.test(t)) return "JUNIOR";
  if (/\b(engineer|developer|sde|scientist|analyst)\b/.test(t)) return "MID";
  return "UNKNOWN";
}

export function heuristicFunction(title: string): JobFunction {
  const t = title.toLowerCase();
  if (/recruit|talent acquisition|\bta\b|hiring|sourcer|campus/.test(t)) return "RECRUITING";
  if (/data scien|machine learning|\bml\b|\bai\b|analytics/.test(t)) return "DATA";
  if (/engineer|developer|sde|devops|sre|architect|programmer/.test(t)) return "ENGINEERING";
  if (/product manager|product owner/.test(t)) return "PRODUCT";
  return "OTHER";
}

/** Share of the job's skills/domains/titles mentioned in the person's headline (0..1). */
export function keywordOverlap(headline: string, keywords: string[]): number {
  const text = ` ${normalizeName(headline)} `;
  const terms = [...new Set(keywords.map(normalizeName).filter((k) => k.length > 1))];
  if (!terms.length) return 0;
  const hits = terms.filter((k) => text.includes(` ${k} `)).length;
  return Math.min(1, hits / Math.min(terms.length, 4));
}
