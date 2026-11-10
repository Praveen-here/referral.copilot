import { describe, expect, it } from "vitest";
import { dedupeCombinedPeople, renderTemplate, roleFact, rolesPhrase, sharedCity, validateMessage, type FactSheet } from "../src";

const hpe = (title: string, id: string | null, url: string | null, location = "Bengaluru, Karnataka, India") =>
  roleFact({ title, externalJobId: id, url, location });

describe("combined roles", () => {
  it("keeps only real job IDs and the city", () => {
    expect(hpe("College Intern", "1211844", "https://hpe.wd5.myworkdayjobs.com/x/1211844")).toEqual({
      title: "College Intern",
      jobId: "1211844",
      url: "https://hpe.wd5.myworkdayjobs.com/x/1211844",
      city: "Bengaluru",
    });
    // A LinkedIn posting number is not the company's job ID.
    const li = roleFact({ title: "SDE Intern", externalJobId: "4471337817", url: "https://www.linkedin.com/jobs/view/4471337817", location: null });
    expect(li.jobId).toBeNull();
  });

  it("names roles and a shared city", () => {
    const a = hpe("College Intern", "1", null);
    const b = hpe("External Intern", "2", null);
    const c = hpe("SDE Intern", null, null, "Hyderabad");
    expect(rolesPhrase([a])).toBe("the College Intern role");
    expect(rolesPhrase([a, b])).toBe("the College Intern and External Intern roles");
    expect(rolesPhrase([a, b, c])).toBe("the College Intern, External Intern and SDE Intern roles");
    expect(sharedCity([a, b])).toBe("Bengaluru");
    expect(sharedCity([a, c])).toBeNull();
  });

  it("shows each person once across combined roles, keeping the furthest conversation", () => {
    const rows = [
      { id: "a1", contactId: "amit", jobId: "lead", state: "DISCOVERED" },
      { id: "a2", contactId: "amit", jobId: "other", state: "DISCOVERED" },
      { id: "b1", contactId: "bina", jobId: "lead", state: "DISCOVERED" },
      { id: "b2", contactId: "bina", jobId: "other", state: "CONNECTION_SENT" },
      { id: "c2", contactId: "chen", jobId: "other", state: "DISCOVERED" },
      { id: "d1", contactId: "dev", jobId: "lead", state: "AWAITING_REPLY" },
      { id: "d2", contactId: "dev", jobId: "other", state: "CONNECTION_SENT" },
      { id: "e1", contactId: "esha", jobId: "lead", state: "SKIPPED" },
      { id: "e2", contactId: "esha", jobId: "other", state: "DISCOVERED" },
      { id: "f1", contactId: "farah", jobId: "lead", state: "DISCOVERED", isReserve: true },
      { id: "f2", contactId: "farah", jobId: "other", state: "DISCOVERED", isReserve: false },
    ];
    const kept = dedupeCombinedPeople(rows, () => "lead", (r) => r.jobId === "lead").map((r) => r.id);
    expect(kept).toEqual(["a1", "b2", "c2", "d1", "e2", "f2"]);
  });

  it("dedupes within each combined group only", () => {
    const rows = [
      { contactId: "amit", group: "g1", lead: true, state: "CONNECTION_SENT" },
      { contactId: "amit", group: "g1", lead: false, state: "CONNECTION_SENT" },
      { contactId: "amit", group: "g2", lead: true, state: "CONNECTION_SENT" },
    ];
    const kept = dedupeCombinedPeople(rows, (r) => r.group, (r) => r.lead);
    expect(kept).toEqual([rows[0], rows[2]]);
  });

  it("writes one referral request asking about every role", () => {
    const f: FactSheet = {
      contactFirstName: "Amit",
      companyName: "HPE",
      jobTitle: "College Intern",
      sharedInstitution: "PESU",
      userDegree: "MCA",
      signOffName: "Praveen",
      roles: [
        hpe("College Intern", "1211844", "https://example.com/1211844"),
        hpe("External Intern", null, "https://example.com/ext"),
      ],
    };
    const body = renderTemplate("REFERRAL_REQUEST", f);
    expect(body).toContain("two openings at HPE in Bengaluru:");
    expect(body).toContain("College Intern, Job ID: 1211844\nExternal Intern\n");
    expect(body).toContain("either of these roles");
    expect(body).toContain("Here are the job links:\nhttps://example.com/1211844\nhttps://example.com/ext");
    expect(validateMessage(body, { contactFirstName: "Amit", maxWords: 130 })).toEqual([]);

    expect(renderTemplate("FOLLOW_UP_2", f)).toContain("the College Intern and External Intern roles at HPE");
    expect(renderTemplate("RESUME_SHARE", { ...f, resumeUrl: "https://r" })).toContain("The Job IDs are College Intern: 1211844.");
  });

  it("leaves single-role messages unchanged", () => {
    const f: FactSheet = { contactFirstName: "Amit", companyName: "HPE", jobTitle: "College Intern", jobId: "1", signOffName: "P" };
    expect(renderTemplate("REFERRAL_REQUEST", { ...f, roles: [hpe("College Intern", "1", null)] })).toBe(renderTemplate("REFERRAL_REQUEST", f));
  });
});
