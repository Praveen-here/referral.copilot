import { describe, expect, it } from "vitest";
import {
  heuristicFunction,
  heuristicSeniority,
  parseProfileResult,
  planQueries,
  scoreCandidate,
  selectTop,
  verifyCandidate,
  type Features,
} from "../src";

const ctx = { companyNames: ["HPE", "Hewlett Packard Enterprise"], university: "PES University" };
const result = (title: string, snippet: string, url = "https://in.linkedin.com/in/rahul-s-123") => ({ title, snippet, url });

describe("parse + verify", () => {
  it("reads Google's LinkedIn result format", () => {
    const p = parseProfileResult(
      result(
        "Rahul Sharma - Software Engineer - Hewlett Packard Enterprise | LinkedIn",
        "Experience: Hewlett Packard Enterprise · Education: PES University · Location: Bengaluru · 500+ connections on LinkedIn.",
      ),
    )!;
    expect(p).toMatchObject({
      url: "https://www.linkedin.com/in/rahul-s-123",
      fullName: "Rahul Sharma",
      experience: "Hewlett Packard Enterprise",
      education: "PES University",
      location: "Bengaluru",
    });
    const v = verifyCandidate(p, ctx);
    expect(v.ok && v.candidate.isAlumni).toBe(true);
  });

  it("matches school aliases and keeps unrelated schools as-is", () => {
    const alias = verifyCandidate(parseProfileResult(result("Diya R - SDE 2 - HPE | LinkedIn", "Experience: HPE · Education: PESIT · Location: Bengaluru"))!, ctx);
    expect(alias.ok && alias.candidate.isAlumni).toBe(true);
    const other = verifyCandidate(parseProfileResult(result("Arjun N - Engineer - HPE | LinkedIn", "Experience: HPE · Education: RV College of Engineering"))!, ctx);
    expect(other.ok && other.candidate.isAlumni).toBe(false);
    expect(other.ok && other.candidate.school).toBe("RV College of Engineering");
  });

  it("never invents a school", () => {
    const v = verifyCandidate(parseProfileResult(result("Meera Iyer - Software Engineer at HPE | LinkedIn", "Building cloud storage."))!, ctx);
    expect(v.ok && v.candidate.school).toBeNull();
  });

  it("rejects non-profiles, other companies and former employees", () => {
    expect(parseProfileResult({ title: "HPE | LinkedIn", snippet: "", url: "https://www.linkedin.com/company/hpe" })).toBeNull();
    const elsewhere = parseProfileResult(result("Kiran P - Engineer - Infosys | LinkedIn", "Experience: Infosys · Education: PES University"))!;
    expect(verifyCandidate(elsewhere, ctx)).toEqual({ ok: false, reason: "NOT_AT_COMPANY" });
    const former = parseProfileResult(result("Asha K - Ex-HPE | LinkedIn", "Experience: Google"))!;
    expect(verifyCandidate(former, ctx)).toEqual({ ok: false, reason: "FORMER_EMPLOYEE" });
  });

  it("does not confuse HP with HPE", () => {
    const hp = parseProfileResult(result("Sam T - Engineer - HP | LinkedIn", "Experience: HP Inc"))!;
    expect(verifyCandidate(hp, ctx).ok).toBe(false);
  });
});

describe("plan", () => {
  it("puts alumni first and uses plain keywords only (no operators)", () => {
    const qs = planQueries({ companyNames: ["HPE", "Hewlett Packard Enterprise"], location: "Bengaluru, India", roleFamily: "software engineering", contactTitles: ["Software Engineer", "Engineering Manager"], university: "PES University" });
    expect(qs[0]).toEqual({ purpose: "ALUMNI_ROLE", query: "HPE PES University Software Engineer linkedin" });
    expect(qs.some((q) => q.query.includes("PES Institute of Technology"))).toBe(true);
    expect(qs.some((q) => q.query.startsWith("Hewlett Packard Enterprise PES University"))).toBe(true);
    expect(qs.every((q) => !/["()]|site:|\bOR\b/.test(q.query))).toBe(true);
    expect(qs.find((q) => q.purpose === "ROLE")!.query).toBe("HPE Software Engineer Bengaluru linkedin");
  });
});

describe("score", () => {
  const base: Features = {
    isAlumni: false, roleRelevance: 1, seniority: "MID", function: "ENGINEERING", domainOverlap: 0.5,
    alreadyConnected: false, sameLocation: true, openToRefer: false, companyReferralBonus: false,
    recentlyContactedForOtherJob: false, previouslyDeclined: false, confidence: "WEB_EVIDENCE",
  };

  it("ranks alumni high and relevant engineers medium", () => {
    expect(scoreCandidate({ ...base, isAlumni: true }).bucket).toBe("HIGH");
    expect(scoreCandidate(base).bucket).toBe("MEDIUM");
    expect(scoreCandidate({ ...base, roleRelevance: 0, seniority: "DIRECTOR_PLUS", sameLocation: false }).bucket).toBe("LOW");
  });

  it("explains itself", () => {
    const s = scoreCandidate({ ...base, isAlumni: true }, undefined, { school: "PES University" });
    expect(s.reasons).toContain("PES University alum");
    expect(scoreCandidate({ ...base, seniority: "INTERN" }).warnings).toContain("Intern, usually can't refer");
  });

  it("caps recruiters in the top list", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: i, score: scoreCandidate({ ...base, function: "RECRUITING", isAlumni: true }) }));
    const { top } = selectTop(items, { top: 15, reserves: 10, maxRecruiters: 3 });
    expect(top).toHaveLength(3);
  });

  it("classifies titles without AI", () => {
    expect(heuristicSeniority("Senior Software Engineer")).toBe("SENIOR");
    expect(heuristicSeniority("SDE-2")).toBe("MID");
    expect(heuristicSeniority("Software Engineering Intern")).toBe("INTERN");
    expect(heuristicSeniority("Product Manager")).toBe("UNKNOWN");
    expect(heuristicFunction("Talent Acquisition Partner")).toBe("RECRUITING");
  });
});

import { cleanTitle } from "../src";

describe("titles and scoring guards", () => {
  const names = ["HPE", "Hewlett Packard Enterprise"];
  it("cleans titles", () => {
    expect(cleanTitle("Software Engineer II - Hewlett Packard Enterprise", names)).toBe("Software Engineer II");
    expect(cleanTitle("SDE 2 | Java | Microservices - HPE", names)).toBe("SDE 2");
    expect(cleanTitle("Engineer at HPE", names)).toBe("Engineer");
    expect(cleanTitle("HPE", names)).toBeNull();
    expect(cleanTitle("AI Engineer @HPE", names)).toBe("AI Engineer");
    expect(cleanTitle("Software Engineer- HPE Aruba Networking", names)).toBe("Software Engineer");
    expect(cleanTitle("Hewlett Packard Enterprise PES University", names, ["PES University"])).toBeNull();
    expect(cleanTitle("Full-Stack Developer - HPE", names)).toBe("Full-Stack Developer");
  });

  it("keeps interns and unrelated alumni below relevant engineers", () => {
    const base = {
      isAlumni: false, roleRelevance: 1, seniority: "MID" as const, function: "ENGINEERING" as const, domainOverlap: 0.5,
      alreadyConnected: false, sameLocation: true, openToRefer: true, companyReferralBonus: false,
      recentlyContactedForOtherJob: false, previouslyDeclined: false, confidence: "WEB_EVIDENCE" as const,
    };
    const engineer = scoreCandidate(base).score;
    const internAlum = scoreCandidate({ ...base, isAlumni: true, seniority: "INTERN", openToRefer: false }).score;
    const unrelatedAlum = scoreCandidate({ ...base, isAlumni: true, roleRelevance: 0, seniority: "DIRECTOR_PLUS", function: "OTHER", openToRefer: false }).score;
    expect(internAlum).toBeLessThan(engineer);
    expect(unrelatedAlum).toBeLessThan(engineer);
  });
});
