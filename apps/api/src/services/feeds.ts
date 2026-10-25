// Readers for public job feeds. Each returns India tech postings at intern/entry level
// (or level unspecified) in one shape. Endpoints and fields: docs/research/research_notes/
// Tech internship hiring in India/ats_landscape.md. Never add LinkedIn here.

import { boardFromUrl, isIndiaLocation, isTechRole, parseRelativePosted, postingLevel, type AtsKind, type BoardRef, type PostingLevel } from "@rc/core";

export interface FeedPosting {
  externalId: string;
  companyName: string;
  title: string;
  location: string | null;
  url: string;
  level: PostingLevel;
  postedAt: Date | null;
  extra?: { salary?: string; workType?: string; jobReqId?: string };
}

export interface FeedResult {
  postings: FeedPosting[];
  /** True when the feed returned every open posting, so missing ones can be marked closed. */
  complete: boolean;
  /** Boards found in an aggregator's apply links, to watch directly. */
  boards?: (BoardRef & { companyName: string })[];
}

export class FeedError extends Error {
  constructor(
    message: string,
    /** The board doesn't exist (404); a few of these in a row stop watching it. */
    readonly gone = false,
  ) {
    super(message);
  }
}

const UA = "ReferralCopilot/1.0 (personal job alerts)";

async function getJson<T>(url: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "user-agent": UA, accept: "application/json", ...init.headers }, signal: AbortSignal.timeout(timeoutMs) });
  if (res.status === 404) throw new FeedError("Board not found", true);
  if (!res.ok) throw new FeedError(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const date = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Applies the India + tech + junior filter shared by every feed. */
function keep(p: Omit<FeedPosting, "level">, opts: { india: boolean; intern?: boolean; entry?: boolean }): FeedPosting | null {
  if (!opts.india || !isTechRole(p.title)) return null;
  const level = postingLevel(p.title, { intern: opts.intern, entry: opts.entry });
  return level ? { ...p, title: p.title.trim(), level } : null;
}

const compact = <T>(xs: (T | null)[]) => xs.filter((x): x is T => x !== null);

interface Board {
  ats: string;
  slug: string;
  companyName: string;
}

export async function readFeed(board: Board): Promise<FeedResult> {
  switch (board.ats as AtsKind) {
    case "greenhouse":
      return greenhouse(board);
    case "lever":
      return lever(board);
    case "ashby":
      return ashby(board);
    case "smartrecruiters":
      return smartRecruiters(board);
    case "workday":
      return workday(board);
    case "amazon":
      return amazon(board);
    case "debugwithshubham":
      return debugWithShubham();
    default:
      throw new FeedError(`No reader for ${board.ats}`);
  }
}

async function greenhouse(board: Board): Promise<FeedResult> {
  type Job = { id: number; title: string; location?: { name?: string }; absolute_url: string; first_published?: string; updated_at?: string };
  const data = await getJson<{ jobs: Job[] }>(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.slug)}/jobs`);
  return {
    complete: true,
    postings: compact(
      data.jobs.map((j) =>
        keep(
          {
            externalId: String(j.id),
            companyName: board.companyName,
            title: j.title,
            location: j.location?.name ?? null,
            url: j.absolute_url,
            postedAt: date(j.first_published ?? j.updated_at),
          },
          { india: isIndiaLocation([j.location?.name]) },
        ),
      ),
    ),
  };
}

async function lever(board: Board): Promise<FeedResult> {
  type Job = {
    id: string;
    text: string;
    hostedUrl: string;
    createdAt?: number;
    country?: string;
    categories?: { location?: string; allLocations?: string[]; commitment?: string };
  };
  const [host, site] = board.slug.startsWith("eu/") ? ["api.eu.lever.co", board.slug.slice(3)] : ["api.lever.co", board.slug];
  const jobs = await getJson<Job[]>(`https://${host}/v0/postings/${encodeURIComponent(site)}?mode=json`);
  return {
    complete: true,
    postings: compact(
      jobs.map((j) =>
        keep(
          {
            externalId: j.id,
            companyName: board.companyName,
            title: j.text,
            location: j.categories?.location ?? null,
            url: j.hostedUrl,
            postedAt: date(j.createdAt),
          },
          {
            india: isIndiaLocation([j.categories?.location, ...(j.categories?.allLocations ?? [])], j.country),
            intern: /intern/i.test(j.categories?.commitment ?? ""),
          },
        ),
      ),
    ),
  };
}

async function ashby(board: Board): Promise<FeedResult> {
  type Address = { postalAddress?: { addressCountry?: string; addressLocality?: string } };
  type Job = {
    id: string;
    title: string;
    location?: string;
    secondaryLocations?: { location?: string; address?: Address }[];
    address?: Address;
    employmentType?: string;
    publishedAt?: string;
    jobUrl: string;
    isListed?: boolean;
    workplaceType?: string;
  };
  const data = await getJson<{ jobs: Job[] }>(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}`);
  return {
    complete: true,
    postings: compact(
      data.jobs
        .filter((j) => j.isListed !== false)
        .map((j) => {
          const places = [j.location, j.address?.postalAddress?.addressLocality, ...(j.secondaryLocations ?? []).map((s) => s.location)];
          const countries = [j.address?.postalAddress?.addressCountry, ...(j.secondaryLocations ?? []).map((s) => s.address?.postalAddress?.addressCountry)];
          return keep(
            {
              externalId: j.id,
              companyName: board.companyName,
              title: j.title,
              location: j.location ?? null,
              url: j.jobUrl,
              postedAt: date(j.publishedAt),
              extra: j.workplaceType ? { workType: j.workplaceType } : undefined,
            },
            { india: isIndiaLocation([...places, ...countries]), intern: j.employmentType === "Intern" },
          );
        }),
    ),
  };
}

async function smartRecruiters(board: Board): Promise<FeedResult> {
  type Job = {
    id: string;
    name: string;
    releasedDate?: string;
    location?: { fullLocation?: string; city?: string; country?: string };
    typeOfEmployment?: { label?: string };
    experienceLevel?: { label?: string };
  };
  const pageSize = 100;
  const maxPages = 5;
  const all: Job[] = [];
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const data = await getJson<{ totalFound: number; content: Job[] }>(
      `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board.slug)}/postings?country=in&limit=${pageSize}&offset=${page * pageSize}`,
    );
    total = data.totalFound;
    all.push(...data.content);
    if (all.length >= total || data.content.length < pageSize) break;
  }
  return {
    // Big boards (Bosch lists 600+ India roles) are read up to 500, so absences there mean nothing.
    complete: all.length >= total,
    postings: compact(
      all.map((j) =>
        keep(
          {
            externalId: j.id,
            companyName: board.companyName,
            title: j.name,
            location: j.location?.fullLocation ?? j.location?.city ?? null,
            url: `https://jobs.smartrecruiters.com/${encodeURIComponent(board.slug)}/${j.id}`,
            postedAt: date(j.releasedDate),
          },
          {
            india: isIndiaLocation([j.location?.fullLocation], j.location?.country),
            intern: /intern/i.test(`${j.typeOfEmployment?.label} ${j.experienceLevel?.label}`),
            entry: /entry/i.test(j.experienceLevel?.label ?? ""),
          },
        ),
      ),
    ),
  };
}

/** Workday has no "list everything" call worth making on big tenants, so it runs a few targeted searches. */
async function workday(board: Board): Promise<FeedResult> {
  type Job = { title: string; externalPath: string; locationsText?: string; postedOn?: string; bulletFields?: string[] };
  const [hostPart, site] = board.slug.split("/");
  const tenant = hostPart!.split(".")[0];
  const base = `https://${hostPart}.myworkdayjobs.com`;
  const seen = new Map<string, FeedPosting>();
  for (const searchText of ["intern India", "apprentice India", "graduate India", "engineer India"]) {
    const data = await getJson<{ jobPostings?: Job[] }>(`${base}/wday/cxs/${tenant}/${site}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText }),
    });
    for (const j of data.jobPostings ?? []) {
      const reqId = j.bulletFields?.[0] ?? null;
      const id = reqId ?? j.externalPath;
      if (seen.has(id)) continue;
      const p = keep(
        {
          externalId: id,
          companyName: board.companyName,
          title: j.title,
          location: j.locationsText ?? null,
          url: `${base}/${site}${j.externalPath}`,
          postedAt: parseRelativePosted(j.postedOn),
          extra: reqId ? { jobReqId: reqId } : undefined,
        },
        { india: isIndiaLocation([j.locationsText, j.externalPath]) },
      );
      if (p) seen.set(id, p);
    }
  }
  return { complete: false, postings: [...seen.values()] };
}

async function amazon(board: Board): Promise<FeedResult> {
  type Job = { id_icims: string; title: string; city?: string; posted_date?: string; job_path: string; is_intern?: boolean; university_job?: boolean };
  const seen = new Map<string, FeedPosting>();
  for (const q of ["intern", "apprentice", "software development engineer", ""]) {
    const data = await getJson<{ jobs: Job[] }>(
      `https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q)}&country=IND&result_limit=100&sort=recent`,
    );
    for (const j of data.jobs) {
      if (seen.has(j.id_icims)) continue;
      const p = keep(
        {
          externalId: j.id_icims,
          companyName: board.companyName,
          title: j.title,
          location: j.city ?? null,
          url: `https://www.amazon.jobs${j.job_path}`,
          postedAt: date(j.posted_date),
          extra: { jobReqId: j.id_icims },
        },
        { india: true, intern: j.is_intern, entry: j.university_job },
      );
      if (p) seen.set(j.id_icims, p);
    }
  }
  return { complete: false, postings: [...seen.values()] };
}

/**
 * debugwithshubham.com's public list, curated by hand for Indian freshers (user
 * approved reading it daily, 2026-10-24). Times are IST without an offset. Their
 * apply links also reveal company boards to watch directly.
 */
async function debugWithShubham(): Promise<FeedResult> {
  type Job = {
    id: string;
    company_name: string;
    role: string;
    location?: string;
    salary?: string;
    apply_url: string;
    job_type?: string;
    work_type?: string;
    posted_at?: string;
  };
  const cutoff = Date.now() - 21 * 86_400_000;
  const all: Job[] = [];
  for (let page = 1; page <= 3; page++) {
    // Their API sleeps on a free host; the first call can take most of a minute.
    const jobs = await getJson<Job[]>(`https://debugwithshubham-web-page.onrender.com/api/jobs/?page=${page}&limit=100`, {}, 75_000);
    all.push(...jobs);
    const oldest = jobs.at(-1)?.posted_at;
    if (jobs.length < 100 || (oldest && Date.parse(`${oldest}+05:30`) < cutoff)) break;
  }

  const boards = new Map<string, BoardRef & { companyName: string }>();
  const postings = compact(
    all.map((j) => {
      const company = j.company_name.trim();
      const ref = boardFromUrl(j.apply_url);
      if (ref && ref.ats !== "amazon") boards.set(`${ref.ats}:${ref.slug}`, { ...ref, companyName: company });
      if (!isTechRole(j.role)) return null;
      // Everything on this list is for freshers, so a title naming no level counts as entry.
      const titleLevel = postingLevel(j.role);
      const level = j.job_type === "Internship" || titleLevel === "INTERN" ? "INTERN" : titleLevel && "ENTRY";
      if (!level) return null;
      return {
        externalId: j.id,
        companyName: company,
        title: j.role.trim(),
        location: j.location?.trim() || null,
        url: j.apply_url,
        level,
        postedAt: j.posted_at ? date(`${j.posted_at}+05:30`) : null,
        extra: { salary: j.salary?.trim() || undefined, workType: j.work_type || undefined },
      } satisfies FeedPosting;
    }),
  );
  return { complete: false, postings, boards: [...boards.values()] };
}
