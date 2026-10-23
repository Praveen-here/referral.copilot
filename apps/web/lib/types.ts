import type { Attention, OutreachState, PipelineTab } from "@rc/core";

export interface Person {
  id: string;
  version: number;
  state: OutreachState;
  tab: PipelineTab;
  rank: number | null;
  isReserve: boolean;
  matchScore: number | null;
  followupCount: number;
  lastSentAt: string | null;
  stateChangedAt: string;
  nextCheckAt: string | null;
  attention: Attention | null;
  reasons: string[];
  isAlumni: boolean;
  contact: {
    id: string;
    fullName: string;
    currentTitle: string | null;
    linkedinUrl: string | null;
    location: string | null;
    school: string | null;
    isConnected: boolean;
    source: string;
  };
  draft: { id: string; kind: string; body: string; source?: string } | null;
  job?: { id: string; title: string; companyId: string; companyName: string };
}

export interface Job {
  id: string;
  title: string;
  externalJobId: string | null;
  url: string | null;
  location: string | null;
  descriptionRaw: string | null;
  status: "ACTIVE" | "APPLIED" | "CLOSED" | "ARCHIVED";
  companyId: string;
  createdAt: string;
  company: { id: string; name: string; isSample: boolean };
  analysis: {
    roleFamily: string;
    requiredSkills: string[];
    domains: string[];
    recommendedContactTitles: string[];
  } | null;
}

export interface JobDetail {
  job: Job;
  people: Person[];
  counts: Record<PipelineTab, number>;
}

export interface SidebarCompany {
  id: string;
  name: string;
  isSample: boolean;
  jobs: { id: string; title: string }[];
  attentionCount: number;
}

export interface Budget {
  sentToday: number;
  sentWeek: number;
  dailyCap: number;
  weeklyCap: number;
}

export interface Today {
  messageReady: Person[];
  followUps: Person[];
  checkReplies: Person[];
  checkAccepted: Person[];
  cleanup: Person[];
  budget: Budget;
}

export interface Me {
  user: { id: string; name: string; email: string; image: string | null };
  profile: {
    degree: string | null;
    field: string | null;
    graduationYear: number | null;
    currentSemester: number | null;
    skills: string[];
    projects: { oneLiner?: string }[];
    resumeUrl: string | null;
    linkedinUrl: string | null;
    settings: { signOffName?: string | null };
  } | null;
  university: string | null;
  onboarded: boolean;
}

export type OpeningLevel = "INTERN" | "ENTRY" | "UNSPECIFIED";

export interface Opening {
  id: string;
  companyName: string;
  title: string;
  location: string | null;
  url: string;
  level: OpeningLevel;
  /** Which feed it came from: greenhouse, lever, ashby, smartrecruiters, workday, amazon, debugwithshubham. */
  source: string;
  alsoOnAggregator: boolean;
  postedAt: string | null;
  firstSeenAt: string;
  isNew: boolean;
  salary: string | null;
  workType: string | null;
  /** Set once the user added it as a job. */
  jobId: string | null;
}

export interface Openings {
  lastScanAt: string | null;
  scanning: boolean;
  boardCount: number;
  counts: { new: number; intern: number; entry: number; all: number };
  items: Opening[];
}
