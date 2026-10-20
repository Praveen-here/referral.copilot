// Turns search results into verified candidates (plan §9.1). Every fact kept
// here was read from the search result itself; nothing is inferred or guessed.

import { institutionAliases, isSameInstitution } from "../relationships/alumni";
import { normalizeName } from "../text";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ParsedProfile {
  url: string;
  fullName: string;
  headline: string;
  /** Title segment after the name, e.g. "Software Engineer at HPE". */
  titleText: string | null;
  experience: string | null;
  education: string | null;
  location: string | null;
  text: string;
}

export interface Candidate extends ParsedProfile {
  /** Job title alone, e.g. "Software Engineer II" (no company, no taglines). */
  currentTitle: string | null;
  school: string | null;
  isAlumni: boolean;
  /** The exact source text that proves each claim, for the UI and audits. */
  evidence: { claim: string; text: string }[];
}

export type Rejection = "NOT_A_PROFILE" | "NO_NAME" | "NOT_AT_COMPANY" | "FORMER_EMPLOYEE";

/** Canonical https://www.linkedin.com/in/<slug>, or null for anything else. */
export function linkedinProfileUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/in\/([^/?#\s]+)/i);
  if (!match) return null;
  return `https://www.linkedin.com/in/${decodeURIComponent(match[1]!).toLowerCase()}`;
}

/**
 * Google shows LinkedIn profiles as "Name - Title - Company | LinkedIn" with a
 * snippet like "Experience: HPE · Education: PES University · Location: Bengaluru".
 */
export function parseProfileResult(r: SearchResult): ParsedProfile | null {
  const url = linkedinProfileUrl(r.url);
  if (!url) return null;
  const title = r.title.replace(/\s*[|·]\s*LinkedIn.*$/i, "").trim();
  const parts = title.split(/\s+[-–—]\s+/);
  const fullName = (parts[0] ?? "").replace(/[,(].*$/, "").trim();
  const titleText = parts.length > 1 ? parts.slice(1).join(" - ").trim() : null;
  const field = (label: string) => {
    const m = r.snippet.match(new RegExp(`${label}:\\s*([^·\\n]+?)\\s*(?:·|$|\\n)`, "i"));
    return m ? m[1]!.trim() : null;
  };
  return {
    url,
    fullName,
    titleText,
    headline: [titleText, r.snippet].filter(Boolean).join(" · ").slice(0, 400),
    experience: field("Experience"),
    education: field("Education"),
    location: field("Location"),
    text: `${r.title}\n${r.snippet}`,
  };
}

const wordMatch = (haystack: string, needle: string) => {
  const n = normalizeName(needle);
  return n.length > 0 && ` ${normalizeName(haystack)} `.includes(` ${n} `);
};

const FORMER = /\b(ex[-\s]|former(ly)?|previously|past|alumni of|retired)\b/i;

export function verifyCandidate(
  p: ParsedProfile,
  ctx: { companyNames: string[]; university: string | null },
): { ok: true; candidate: Candidate } | { ok: false; reason: Rejection } {
  if (!p.fullName || p.fullName.length < 3 || /linkedin/i.test(p.fullName) || p.fullName.split(/\s+/).length > 5) {
    return { ok: false, reason: "NO_NAME" };
  }
  const evidence: Candidate["evidence"] = [];

  // Current employer: the snippet's Experience field, or the title segment.
  const current = [p.experience, p.titleText].filter(Boolean) as string[];
  const companyHit = current.find((t) => ctx.companyNames.some((c) => wordMatch(t, c)));
  if (!companyHit) return { ok: false, reason: "NOT_AT_COMPANY" };
  const formerHit = ctx.companyNames.some((c) => new RegExp(`${FORMER.source}[^·|]{0,20}${escapeRegex(c)}`, "i").test(companyHit));
  if (formerHit) return { ok: false, reason: "FORMER_EMPLOYEE" };
  evidence.push({ claim: "Works at the company", text: companyHit });

  // School: only from the Education field, or the user's own school named in the text.
  let school = p.education;
  let isAlumni = false;
  if (ctx.university) {
    if (isSameInstitution(p.education, ctx.university)) isAlumni = true;
    else {
      const named = institutionAliases(ctx.university).find((alias) => alias.length > 4 && wordMatch(p.text, alias));
      if (named) {
        isAlumni = true;
        school = named;
      }
    }
  }
  if (school) evidence.push({ claim: "Education", text: school });

  const schoolNames = [...(ctx.university ? institutionAliases(ctx.university) : []), ...(p.education ? [p.education] : [])];
  return { ok: true, candidate: { ...p, currentTitle: cleanTitle(p.titleText, ctx.companyNames, schoolNames), school, isAlumni, evidence } };
}

/**
 * Job title alone: "SDE 2 | Java - HPE" → "SDE 2", "AI Engineer @HPE" → "AI Engineer",
 * "Software Engineer- HPE Aruba" → "Software Engineer". Segments that are only
 * the company or a school (a headline like "HPE PES University") give no title.
 */
export function cleanTitle(titleText: string | null, companyNames: string[], schoolNames: string[] = []): string | null {
  if (!titleText) return null;
  const names = [...companyNames, ...schoolNames].map(normalizeName).filter(Boolean).sort((a, b) => b.length - a.length);
  const segments = titleText
    .split(/\s*[-–—]\s+|\s+[-–—]\s*/)
    .map((s) => s.replace(/\s+at\s+.*$/i, "").replace(/\s*@.*$/, "").split(/\s*\|\s*/)[0]!.trim())
    .filter((s) => {
      let rest = ` ${normalizeName(s)} `;
      for (const n of names) rest = rest.split(` ${n} `).join(" ");
      return rest.trim().length > 1;
    });
  return segments[0] ?? null;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
