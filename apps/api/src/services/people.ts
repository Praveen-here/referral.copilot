import { isSameInstitution, normalizeName } from "@rc/core";
import { prisma, type ContactSource, type JobFunction, type Seniority } from "@rc/db";
import { HttpError, notFound } from "../http/errors";

export interface NewPerson {
  fullName: string;
  currentTitle?: string | null;
  linkedinUrl?: string | null;
  school?: string | null;
  location?: string | null;
  isConnected?: boolean;
  seniority?: Seniority;
  function?: JobFunction;
  isRecruiter?: boolean;
  openToRefer?: boolean;
  source?: ContactSource;
}

/** Normalizes LinkedIn profile URLs so the same person is never stored twice. */
export function normalizeLinkedinUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.trim().match(/linkedin\.com\/in\/([^/?#\s]+)/i);
  return match ? `https://www.linkedin.com/in/${decodeURIComponent(match[1]!).toLowerCase()}` : null;
}

export async function findOrCreateCompany(userId: string, name: string, isSample = false) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) throw new HttpError(400, "VALIDATION", "Company name is required");
  return prisma.company.upsert({
    where: { userId_normalizedName: { userId, normalizedName } },
    update: {},
    create: { userId, name: name.trim(), normalizedName, isSample },
  });
}

/** Adds a person to a job's pipeline, tagging alumni by comparing schools. */
export async function addPersonToJob(userId: string, jobId: string, person: NewPerson, opts: { rank?: number; isReserve?: boolean } = {}) {
  const job = await prisma.jobOpportunity.findFirst({ where: { id: jobId, userId } });
  if (!job) throw notFound("Job");
  const userSchools = await prisma.education.findMany({ where: { userId }, select: { institutionRaw: true } });
  const linkedinUrl = normalizeLinkedinUrl(person.linkedinUrl);

  return prisma.$transaction(async (tx) => {
    const existing = linkedinUrl ? await tx.contact.findFirst({ where: { userId, linkedinUrl } }) : null;
    const data = {
      fullName: person.fullName.trim(),
      currentTitle: person.currentTitle ?? null,
      location: person.location ?? null,
      seniority: person.seniority ?? "UNKNOWN",
      function: person.function ?? (person.isRecruiter ? "RECRUITING" : "UNKNOWN"),
      isConnected: person.isConnected ?? false,
    } as const;
    const contact = existing
      ? await tx.contact.update({ where: { id: existing.id }, data })
      : await tx.contact.create({
          data: {
            ...data,
            userId,
            companyId: job.companyId,
            linkedinUrl,
            source: person.source ?? "MANUAL",
            confidence: person.source === "SAMPLE" ? "WEB_EVIDENCE" : "USER_VERIFIED",
          },
        });

    if (person.school) {
      await tx.education.deleteMany({ where: { contactId: contact.id } });
      await tx.education.create({ data: { contactId: contact.id, institutionRaw: person.school.trim() } });
      const shared = userSchools.find((s) => isSameInstitution(s.institutionRaw, person.school));
      if (shared) {
        await tx.contactTag.upsert({
          where: { contactId_tag: { contactId: contact.id, tag: "COLLEGE_ALUMNI" } },
          update: {},
          create: { contactId: contact.id, tag: "COLLEGE_ALUMNI", source: "RULE", evidence: `Both: ${shared.institutionRaw}` },
        });
      }
    }
    if (person.isRecruiter) {
      await tx.contactTag.upsert({
        where: { contactId_tag: { contactId: contact.id, tag: "RECRUITER" } },
        update: {},
        create: { contactId: contact.id, tag: "RECRUITER", source: person.source === "SAMPLE" ? "RULE" : "USER" },
      });
    }
    if (person.openToRefer) {
      await tx.contactTag.upsert({
        where: { contactId_tag: { contactId: contact.id, tag: "OPEN_TO_REFER" } },
        update: {},
        create: { contactId: contact.id, tag: "OPEN_TO_REFER", source: "RULE" },
      });
    }

    const already = await tx.outreach.findUnique({ where: { jobId_contactId: { jobId, contactId: contact.id } } });
    if (already) throw new HttpError(409, "DUPLICATE", `${contact.fullName} is already on this job`, { outreachId: already.id });

    const count = await tx.outreach.count({ where: { jobId } });
    return tx.outreach.create({
      data: { userId, jobId, contactId: contact.id, rank: opts.rank ?? count + 1, isReserve: opts.isReserve ?? false },
    });
  });
}
