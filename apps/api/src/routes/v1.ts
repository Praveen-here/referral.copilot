import { Router } from "express";
import { z } from "zod";
import { OUTREACH_EVENTS, stripDashes, tabForState } from "@rc/core";
import { prisma, Prisma } from "@rc/db";
import { env } from "../env";
import { HttpError, notFound } from "../http/errors";
import { addPastedPeople, latestDiscovery, startDiscovery } from "../services/discovery";
import { ensureAnalysis, readJobPosting } from "../services/jobs";
import { generateDraft, getOrWriteDraft } from "../services/messages";
import { readReply } from "../services/replies";
import { searchConfigured } from "../services/search";
import { applyEvent, undoLastEvent } from "../services/outreach";
import { addPersonToJob, findOrCreateCompany } from "../services/people";
import { createSampleData, removeSampleData } from "../services/sample";
import { companyDetail, inviteBudget, jobDetail, sidebar, today } from "../services/views";

export const v1 = Router();

const id = (value: unknown) => z.string().min(1).parse(value);
const optionalText = z.string().trim().max(5000).optional().transform((v) => (v ? v : null));

// ───────────── Me & profile ─────────────

v1.get("/me", async (_req, res) => {
  const userId = res.locals.userId;
  const [user, profile, educations] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, image: true } }),
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.education.findMany({ where: { userId } }),
  ]);
  const university = educations[0]?.institutionRaw ?? null;
  res.json({ user, profile, university, onboarded: Boolean(university && profile?.degree) });
});

const profileInput = z.object({
  university: z.string().trim().min(2).max(200),
  degree: z.string().trim().min(1).max(100),
  field: optionalText,
  graduationYear: z.coerce.number().int().min(1990).max(2100).optional().nullable(),
  currentSemester: z.coerce.number().int().min(1).max(12).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
  fitReason: optionalText,
  resumeUrl: z.url().optional().or(z.literal("")).transform((v) => v || null),
  linkedinUrl: z.url().optional().or(z.literal("")).transform((v) => v || null),
  signOffName: optionalText,
});

v1.put("/me/profile", async (req, res) => {
  const userId = res.locals.userId;
  const input = profileInput.parse(req.body);
  const existing = await prisma.userProfile.findUnique({ where: { userId } });
  const settings = { ...((existing?.settings ?? {}) as object), signOffName: input.signOffName };
  const data = {
    degree: input.degree,
    field: input.field,
    graduationYear: input.graduationYear ?? null,
    currentSemester: input.currentSemester ?? null,
    skills: input.skills,
    // The one-line fit reason is stored as the first project; messages may only cite it.
    projects: input.fitReason ? [{ oneLiner: input.fitReason }] : [],
    resumeUrl: input.resumeUrl,
    linkedinUrl: input.linkedinUrl,
    settings,
  };
  await prisma.$transaction([
    prisma.userProfile.upsert({ where: { userId }, update: data, create: { userId, ...data } }),
    prisma.education.deleteMany({ where: { userId } }),
    prisma.education.create({ data: { userId, institutionRaw: input.university, degree: input.degree, field: input.field } }),
  ]);
  res.json({ ok: true });
});

// ───────────── Navigation & dashboards ─────────────

v1.get("/sidebar", async (_req, res) => {
  res.json({ companies: await sidebar(res.locals.userId) });
});

v1.get("/today", async (_req, res) => {
  res.json(await today(res.locals.userId));
});

v1.get("/invite-budget", async (_req, res) => {
  res.json(await inviteBudget(res.locals.userId));
});

// ───────────── Search ─────────────

/** People by name across every job, e.g. after a LinkedIn "accepted your invitation" notification. */
v1.get("/search", async (req, res) => {
  const q = z.string().trim().min(1).max(100).parse(req.query.q);
  const terms = q.split(/\s+/).slice(0, 4);
  const contacts = await prisma.contact.findMany({
    where: { userId: res.locals.userId, AND: terms.map((t) => ({ fullName: { contains: t, mode: "insensitive" as const } })) },
    include: {
      company: { select: { id: true, name: true } },
      tags: { select: { tag: true } },
      outreach: { include: { job: { select: { id: true, title: true, status: true } } }, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  const first = q.toLowerCase();
  const results = contacts
    // Names that start with the query come first.
    .sort((a, b) => Number(b.fullName.toLowerCase().startsWith(first)) - Number(a.fullName.toLowerCase().startsWith(first)))
    .flatMap((c) =>
      c.outreach.map((o) => ({
        id: o.id,
        version: o.version,
        state: o.state,
        tab: tabForState(o.state),
        isAlumni: c.tags.some((t) => t.tag === "COLLEGE_ALUMNI"),
        contact: { id: c.id, fullName: c.fullName, currentTitle: c.currentTitle, linkedinUrl: c.linkedinUrl },
        company: c.company,
        job: o.job,
      })),
    )
    .slice(0, 10);
  res.json({ results });
});

// ───────────── Companies & jobs ─────────────

v1.get("/companies/:id", async (req, res) => {
  res.json(await companyDetail(res.locals.userId, id(req.params.id)));
});

v1.delete("/companies/:id", async (req, res) => {
  const { count } = await prisma.company.deleteMany({ where: { id: id(req.params.id), userId: res.locals.userId } });
  if (!count) throw notFound("Company");
  res.status(204).end();
});

const jobInput = z.object({
  companyName: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(200),
  externalJobId: optionalText,
  url: z.url().optional().or(z.literal("")).transform((v) => v || null),
  location: optionalText,
  descriptionRaw: z.string().trim().max(20_000).optional().transform((v) => v || null),
});

v1.post("/jobs", async (req, res) => {
  const userId = res.locals.userId;
  const input = jobInput.parse(req.body);
  const company = await findOrCreateCompany(userId, input.companyName);
  const { companyName: _, ...jobData } = input;
  const job = await prisma.jobOpportunity.create({ data: { ...jobData, userId, companyId: company.id } });
  // Start reading the job now so the analysis is ready by the time the page loads.
  void ensureAnalysis(userId, job.id).catch((e) => console.warn("Background job analysis failed", e));
  res.status(201).json(job);
});

v1.post("/jobs/read-url", async (req, res) => {
  const { url } = z.object({ url: z.url() }).parse(req.body);
  res.json(await readJobPosting(url));
});

v1.post("/jobs/:id/discover", async (req, res) => {
  res.status(202).json(await startDiscovery(res.locals.userId, id(req.params.id)));
});

/** People the user copied from a LinkedIn page (they open LinkedIn themselves; we never fetch it). */
v1.post("/jobs/:id/paste-people", async (req, res) => {
  const body = z
    .object({ text: z.string().trim().min(20).max(50_000), source: z.enum(["COMPANY_PEOPLE", "COMPANY_PEOPLE_COLLEGE", "SEARCH"]) })
    .parse(req.body);
  res.json(await addPastedPeople(res.locals.userId, id(req.params.id), body.text, body.source));
});

v1.get("/jobs/:id/discovery", async (req, res) => {
  res.json({ run: await latestDiscovery(res.locals.userId, id(req.params.id)), searchConfigured: searchConfigured() });
});

v1.get("/jobs/:id", async (req, res) => {
  res.json(await jobDetail(res.locals.userId, id(req.params.id)));
});

v1.patch("/jobs/:id", async (req, res) => {
  const input = jobInput.omit({ companyName: true }).partial().extend({
    status: z.enum(["ACTIVE", "APPLIED", "CLOSED", "ARCHIVED"]).optional(),
  }).parse(req.body);
  // A changed title or description means the stored AI analysis is stale.
  const reanalyze = input.title !== undefined || input.descriptionRaw !== undefined;
  const { count } = await prisma.jobOpportunity.updateMany({
    where: { id: id(req.params.id), userId: res.locals.userId },
    data: { ...input, ...(reanalyze ? { analysis: Prisma.DbNull } : {}) },
  });
  if (!count) throw notFound("Job");
  if (input.status === "CLOSED") {
    await prisma.outreach.updateMany({
      where: { jobId: id(req.params.id), state: { in: ["DISCOVERED", "CONNECTION_SENT", "ACCEPTED_MESSAGE_READY", "AWAITING_REPLY", "IN_CONVERSATION"] } },
      data: { state: "JOB_CLOSED", nextCheckAt: null },
    });
  }
  res.json({ ok: true });
});

v1.delete("/jobs/:id", async (req, res) => {
  const { count } = await prisma.jobOpportunity.deleteMany({ where: { id: id(req.params.id), userId: res.locals.userId } });
  if (!count) throw notFound("Job");
  res.status(204).end();
});

const personInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  currentTitle: optionalText,
  linkedinUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /linkedin\.com\/in\//i.test(v), "Paste a linkedin.com/in/ profile link"),
  school: optionalText,
  isConnected: z.boolean().optional(),
  isRecruiter: z.boolean().optional(),
});

v1.post("/jobs/:id/people", async (req, res) => {
  const outreach = await addPersonToJob(res.locals.userId, id(req.params.id), personInput.parse(req.body));
  res.status(201).json(outreach);
});

// ───────────── Outreach ─────────────

v1.post("/outreach/:id/events", async (req, res) => {
  const body = z.object({ type: z.enum(OUTREACH_EVENTS), expectedVersion: z.number().int().optional() }).parse(req.body);
  res.json(await applyEvent(res.locals.userId, id(req.params.id), body.type, body.expectedVersion));
});

v1.post("/outreach/:id/undo", async (req, res) => {
  res.json(await undoLastEvent(res.locals.userId, id(req.params.id)));
});

const draftKind = z.enum(["REFERRAL_REQUEST", "FOLLOW_UP_1", "FOLLOW_UP_2", "RESUME_SHARE", "THANK_YOU", "THANKS_ANYWAY", "REPLY_RESPONSE"]);

/** Returns the open draft of this kind, AI-writing one if needed (template if the AI is down). */
v1.post("/outreach/:id/drafts", async (req, res) => {
  const { template } = z.object({ template: draftKind }).parse(req.body);
  res.json(await getOrWriteDraft(res.locals.userId, id(req.params.id), template));
});

/** User pasted the person's LinkedIn reply: read it, suggest the status, draft an answer. */
v1.post("/outreach/:id/reply", async (req, res) => {
  const { text } = z.object({ text: z.string().trim().min(1).max(4000) }).parse(req.body);
  res.json(await readReply(res.locals.userId, id(req.params.id), text));
});

v1.patch("/messages/:id", async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(3000) }).parse(req.body);
  const message = await prisma.message.findFirst({ where: { id: id(req.params.id), outreach: { userId: res.locals.userId } } });
  if (!message) throw notFound("Message");
  if (message.status !== "DRAFT") throw new HttpError(409, "NOT_A_DRAFT", "Only drafts can be edited");
  res.json(await prisma.message.update({ where: { id: message.id }, data: { body: stripDashes(body), editedByUser: true } }));
});

async function findDraft(userId: string, messageId: string) {
  const message = await prisma.message.findFirst({ where: { id: messageId, status: "DRAFT", outreach: { userId } } });
  if (!message) throw notFound("Draft");
  return message;
}

/** Rewrite a draft with the AI, optionally in a different style. */
v1.post("/messages/:id/rewrite", async (req, res) => {
  const { style } = z.object({ style: z.enum(["default", "shorter", "warmer", "formal", "fresh"]).default("fresh") }).parse(req.body);
  const message = await findDraft(res.locals.userId, id(req.params.id));
  const kind = message.kind === "FOLLOW_UP" ? ((message.factsUsed as { goal?: string } | null)?.goal === "FOLLOW_UP_2" ? "FOLLOW_UP_2" : "FOLLOW_UP_1") : message.kind;
  if (kind === "INBOUND_REPLY" || kind === "CONNECTION_NOTE") throw new HttpError(400, "VALIDATION", "This message can't be rewritten");
  const theirReply =
    kind === "REPLY_RESPONSE"
      ? (await prisma.message.findFirst({ where: { outreachId: message.outreachId, kind: "INBOUND_REPLY" }, orderBy: { createdAt: "desc" } }))?.body
      : undefined;
  res.json(await generateDraft(res.locals.userId, message.outreachId, kind, { style, theirReply, replaceMessageId: message.id }));
});

/** For messages that don't change pipeline state (thank-yous). */
v1.post("/messages/:id/sent", async (req, res) => {
  const message = await findDraft(res.locals.userId, id(req.params.id));
  res.json(await prisma.message.update({ where: { id: message.id }, data: { status: "SENT", sentAt: new Date() } }));
});

v1.post("/messages/:id/discard", async (req, res) => {
  const message = await findDraft(res.locals.userId, id(req.params.id));
  res.json(await prisma.message.update({ where: { id: message.id }, data: { status: "DISCARDED" } }));
});

// ───────────── Sample data (development only) ─────────────

v1.post("/sample-data", async (_req, res) => {
  if (env.NODE_ENV === "production") throw notFound();
  res.status(201).json(await createSampleData(res.locals.userId));
});

v1.delete("/sample-data", async (_req, res) => {
  await removeSampleData(res.locals.userId);
  res.status(204).end();
});
