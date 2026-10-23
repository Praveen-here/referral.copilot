// Openings from public job feeds: which postings are India tech roles a student can apply to.

export const ATS_KINDS = ["greenhouse", "lever", "ashby", "smartrecruiters", "workday", "amazon", "debugwithshubham"] as const;
export type AtsKind = (typeof ATS_KINDS)[number];

/** INTERN and ENTRY are what the user is looking for; UNSPECIFIED titles name no level ("Backend Developer"). */
export type PostingLevel = "INTERN" | "ENTRY" | "UNSPECIFIED";

export interface BoardRef {
  ats: AtsKind;
  /** Greenhouse token, Lever site (`eu/` prefix for EU), Ashby name, SmartRecruiters id, Workday `tenant.wdN/site`. */
  slug: string;
  /** The posting's ID on that board, when the URL names one. */
  jobId: string | null;
}

/**
 * Which public job board a careers or apply link belongs to. Taking the board from a
 * real link avoids guessing slugs from company names, which matched unrelated
 * companies more than ten times in research (docs/research/reports).
 */
export function boardFromUrl(rawUrl: string | null | undefined): BoardRef | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

  if (/(^|\.)greenhouse\.io$/.test(host)) {
    const jobsAt = seg.indexOf("jobs");
    const slug = url.searchParams.get("for") ?? (jobsAt > 0 ? seg[jobsAt - 1] : seg[0] !== "embed" ? seg[0] : undefined);
    if (!slug || slug === "embed") return null;
    return { ats: "greenhouse", slug: slug.toLowerCase(), jobId: url.searchParams.get("token") ?? (jobsAt >= 0 ? (seg[jobsAt + 1] ?? null) : null) };
  }
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co") {
    if (!seg[0]) return null;
    const site = seg[0].toLowerCase();
    return { ats: "lever", slug: host === "jobs.eu.lever.co" ? `eu/${site}` : site, jobId: seg[1] ?? null };
  }
  if (host === "jobs.ashbyhq.com") {
    if (!seg[0]) return null;
    return { ats: "ashby", slug: seg[0], jobId: seg[1] ?? null };
  }
  if (host === "jobs.smartrecruiters.com" || host === "careers.smartrecruiters.com") {
    if (!seg[0]) return null;
    return { ats: "smartrecruiters", slug: seg[0], jobId: seg[1]?.match(/^\d+/)?.[0] ?? null };
  }
  const workday = host.match(/^([a-z0-9-]+)\.(wd\d+)\.myworkdayjobs\.com$/);
  if (workday) {
    const rest = /^[a-z]{2}-[A-Z]{2}$/.test(seg[0] ?? "") ? seg.slice(1) : seg;
    if (!rest[0] || rest[0] === "wday") return null;
    return { ats: "workday", slug: `${workday[1]}.${workday[2]}/${rest[0]}`, jobId: rest.at(-1)?.match(/_([A-Z]*-?\d[\w-]*)$/)?.[1] ?? null };
  }
  if (host === "amazon.jobs" || host === "www.amazon.jobs") {
    return { ats: "amazon", slug: "amazon", jobId: url.pathname.match(/\/jobs\/(\d+)/)?.[1] ?? null };
  }
  return null;
}

const INDIA_PLACES = [
  "india", "bengaluru", "bangalore", "hyderabad", "secunderabad", "pune", "mumbai", "navi mumbai", "thane", "chennai", "delhi", "new delhi",
  "gurugram", "gurgaon", "noida", "greater noida", "ghaziabad", "faridabad", "kolkata", "ahmedabad", "gandhinagar", "kochi", "cochin",
  "thiruvananthapuram", "trivandrum", "coimbatore", "jaipur", "indore", "chandigarh", "mohali", "bhubaneswar", "vadodara", "nagpur",
  "mysuru", "mysore", "visakhapatnam", "vizag", "goa", "lucknow", "surat", "nashik", "mangaluru", "mangalore", "madurai", "vellore",
  "bhopal", "patna", "ranchi", "guwahati", "dehradun", "kanpur",
];
const INDIA_RE = new RegExp(`\\b(${INDIA_PLACES.join("|")})\\b`, "i");

/** True when any location text or the country code points to India ("Indiana" doesn't count). */
export function isIndiaLocation(texts: (string | null | undefined)[], country?: string | null): boolean {
  const c = country?.trim().toLowerCase();
  if (c === "in" || c === "ind" || c === "india") return true;
  return texts.some((t) => Boolean(t) && INDIA_RE.test(t!.replace(/[-_/]+/g, " ")));
}

const TECH_RE =
  /\b(software|sde|swe|sdet|developer|engineer|engineering|programmer|devops|sre|site reliability|data scien\w*|data analy\w*|data engineer\w*|analytics|machine learning|ml|ai|artificial intelligence|deep learning|nlp|computer vision|llm|genai|backend|back end|frontend|front end|full ?stack|web|mobile|android|ios|flutter|react|security|cyber ?security|infosec|cloud|infrastructure|platform|qa|test automation|firmware|embedded|silicon|vlsi|asic|fpga|hardware|research scientist|applied scientist|technical|tech)\b/i;
const NOT_TECH_RE =
  /\b(sales|account executive|account manager|marketing|recruit\w*|talent|human resources|hr|finance|financial|accounting|accountant|legal|counsel|business development|customer success|content|copywrit\w*|social media|graphic|procurement|supply chain|payroll|administrat\w*|operations|settlements?|treasury|audit\w*|compliance|writer|industrial|mechanical|civil|chemical|manufacturing)\b/i;

/** Technical roles only: SDE, backend, frontend, full stack, AI/ML, data, DevOps, security, mobile, hardware. */
export function isTechRole(title: string): boolean {
  const t = title.replace(/[-_/]+/g, " ");
  return TECH_RE.test(t) && !NOT_TECH_RE.test(t);
}

const INTERN_RE = /\b(intern|interns|internship|internships|apprentice|apprenticeship|co ?op|industrial trainee)\b/i;
const SENIOR_RE =
  /\b(senior|sr|staff|principal|lead|leader|manager|director|head|architect|vp|vice president|chief|distinguished|ii|iii|iv|l[3-9]|level [2-9])\b|\b(engineer|developer|sde|analyst|scientist) ?[2-5]\b|\b[2-9]\+? ?(yrs|years)\b/i;
const ENTRY_RE =
  /\b(new grad\w*|graduate|grad|campus|university|fresher|freshers|entry level|early career|junior|jr|associate|trainee|engineer i|developer i|sde ?(1|i)|engineer 1|level 1|l1|class of|batch|0 ?(to|-) ?[12] (yrs|years))\b/i;

/**
 * How junior a posting is. Null means it's for experienced people and is left out.
 * Hints come from the feed itself (Ashby employmentType "Intern", Lever commitment, Amazon flags).
 */
export function postingLevel(title: string, hints: { intern?: boolean; entry?: boolean } = {}): PostingLevel | null {
  const t = title.replace(/[-_/,()]+/g, " ");
  if (hints.intern || INTERN_RE.test(t)) return "INTERN";
  if (SENIOR_RE.test(t)) return null;
  if (hints.entry || ENTRY_RE.test(t)) return "ENTRY";
  return "UNSPECIFIED";
}

/** Workday lists say "Posted Today" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" instead of a date. */
export function parseRelativePosted(text: string | null | undefined, now = new Date()): Date | null {
  if (!text) return null;
  const t = text.toLowerCase();
  const day = 86_400_000;
  if (t.includes("today")) return now;
  if (t.includes("yesterday")) return new Date(now.getTime() - day);
  const n = t.match(/(\d+)\+?\s*day/)?.[1];
  return n ? new Date(now.getTime() - Number(n) * day) : null;
}

const HOUR = 3_600_000;

/**
 * A posting is new if the app first saw it in the last 3 days (not on the board's
 * first-ever scan, when everything is "first seen"), or the feed itself dates it
 * within 2 days. A posting the feed dates older than a week is never new.
 */
export function isNewOpening(p: { firstSeenAt: Date; postedAt: Date | null; isBaseline: boolean }, now = new Date()): boolean {
  const age = (d: Date) => now.getTime() - d.getTime();
  if (p.postedAt && age(p.postedAt) > 7 * 24 * HOUR) return false;
  if (p.postedAt && age(p.postedAt) <= 48 * HOUR) return true;
  return !p.isBaseline && age(p.firstSeenAt) <= 72 * HOUR;
}

/** Same role listed by two sources (an aggregator and the company board) counts once. */
export function openingKey(companyName: string, title: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${norm(companyName)}|${norm(title)}`;
}
