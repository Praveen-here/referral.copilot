import { describe, expect, it } from "vitest";
import { boardFromUrl, isIndiaLocation, isNewOpening, isTechRole, openingKey, parseRelativePosted, postingLevel } from "../src";

const NOW = new Date("2026-10-24T10:00:00Z");
const HOUR = 3_600_000;

describe("boardFromUrl", () => {
  it("reads boards from real apply links", () => {
    expect(boardFromUrl("https://job-boards.greenhouse.io/rubrik/jobs/7212345")).toEqual({ ats: "greenhouse", slug: "rubrik", jobId: "7212345" });
    expect(boardFromUrl("https://job-boards.eu.greenhouse.io/groww/jobs/4567")).toMatchObject({ ats: "greenhouse", slug: "groww" });
    expect(boardFromUrl("https://boards.greenhouse.io/embed/job_app?for=stripe&token=123")).toEqual({ ats: "greenhouse", slug: "stripe", jobId: "123" });
    expect(boardFromUrl("https://jobs.lever.co/hevodata/0b1c-uuid")).toEqual({ ats: "lever", slug: "hevodata", jobId: "0b1c-uuid" });
    expect(boardFromUrl("https://jobs.eu.lever.co/zeta/abc")).toMatchObject({ ats: "lever", slug: "eu/zeta" });
    expect(boardFromUrl("https://jobs.ashbyhq.com/sarvam/1f2e")).toEqual({ ats: "ashby", slug: "sarvam", jobId: "1f2e" });
    expect(boardFromUrl("https://jobs.smartrecruiters.com/BoschGroup/744000012345-sde-intern")).toEqual({
      ats: "smartrecruiters",
      slug: "BoschGroup",
      jobId: "744000012345",
    });
    expect(boardFromUrl("https://kaleris.wd501.myworkdayjobs.com/en-US/Kaleris/job/Bengaluru/Software-Engineer-Intern_R1234")).toEqual({
      ats: "workday",
      slug: "kaleris.wd501/Kaleris",
      jobId: "R1234",
    });
    expect(boardFromUrl("https://www.amazon.jobs/en/jobs/10498382/sde-intern")).toEqual({ ats: "amazon", slug: "amazon", jobId: "10498382" });
  });

  it("ignores hosts without a public feed", () => {
    expect(boardFromUrl("https://wayfair.avature.net/careers?folderId=20829")).toBeNull();
    expect(boardFromUrl("https://docs.google.com/forms/d/abc")).toBeNull();
    expect(boardFromUrl("https://www.linkedin.com/jobs/view/123")).toBeNull();
    expect(boardFromUrl("not a url")).toBeNull();
  });
});

describe("isIndiaLocation", () => {
  it("matches cities, country codes and Workday paths", () => {
    expect(isIndiaLocation(["Bengaluru-VTP, India"])).toBe(true);
    expect(isIndiaLocation(["bangalore"])).toBe(true);
    expect(isIndiaLocation(["Remote"], "IN")).toBe(true);
    expect(isIndiaLocation(["2 Locations", "/job/India-Bengaluru/PhD-Intern_JR1"])).toBe(true);
    expect(isIndiaLocation(["Gurugram"])).toBe(true);
  });
  it("rejects look-alikes and other countries", () => {
    expect(isIndiaLocation(["Indianapolis, Indiana"])).toBe(false);
    expect(isIndiaLocation(["US, CA, Santa Clara"])).toBe(false);
    expect(isIndiaLocation([null, "Remote"])).toBe(false);
  });
});

describe("isTechRole", () => {
  it("keeps engineering, data and security roles", () => {
    for (const t of ["Backend Developer Intern Devops", "Associate SDE Intern", "Security Engineer Intern", "Data Scientist Intern", "Frontend Apprentice", "SWE PhD Intern"])
      expect(isTechRole(t), t).toBe(true);
  });
  it("drops business roles", () => {
    for (const t of ["Financial Analyst Intern", "Sales Engineer", "Talent Acquisition Intern", "Apprentice Operations India 2026", "Account Executive", "Security Settlements_ Associate_Core Services", "Associate Technical Writer", "Associate Industrial Engineer"])
      expect(isTechRole(t), t).toBe(false);
  });
});

describe("postingLevel", () => {
  it("finds interns and entry-level roles", () => {
    expect(postingLevel("Software Engineer, Intern")).toBe("INTERN");
    expect(postingLevel("NVIDIA 2027 Internships: Hardware Verification")).toBe("INTERN");
    expect(postingLevel("Software Development Engineer I")).toBe("ENTRY");
    expect(postingLevel("SDE-1 Backend")).toBe("ENTRY");
    expect(postingLevel("Associate Software Engineer")).toBe("ENTRY");
    expect(postingLevel("Graduate Engineer Trainee")).toBe("ENTRY");
    expect(postingLevel("Backend Developer")).toBe("UNSPECIFIED");
    expect(postingLevel("Platform Engineer", { intern: true })).toBe("INTERN");
  });
  it("leaves out experienced roles", () => {
    for (const t of ["Senior Software Engineer", "Software Engineer II", "Staff Engineer", "Engineering Manager", "SDE 2", "Software Engineer (5+ years)"])
      expect(postingLevel(t), t).toBeNull();
  });
});

describe("parseRelativePosted", () => {
  it("turns Workday's relative dates into dates", () => {
    expect(parseRelativePosted("Posted Today", NOW)).toEqual(NOW);
    expect(parseRelativePosted("Posted Yesterday", NOW)?.getTime()).toBe(NOW.getTime() - 24 * HOUR);
    expect(parseRelativePosted("Posted 3 Days Ago", NOW)?.getTime()).toBe(NOW.getTime() - 72 * HOUR);
    expect(parseRelativePosted("Posted 30+ Days Ago", NOW)?.getTime()).toBe(NOW.getTime() - 720 * HOUR);
    expect(parseRelativePosted(undefined, NOW)).toBeNull();
  });
});

describe("isNewOpening", () => {
  const ago = (h: number) => new Date(NOW.getTime() - h * HOUR);
  it("is new when first seen recently, or when the feed dates it recently", () => {
    expect(isNewOpening({ firstSeenAt: ago(5), postedAt: null, isBaseline: false }, NOW)).toBe(true);
    expect(isNewOpening({ firstSeenAt: ago(1), postedAt: ago(30), isBaseline: true }, NOW)).toBe(true);
  });
  it("is not new on a board's first scan, when old, or when the feed dates it old", () => {
    expect(isNewOpening({ firstSeenAt: ago(1), postedAt: null, isBaseline: true }, NOW)).toBe(false);
    expect(isNewOpening({ firstSeenAt: ago(100), postedAt: null, isBaseline: false }, NOW)).toBe(false);
    expect(isNewOpening({ firstSeenAt: ago(1), postedAt: ago(24 * 20), isBaseline: false }, NOW)).toBe(false);
  });
});

it("openingKey matches the same role across sources", () => {
  expect(openingKey(" Standard Chartered ", "Software Engineer Intern ")).toBe(openingKey("Standard Chartered", "Software Engineer - Intern"));
});
