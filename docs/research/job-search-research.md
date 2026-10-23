---
name: job-search-research
description: Research notes on where genuine job/internship postings appear first, how they get posted, and who to network with for early info and referrals. Includes an action plan.
created: 2026-10-23
owner: Skanda Umesh (OneZeroLabs, Bengaluru)
---

> Saved verbatim from the user's research with Claude chat (2026-10-23). College names in "Where to find these people" are the author's own context; the app uses the college from the user's Profile. Feature ideas derived from this file are tracked in `docs/ROADMAP.md`.

# Finding Jobs/Internships Early + Getting Referrals — Research & Plan

## Context
Goal: find genuine internship/job postings at the earliest possible moment (ideally automate it), and get referrals early. Research drew on Reddit, Blind, Quora-style forums, LinkedIn, career blogs, and academic studies.

---

## Q1. Where do genuine postings appear first?

**Order a role goes through:**
1. **Internal / word of mouth (earliest).** Hiring manager gets headcount approved; team and employees know first. Roles spread via employee WhatsApp/Slack "hiring" channels and internal referral portals. Big MNCs often run an internal-only window (~1–2 weeks) before going external. Many roles (India-focused blogs estimate 40–60%; treat as rough) are filled via referrals without ever being posted publicly.
2. **ATS = careers page (first public source).** Companies publish in their Applicant Tracking System (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, etc.). The company careers page *is* the ATS feed — same source, same moment.
3. **Aggregators (secondary, delayed).** LinkedIn, Indeed, Naukri, Glassdoor copy from the ATS, typically 24–72 hrs later. Popular tech roles can get 100+ applications within the first ~6 hrs, before LinkedIn even shows them. Recruiters often stop reviewing once they find a few good early applicants.

**Ghost jobs:** Greenhouse classified ~19% of job-board ads as ghost jobs (applications received, no hiring activity). Many viral stats (e.g., "27.4% of LinkedIn jobs are ghost jobs") lack solid methodology. Best genuineness signal: live on the company ATS, recently posted, with a named team. LinkedIn sometimes keeps listings up after they're filled/removed from the company site.

---

## Q2. Who posts on the ATS and LinkedIn? Is it automated?

**ATS: a human posts it.**
- Hiring manager requests headcount → finance/HR approve (can take weeks) → recruiter/HR coordinator creates the job in the ATS (JD, location, level, screening questions) → clicks publish → careers page updates instantly.

**LinkedIn: mostly automated syndication.**
- **Auto feed (most common):** LinkedIn pulls from the ATS/careers page via XML feeds/integrations → the 24–72 hr lag.
- **ATS integration for promoted/paid posts:** recruiter ticks "post to LinkedIn" inside the ATS → pushed via partner API (faster, semi-automated).
- **Manual:** small startups posting directly, plus personal "we're hiring" posts by founders/managers/employees (sometimes before or without any ATS listing).
- **Noise:** staffing agencies/aggregators reposting → duplicates and stale listings.

**Takeaway:** the ATS publish is the one human "go" moment; everything after is a delayed copy. For roles that never reach an ATS, and for internal windows, only insiders give an early signal.

---

## Q3. Who knows about roles first, who hires, who refers?

**Who knows first:**
1. Hiring manager + their team (startups: founder/CTO).
2. Recruiters (once the requisition is approved). **Recruiters/HR generally can't refer** (conflict of interest — they screen). Use them for process questions only.
3. Everyone else at the company once it's posted internally.

**Best people to ask for referrals:**
- **Peer-level engineers on/near the hiring team.** Strongest practical option: they see internal postings, know the hiring manager, and face low friction referring. A senior person you barely know is a weaker bet.
- **Referrers who also ping the hiring manager directly.** A bare portal referral is weak; a referral plus a direct message to the HM works much better (per Blind discussions).
- **Recent joiners / campus hires.** Remember the process, motivated by referral bonuses, easier to reach.
- **Founders/CTOs at small startups.** They ARE the hiring manager; cold outreach works far better here than at large companies.

**Weak vs strong ties (research):**
- Granovetter (1973): of people who found jobs via contacts, 84% did so through people they saw only occasionally/rarely → weak ties surface information.
- Kim & Fernandez (MIT): people are more likely to pass job info to close friends than acquaintances.
- Synthesis: **weak ties get you seen, strong ties get you chosen.** Turn a few weak ties into people who've actually seen your work.

**Where to find these people (India-specific):**
- College alumni & seniors (Jain University, MLA Academy) via LinkedIn Alumni tab and WhatsApp alumni groups (WhatsApp often gets better reply rates for smaller colleges).
- Own network: OneZeroLabs clients, co-founder Tanisha's network, founders already worked with. Shipped products + running a studio is a strong, unusual card for founders hiring interns.
- Engineers who post publicly on LinkedIn/X — engage with posts for 1–2 weeks before asking anything.

**Don'ts:**
- Don't cold-email resumes to hiring managers at large companies without a connection (often annoys them); fine if you know them or have an intro.
- Never ask for a referral in the first message — ask for advice/a quick chat first, then ask with a specific Job ID.
- Have resume + LinkedIn referral-ready before asking.
- Ask early in a posting's life (within the first few days).

---

## Action Plan

### A. Automated early-posting monitor
1. Build a list of 50–150 target companies.
2. Identify each one's ATS from apply-link URLs:
   - `boards.greenhouse.io/{slug}` / `job-boards.greenhouse.io/{slug}`
   - `jobs.lever.co/{slug}`
   - `jobs.ashbyhq.com/{slug}`
   - `*.myworkdayjobs.com/...` (Workday — needs full board URL)
3. Poll public JSON endpoints hourly:
   - Greenhouse: `https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true`
   - Lever: `https://api.lever.co/v0/postings/{slug}?mode=json`
   - Ashby: `https://api.ashbyhq.com/posting-api/job-board/{slug}`
   - Recruitee: `https://{slug}.recruitee.com/api/offers/`
   - Workday: JSON endpoint behind the board URL (POST)
4. Diff against the last run → push new roles (filtered by keywords like "intern", "SDE", location Bengaluru/remote) to Telegram/email.
5. Extra non-ATS sources: founder/engineer hiring posts on X & LinkedIn, Wellfound, Internshala, Cuvette, Hacker News monthly "Who's Hiring".

### B. Referral pipeline
1. For each target company, map 2–4 people: peer engineers near the relevant team, recent joiners, alumni, and (for startups) founder/CTO.
2. Warm up: engage with their posts / ask for a short chat or advice.
3. When the monitor flags a role → message within 1–3 days with the Job ID, tailored resume, and one-line relevant proof (project/product).
4. Ask the referrer, if comfortable, to also ping the hiring manager directly.
5. Track in a sheet: company | contact | role | ask sent | referral submitted | applied | status.

### Next steps offered (not yet done)
- Write the monitoring script (Python + scheduled task + Telegram alerts) once target company list is ready.
- Draft 3 outreach templates: alumnus, peer engineer, startup founder.

---

## Key Sources
- DEV Community — companies post in ATS first; public JSON endpoints: https://dev.to/ronin13/skip-linkedinindeed-most-companies-job-boards-have-a-public-json-api-48b
- Jobstrack — LinkedIn 24–72 hr lag; early application volume: https://jobstrack.io/blog/how-to-monitor-company-career-pages
- Blind — recruiters stop after early good applicants: https://www.teamblind.com/post/a-product-to-get-you-more-interviews-yz250opl
- Blind — referral vs recruiter, ping the HM: https://www.teamblind.com/post/recruiter-vs-employee-referral-fz8qubkg
- Allwork — Greenhouse ~19% ghost jobs: https://allwork.space/2026/08/nearly-1-in-5-job-ads-may-be-fake-ghost-jobs/
- Enterprise — ghost-job stat fact-check: https://enterpriseam.com/egypt/2026/07/28/ghost-jobs-scam-listings-pipeline-plays-why-is-linkedin-full-of-postings-that-go-nowhere/
- apna.co — unadvertised jobs in India: https://apna.co/career-central/unadvertised-jobs-how-to-find-them/
- DEV — who to ask for referrals (peers > distant seniors): https://dev.to/assindo/how-to-ask-for-a-referral-without-making-it-weird-scripts-included-4lke
- PrepLounge — HR/recruiters can't refer: https://www.preplounge.com/consulting-forum/referal-22504
- Ask a Manager — contacting hiring managers directly: https://www.askamanager.org/?p=7938
- ProjectManagement.com — Granovetter weak ties: https://www.projectmanagement.com/articles/246530/strong-results-from-weak-ties
- MIT DSpace — Kim thesis on tie strength & info sharing: https://dspace.mit.edu/handle/1721.1/109653?show=full
- FACE Prep — alumni networking in India: https://faceprep.in/article/top-networking-tips-for-job-seekers/
- StylingCV — India referral practices at startups: https://stylingcv.com/in/?p=1020907
