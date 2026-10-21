// Search plan for one job (plan §9.1): a handful of targeted searches, alumni
// first. The app never queries LinkedIn; it asks a search engine.
//
// Queries are plain keywords: Serper's free plan rejects quotes, site: and OR
// (verified 2026-10-20). Precision comes from verifyCandidate(), not operators.

import { institutionAliases } from "../relationships/alumni";

export type QueryPurpose = "ALUMNI_ROLE" | "ALUMNI_ANY" | "ROLE" | "RECRUITER" | "OPEN_TO_REFER";

export interface PlannedQuery {
  purpose: QueryPurpose;
  query: string;
}

export interface PlanInput {
  companyNames: string[];
  location: string | null;
  roleFamily: string;
  contactTitles: string[];
  university: string | null;
}

export function planQueries(input: PlanInput): PlannedQuery[] {
  const companies = dedupe(input.companyNames);
  const company = companies[0]!;
  // A second name (e.g. "Hewlett Packard Enterprise" for "HPE") widens the net.
  const altCompany = companies[1] ?? company;
  const city = input.location ? cityOf(input.location) : "";
  const titles = dedupe(input.contactTitles);
  const mainTitle = titles[0] ?? input.roleFamily;
  const q = (purpose: QueryPurpose, ...words: string[]): PlannedQuery => ({
    purpose,
    query: [...words, "linkedin"].map((w) => clean(w)).filter(Boolean).join(" "),
  });

  const queries: PlannedQuery[] = [];
  if (input.university) {
    // Alumni are the strongest lever, so they get the most searches (several spellings,
    // both company names, with and without city) to maximize recall.
    const [school, altSchool, shortSchool] = institutionAliases(input.university);
    queries.push(q("ALUMNI_ROLE", company, school!, mainTitle));
    if (altSchool) queries.push(q("ALUMNI_ROLE", company, altSchool, mainTitle));
    queries.push(q("ALUMNI_ANY", altCompany, school!));
    queries.push(q("ALUMNI_ANY", company, school!, city));
    if (shortSchool) queries.push(q("ALUMNI_ANY", company, shortSchool, "engineer"));
  }
  for (const title of titles.slice(0, 2)) queries.push(q("ROLE", company, title, city));
  queries.push(q("RECRUITER", company, "university recruiter", city));
  queries.push(q("RECRUITER", company, "talent acquisition", city));
  queries.push(q("OPEN_TO_REFER", company, input.roleFamily, "referral"));
  return dedupeQueries(queries);
}

/** Strips characters search APIs treat as operators. */
function clean(word: string) {
  return word.replace(/["()|:]/g, " ").replace(/\s+/g, " ").trim();
}

/** "Bengaluru, Karnataka, India" → "Bengaluru". */
function cityOf(location: string) {
  return location.split(/[,(/]/)[0]!.trim();
}

function dedupe(values: string[]) {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeQueries(queries: PlannedQuery[]) {
  const seen = new Set<string>();
  return queries.filter((x) => {
    const key = x.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
