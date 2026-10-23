// Early job alerts: scan public job feeds, remember what was seen, show what's new.
// No polling worker (DECISIONS #4): a scan starts when someone opens the app and the
// last one is old, or when an outside scheduler calls /api/cron/openings.

import { boardFromUrl, isNewOpening, openingKey } from "@rc/core";
import { prisma, type JobBoard, type Prisma } from "@rc/db";
import { notFound } from "../http/errors";
import { startDiscovery } from "./discovery";
import { FeedError, readFeed, type FeedResult } from "./feeds";
import { ensureAnalysis, readJobPosting } from "./jobs";
import { SEED_BOARDS } from "./openings-seed";
import { findOrCreateCompany } from "./people";

const HOUR = 3_600_000;
export const SCAN_EVERY_MS = 2 * HOUR;
/** Openings older than this (by feed date, or first seen) drop off the list. */
const SHOW_DAYS = 45;

let running: Promise<void> | null = null;
/** Cached max(job_board.lastScanAt); undefined until first read. */
let lastScanAt: Date | null | undefined;

async function lastScan(): Promise<Date | null> {
  if (lastScanAt === undefined) {
    const agg = await prisma.jobBoard.aggregate({ _max: { lastScanAt: true } });
    lastScanAt = agg._max.lastScanAt ?? null;
  }
  return lastScanAt;
}

/** Starts a background scan unless one ran within `minAgeMs`. Returns whether a scan is running. */
export async function maybeStartScan(minAgeMs = SCAN_EVERY_MS): Promise<boolean> {
  if (running) return true;
  const last = await lastScan();
  if (last && Date.now() - last.getTime() < minAgeMs) return false;
  void scanOpenings().catch((e) => console.error("Openings scan failed", e));
  return true;
}

export function scanOpenings(): Promise<void> {
  running ??= runScan().finally(() => {
    running = null;
  });
  return running;
}

/** Reads every board, a few at a time per job system so no host gets hammered. */
async function readAll(boards: JobBoard[]) {
  const results = new Map<string, FeedResult | FeedError>();
  const groups = new Map<string, JobBoard[]>();
  for (const b of boards) groups.set(b.ats, [...(groups.get(b.ats) ?? []), b]);
  await Promise.all(
    [...groups].map(async ([ats, list]) => {
      const queue = [...list];
      const workers = Array.from({ length: Math.min(ats === "workday" ? 2 : 4, queue.length) }, async () => {
        for (let b = queue.shift(); b; b = queue.shift()) {
          try {
            results.set(b.id, await readFeed(b));
          } catch (e) {
            results.set(b.id, e instanceof FeedError ? e : new FeedError(((e as Error).message || "Failed").slice(0, 200)));
          }
        }
      });
      await Promise.all(workers);
    }),
  );
  return results;
}

async function runScan() {
  const started = new Date();
  await prisma.jobBoard.createMany({
    data: SEED_BOARDS.map(([ats, slug, companyName]) => ({ ats, slug, companyName, origin: "SEED" as const })),
    skipDuplicates: true,
  });
  const boards = await prisma.jobBoard.findMany({ where: { active: true } });
  const results = await readAll(boards);

  const ok = boards.filter((b) => !(results.get(b.id) instanceof FeedError));
  const existing = await prisma.jobPosting.findMany({
    where: { boardId: { in: ok.map((b) => b.id) } },
    select: { id: true, boardId: true, externalId: true, closedAt: true },
  });
  const byKey = new Map(existing.map((p) => [`${p.boardId}|${p.externalId}`, p]));

  const create: Prisma.JobPostingCreateManyInput[] = [];
  const seen = new Set<string>();
  const discovered: Prisma.JobBoardCreateManyInput[] = [];
  for (const board of ok) {
    const result = results.get(board.id) as FeedResult;
    const keys = new Set<string>();
    for (const p of result.postings) {
      const key = `${board.id}|${p.externalId}`;
      if (keys.has(key)) continue;
      keys.add(key);
      const found = byKey.get(key);
      if (found) {
        seen.add(found.id);
        continue;
      }
      create.push({
        boardId: board.id,
        externalId: p.externalId,
        companyName: p.companyName,
        title: p.title,
        location: p.location,
        url: p.url,
        level: p.level,
        postedAt: p.postedAt,
        firstSeenAt: started,
        lastSeenAt: started,
        // Everything on a board's first scan is "first seen" now, which says nothing about age.
        isBaseline: board.lastScanAt === null,
        extra: p.extra,
      });
    }
    for (const b of result.boards ?? []) discovered.push({ ats: b.ats, slug: b.slug, companyName: b.companyName, origin: "AGGREGATOR" });
  }
  const completeIds = new Set(ok.filter((b) => (results.get(b.id) as FeedResult).complete).map((b) => b.id));
  const closed = existing.filter((p) => completeIds.has(p.boardId) && !seen.has(p.id) && !p.closedAt).map((p) => p.id);

  // Failures grouped by message, so the batch stays a handful of statements.
  const failures = new Map<string, string[]>();
  for (const b of boards) {
    const r = results.get(b.id);
    if (r instanceof FeedError) failures.set(r.message, [...(failures.get(r.message) ?? []), b.id]);
  }

  await prisma.$transaction([
    prisma.jobPosting.createMany({ data: create, skipDuplicates: true }),
    prisma.jobPosting.updateMany({ where: { id: { in: [...seen] } }, data: { lastSeenAt: started, closedAt: null } }),
    prisma.jobPosting.updateMany({ where: { id: { in: closed } }, data: { closedAt: started } }),
    prisma.jobBoard.updateMany({ where: { id: { in: ok.map((b) => b.id) } }, data: { lastScanAt: started, lastError: null, failCount: 0 } }),
    ...[...failures].map(([message, ids]) =>
      prisma.jobBoard.updateMany({ where: { id: { in: ids } }, data: { lastError: message, failCount: { increment: 1 } } }),
    ),
    // A board that 404s three scans running, or fails ten, is no longer watched.
    prisma.jobBoard.updateMany({ where: { active: true, OR: [{ lastError: "Board not found", failCount: { gte: 3 } }, { failCount: { gte: 10 } }] }, data: { active: false } }),
    prisma.jobBoard.createMany({ data: discovered, skipDuplicates: true }),
  ]);
  lastScanAt = started;
  const failed = boards.length - ok.length;
  console.log(`Openings scan: ${boards.length} boards (${failed} failed), ${create.length} new postings, ${closed.length} closed, ${Date.now() - started.getTime()} ms`);
}

/** Watches the board behind a job link the user added (no-op for links without a public feed). */
export async function watchBoardFromUrl(url: string | null, companyName: string) {
  const ref = boardFromUrl(url);
  if (!ref) return;
  await prisma.jobBoard.createMany({ data: [{ ats: ref.ats, slug: ref.slug, companyName, origin: "JOB_URL" }], skipDuplicates: true });
}

/** Open India tech openings for this user: newest first, one row per role, dismissed ones hidden. */
export async function listOpenings(userId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - SHOW_DAYS * 24 * HOUR);
  const [postings, actions, boardCount, last] = await Promise.all([
    prisma.jobPosting.findMany({
      where: { closedAt: null, OR: [{ postedAt: { gte: since } }, { postedAt: null, isBaseline: false, firstSeenAt: { gte: since } }] },
      include: { board: { select: { ats: true } } },
      orderBy: { firstSeenAt: "desc" },
      take: 1500,
    }),
    prisma.postingAction.findMany({ where: { userId } }),
    prisma.jobBoard.count({ where: { active: true } }),
    lastScan(),
  ]);
  const actionFor = new Map(actions.map((a) => [a.postingId, a]));

  // The company's own board beats the aggregator's copy of the same role.
  const groups = new Map<string, typeof postings>();
  for (const p of postings) {
    const key = openingKey(p.companyName, p.title);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const items = [...groups.values()].flatMap((group) => {
    const primary = group.find((p) => p.board.ats !== "debugwithshubham") ?? group[0]!;
    const groupActions = group.map((p) => actionFor.get(p.id)).filter((a) => a !== undefined);
    const added = groupActions.find((a) => a.status === "ADDED");
    if (!added && groupActions.some((a) => a.status === "DISMISSED")) return [];
    const extra = (primary.extra ?? {}) as { salary?: string; workType?: string };
    return [
      {
        id: primary.id,
        companyName: primary.companyName,
        title: primary.title,
        location: primary.location,
        url: primary.url,
        level: primary.level,
        source: primary.board.ats,
        alsoOnAggregator: group.some((p) => p !== primary && p.board.ats === "debugwithshubham"),
        postedAt: primary.postedAt,
        firstSeenAt: primary.firstSeenAt,
        isNew: group.some((p) => isNewOpening(p, now)),
        salary: extra.salary ?? null,
        workType: extra.workType ?? null,
        jobId: added?.jobId ?? null,
      },
    ];
  });
  const freshness = (i: (typeof items)[number]) => (i.postedAt ?? i.firstSeenAt).getTime();
  items.sort((a, b) => Number(b.isNew) - Number(a.isNew) || freshness(b) - freshness(a));

  return {
    lastScanAt: last,
    scanning: running !== null,
    boardCount,
    counts: {
      // "New" is for roles the user can apply to: interns and entry level.
      new: items.filter((i) => i.isNew && i.level !== "UNSPECIFIED").length,
      intern: items.filter((i) => i.level === "INTERN").length,
      entry: items.filter((i) => i.level === "ENTRY").length,
      all: items.length,
    },
    items: items.slice(0, 400),
  };
}

/** Turns an opening into a job and starts finding people there (same as adding it by hand). */
export async function addOpening(userId: string, postingId: string) {
  const posting = await prisma.jobPosting.findUnique({ where: { id: postingId } });
  if (!posting) throw notFound("Opening");
  const action = await prisma.postingAction.findUnique({ where: { userId_postingId: { userId, postingId } } });
  if (action?.status === "ADDED" && action.jobId) {
    const job = await prisma.jobOpportunity.findFirst({ where: { id: action.jobId, userId } });
    if (job) return { jobId: job.id, companyId: job.companyId };
  }

  // Greenhouse/Lever links give the full description and the company's job ID.
  const read = await readJobPosting(posting.url).catch(() => null);
  const company = await findOrCreateCompany(userId, posting.companyName);
  const job = await prisma.jobOpportunity.create({
    data: {
      userId,
      companyId: company.id,
      title: posting.title,
      url: posting.url,
      location: posting.location,
      externalJobId: read?.externalJobId ?? (posting.extra as { jobReqId?: string } | null)?.jobReqId ?? null,
      descriptionRaw: read?.descriptionRaw ?? null,
    },
  });
  await prisma.postingAction.upsert({
    where: { userId_postingId: { userId, postingId } },
    update: { status: "ADDED", jobId: job.id },
    create: { userId, postingId, status: "ADDED", jobId: job.id },
  });
  // Discovery analyzes the job first; without search configured, analyze it anyway.
  await startDiscovery(userId, job.id).catch(() => {
    void ensureAnalysis(userId, job.id).catch((e) => console.warn("Background job analysis failed", e));
  });
  return { jobId: job.id, companyId: job.companyId };
}

export async function dismissOpening(userId: string, postingId: string) {
  const posting = await prisma.jobPosting.findUnique({ where: { id: postingId }, select: { id: true } });
  if (!posting) throw notFound("Opening");
  // An opening already added as a job stays added.
  await prisma.postingAction.upsert({
    where: { userId_postingId: { userId, postingId } },
    update: {},
    create: { userId, postingId, status: "DISMISSED" },
  });
}

export async function undismissOpening(userId: string, postingId: string) {
  await prisma.postingAction.deleteMany({ where: { userId, postingId, status: "DISMISSED" } });
}
