// Sample data so the UI can be explored before discovery exists. Fictional
// company and people only, clearly labelled, removable in one click.
// Written in a handful of batched queries: each round trip to Neon is ~150ms.

import { isSameInstitution, normalizeName } from "@rc/core";
import { prisma, type OutreachState, type RelationshipTag } from "@rc/db";
import { ensureDraft } from "./outreach";

const DAY = 86_400_000;

const PEOPLE: {
  fullName: string;
  currentTitle: string;
  school?: string;
  isRecruiter?: boolean;
  openToRefer?: boolean;
  isConnected?: boolean;
  state?: OutreachState;
  daysAgo?: number;
}[] = [
  { fullName: "Aarav Menon", currentTitle: "Software Engineer II", school: "PES University", state: "ACCEPTED_MESSAGE_READY" },
  { fullName: "Diya Raghavan", currentTitle: "Senior Software Engineer", school: "PESIT", state: "CONNECTION_SENT", daysAgo: 4 },
  { fullName: "Kabir Shetty", currentTitle: "Software Engineer", school: "PES University", state: "AWAITING_REPLY", daysAgo: 3 },
  { fullName: "Meera Iyer", currentTitle: "Software Engineer II", openToRefer: true, state: "AWAITING_REPLY", daysAgo: 6 },
  { fullName: "Rohan Kulkarni", currentTitle: "Backend Engineer", school: "RV College of Engineering", state: "CONNECTION_SENT", daysAgo: 1 },
  { fullName: "Ananya Rao", currentTitle: "University Recruiter", isRecruiter: true, isConnected: true },
  { fullName: "Vikram Hegde", currentTitle: "Engineering Manager", school: "PES University" },
  { fullName: "Sneha Pillai", currentTitle: "Software Engineer", school: "PES University" },
  { fullName: "Arjun Nair", currentTitle: "Senior Software Engineer", school: "BMS College of Engineering" },
  { fullName: "Ishita Bose", currentTitle: "Software Engineer II", openToRefer: true },
  { fullName: "Nikhil Reddy", currentTitle: "Cloud Engineer" },
  { fullName: "Priya Venkatesh", currentTitle: "Technical Recruiter", isRecruiter: true },
  { fullName: "Siddharth Jain", currentTitle: "Software Engineer" },
  { fullName: "Tara Krishnan", currentTitle: "Staff Engineer", school: "PES University" },
  { fullName: "Varun Gowda", currentTitle: "Software Engineer III", state: "REFERRAL_RECEIVED", daysAgo: 9 },
];

const CONNECTED_STATES: OutreachState[] = ["ACCEPTED_MESSAGE_READY", "AWAITING_REPLY", "REFERRAL_RECEIVED"];

export async function createSampleData(userId: string) {
  const [, userSchools] = await Promise.all([
    removeSampleData(userId),
    prisma.education.findMany({ where: { userId }, select: { institutionRaw: true } }),
  ]);
  const myCollege = userSchools[0]?.institutionRaw;
  const now = Date.now();

  const company = await prisma.company.create({
    data: {
      userId,
      name: "Northwind Labs",
      normalizedName: normalizeName("Northwind Labs"),
      isSample: true,
      jobs: {
        create: {
          userId,
          title: "Software Engineer Intern",
          externalJobId: "NW-2026-104",
          location: "Bengaluru",
          descriptionRaw: "Sample job for exploring the app. Java, Spring Boot, SQL, REST APIs, cloud basics.",
        },
      },
    },
    include: { jobs: true },
  });
  const job = company.jobs[0]!;

  const contacts = await prisma.contact.createManyAndReturn({
    data: PEOPLE.map((p) => ({
      userId,
      companyId: company.id,
      fullName: p.fullName,
      currentTitle: p.currentTitle,
      function: p.isRecruiter ? ("RECRUITING" as const) : ("ENGINEERING" as const),
      source: "SAMPLE" as const,
      isConnected: Boolean(p.isConnected || (p.state && CONNECTED_STATES.includes(p.state))),
    })),
  });
  const byName = new Map(contacts.map((c) => [c.fullName, c.id]));

  const tags: { contactId: string; tag: RelationshipTag; source: "RULE"; evidence?: string }[] = [];
  for (const p of PEOPLE) {
    const contactId = byName.get(p.fullName)!;
    if (myCollege && isSameInstitution(myCollege, p.school)) tags.push({ contactId, tag: "COLLEGE_ALUMNI", source: "RULE", evidence: `Both: ${myCollege}` });
    if (p.isRecruiter) tags.push({ contactId, tag: "RECRUITER", source: "RULE" });
    if (p.openToRefer) tags.push({ contactId, tag: "OPEN_TO_REFER", source: "RULE" });
  }

  const [outreach] = await Promise.all([
    prisma.outreach.createManyAndReturn({
      data: PEOPLE.map((p, i) => {
        const at = new Date(now - (p.daysAgo ?? 0) * DAY);
        const state = p.state ?? "DISCOVERED";
        return {
          userId,
          jobId: job.id,
          contactId: byName.get(p.fullName)!,
          rank: i + 1,
          state,
          stateChangedAt: at,
          lastSentAt: state === "AWAITING_REPLY" || state === "REFERRAL_RECEIVED" ? at : null,
          nextCheckAt: state === "CONNECTION_SENT" ? new Date(at.getTime() + 3 * DAY) : state === "AWAITING_REPLY" ? new Date(at.getTime() + 2 * DAY) : null,
        };
      }),
    }),
    prisma.education.createMany({
      data: PEOPLE.filter((p) => p.school).map((p) => ({ contactId: byName.get(p.fullName)!, institutionRaw: p.school! })),
    }),
    prisma.contactTag.createMany({ data: tags }),
  ]);

  const ready = outreach.filter((o) => o.state === "ACCEPTED_MESSAGE_READY");
  await prisma.$transaction(async (tx) => {
    for (const o of ready) await ensureDraft(tx, userId, o.id, "REFERRAL_REQUEST");
  });
  return { companyId: company.id, jobId: job.id };
}

export async function removeSampleData(userId: string) {
  await prisma.company.deleteMany({ where: { userId, isSample: true } });
}
