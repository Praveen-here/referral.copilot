// Job facts that are safe to put in a message.

/** LinkedIn's posting number from a job URL (…/jobs/view/<slug->4471337817 or ?currentJobId=…). */
export function linkedinPostingId(url: string | null | undefined): string | null {
  if (!url || !/linkedin\.com/i.test(url)) return null;
  return url.match(/[?&]currentJobId=(\d{6,})/)?.[1] ?? url.match(/\/jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/)?.[1] ?? null;
}

/**
 * The company's own job/requisition ID, or null. A LinkedIn posting number is not the
 * company's job ID (the referral portal won't recognise it), so messages link to the
 * posting instead of quoting it as an ID.
 */
export function companyJobId(job: { externalJobId: string | null; url: string | null }): string | null {
  const id = job.externalJobId?.trim();
  if (!id) return null;
  return id === linkedinPostingId(job.url) ? null : id;
}

// ───────────── Combined roles (several jobs at one company, one ask) ─────────────

/** More roles than this in one message reads as a mass ask, so combining stops here. */
export const MAX_COMBINED_ROLES = 3;

/** One role as a message may state it: only the company's real job ID, never a LinkedIn number. */
export interface RoleFact {
  title: string;
  jobId: string | null;
  url: string | null;
  /** City only ("Bengaluru"), for the "in <city>" phrase. */
  city: string | null;
}

export function roleFact(job: { title: string; externalJobId: string | null; url: string | null; location: string | null }): RoleFact {
  return {
    title: job.title.trim(),
    jobId: companyJobId(job),
    url: job.url?.trim() || null,
    city: job.location?.split(",")[0]?.trim() || null,
  };
}

/** The shared city if every role names the same one, else null (each role then goes without a city). */
export function sharedCity(roles: RoleFact[]): string | null {
  const cities = new Set(roles.map((r) => r.city?.toLowerCase() ?? null));
  return cities.size === 1 ? roles[0]!.city : null;
}

/** "the X and Y roles" / "the X, Y and Z roles" / "the X role". */
export function rolesPhrase(roles: RoleFact[]): string {
  const titles = roles.map((r) => r.title);
  if (titles.length === 1) return `the ${titles[0]} role`;
  return `the ${titles.slice(0, -1).join(", ")} and ${titles.at(-1)} roles`;
}

/** How far a conversation got; ended threads (skipped, declined, closed…) rank lowest. */
const PROGRESS: Record<string, number> = {
  DISCOVERED: 1,
  CONNECTION_SENT: 2,
  ACCEPTED_MESSAGE_READY: 3,
  AWAITING_REPLY: 4,
  IN_CONVERSATION: 5,
  REFERRAL_RECEIVED: 6,
};

export interface CombinedRow {
  contactId: string;
  state: string;
  isReserve?: boolean;
  stateChangedAt?: Date | string | null;
}

/**
 * One row per person within each group of combined roles. Discovery runs per job, so the
 * same person can be listed (or even contacted) under two roles; while combined they are
 * one person in every tab, on Today and in the badge. The row that got furthest wins; on a
 * tie, the top list beats reserves, the lead job's row beats the others, then the most
 * recently changed. Nothing is deleted: separating the roles shows every row again.
 * `groupOf` names a row's group (the lead job's id); rows of uncombined jobs are untouched
 * because a person appears once per job anyway.
 */
export function dedupeCombinedPeople<T extends CombinedRow>(rows: T[], groupOf: (row: T) => string, isLead: (row: T) => boolean): T[] {
  const time = (r: T) => (r.stateChangedAt ? new Date(r.stateChangedAt).getTime() : 0);
  const better = (a: T, b: T) =>
    (PROGRESS[a.state] ?? 0) - (PROGRESS[b.state] ?? 0) ||
    Number(!a.isReserve) - Number(!b.isReserve) ||
    Number(isLead(a)) - Number(isLead(b)) ||
    time(a) - time(b);
  const best = new Map<string, T>();
  for (const r of rows) {
    const key = `${groupOf(r)}:${r.contactId}`;
    const current = best.get(key);
    if (!current || better(r, current) > 0) best.set(key, r);
  }
  const keep = new Set(best.values());
  return rows.filter((r) => keep.has(r));
}
