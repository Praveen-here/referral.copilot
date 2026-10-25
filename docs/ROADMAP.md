# Roadmap & feature ideas

Ideas not built yet, with the research they come from. Current status lives in `docs/PROGRESS.md`.

## From `research/job-search-research.md` (early postings + referrals)
| Idea | Why (research) | Fits the app how | Constraints |
|---|---|---|---|
| **Early-posting monitor** (built 2026-10-24 as Openings, with cron-job.org every 2 h; still to do: Recruitee/Keka/Zoho/Rippling readers): watch target companies' ATS feeds hourly (Greenhouse, Lever, Ashby, Recruitee, Workday JSON), alert on new intern/SDE roles in Bengaluru/remote | Roles hit the ATS first; LinkedIn copies 24–72 h later; early applicants get reviewed, recruiters stop after a few good ones | "Watchlist" of companies → new role appears as a job card ("New: posted 2 h ago") → one click adds the job and starts discovery | Needs a scheduled job: either a Render cron/external pinger hitting an endpoint (no polling worker, Neon compute) or GitHub Actions; ATS APIs only, never LinkedIn |
| **Genuineness signal** on jobs | ~19% ghost jobs; best signal = live on the company ATS, recent, named team | Badge: "Live on careers page · posted 3 d ago" vs "Only on LinkedIn" | Only for ATS-readable companies |
| **Warm-up step before the ask** | "Never ask for a referral in the first message; ask for advice/quick chat first" | Optional state between Accepted and Referral ask: "Say hi / ask for advice" draft, then the referral ask a few days later | Trade-off vs speed; make it a per-job toggle |
| **"Also ping the hiring manager"** line in the thank-you/resume message | Portal referral + direct HM message works much better (Blind) | Add an optional polite line asking the referrer to mention you to the HM | Keep it optional and soft |
| **Founder/CTO target for startups** | At small startups the founder *is* the hiring manager | Discovery query + scoring boost for founder/CTO titles when company is small | Need a "company size" signal (analysis or user flag) |
| **Ask early** nudges | Referrals matter most in a posting's first days | Today shows "Posted 2 days ago, ask now" ordering | Needs posting date (ATS gives it) |
| **Non-ATS sources** (Wellfound, Internshala, Cuvette, HN "Who's Hiring", founders' X/LinkedIn posts) | Some roles never reach an ATS | Paste-a-post → create job | No scraping; user pastes |
| **Outreach templates per person type**: alumnus, peer engineer, startup founder | Different ties, different asks | Message goals already split (alumni vs general vs recruiter); add FOUNDER | Prompt + validator work |

## From research 2026-10-24 (`docs/research/reports/`)
| Idea | Why (research) | Fits the app how | Constraints |
|---|---|---|---|
| **Paste a hiring post** (LinkedIn/X "we're hiring interns") | Founders post roles that never reach a job board (Puch AI, Smallest AI on X); Google indexes only ~10% of LinkedIn posts, so searching for posts wastes Serper credits | Paste → AI extracts company, role, how to apply, poster → job created, poster added as top contact | User pastes; never fetch LinkedIn/X |
| **Scam check** on pasted posts/openings | ~20% of Indian postings suspected fake; pattern: "comment interested" → DM → fee via UPI/Telegram | Warning badge with the reasons | Rules first (fee, Telegram/WhatsApp-only, no company site), AI optional |
| **Warm-up step**: react/comment on their post before connecting | LinkedIn India Gen Z data (Sep 2026): engaging first makes a request ~3× and a message ~5× more likely to be accepted/answered | Optional "warm up" checklist item before "Connect" | Manual on LinkedIn |
| **Founder email path** for startups under ~50 people | Small startups have no referral programme; founder = hiring manager; cold email works best with a project link | Draft a short email to founder/CTO; company size from job analysis or user | Only verified addresses the user supplies or finds |
| **Contact source tagging + reply rate by channel** | No published India data on which channel gets replies | Tag alumni / post / founder / recruiter; analytics later | |
| **Funded-startup tracker** | Funding is a weak signal alone; strong when the board shows new India roles after the round | Read Inc42 `/buzz/feed/`, Entrackr `/rss`, YourStory `/feed`, ET Tech RSS; match to boards; rank up when new postings follow | Store extracted facts + links only (Inc42 robots blocks AI crawlers) |
| **Hiring contests list** (Flipkart GRiD, Juspay Hiring Challenge, …) | Big intern hirers use contests, not job boards; finalists get interviews | A small curated list with dates on Openings | Manual curation |
| **Job-alert emails** (LinkedIn, Internshala, Naukri) | Those sites forbid crawling but email alerts to the user | Read-only Gmail → openings | User hasn't decided; needs an extra Google scope |
| **HN "Who's Hiring"** via Algolia API | ~5 India-open roles a month, mostly senior | Low priority | |

## From the intern-list.com / Jobright.ai analysis (2026-10-25, DECISIONS #23)
| Idea | Why | Fits the app how | Constraints |
|---|---|---|---|
| **Description check for openings** (Jobright's "AI step", cut down) | 496 of 745 open openings (67%, 2026-10-25) are UNSPECIFIED: the title names no level, and many are experienced roles (Salesforce "LMTS"). Only the description says "3+ years" or "2026 batch only" | Fetch descriptions for new UNSPECIFIED/ambiguous roles (Lever, Ashby: already in the list call; Greenhouse: `?content=true`; Workday, SmartRecruiters: one request per job) → regex rules in `core` for years of experience, batch/graduation year, stipend → AI only for what rules can't settle → result in `job_posting.extra` (no migration) → "Experienced" hidden by default, eligibility badge | Free tiers: one-time ~500 backlog, then ~10–60 roles/day, 15–20 per AI call ≈ 1–5 calls/day. Use the lite fallback model or Groq so message drafting keeps the main Gemini quota; background after a scan, never blocking; one batched write |
| Not worth copying from Jobright | Skill-match scores, summaries, H-1B/clearance/citizen flags, USD salary normalization, employee "connections" | Discovery already finds referrers (alumni first); the user reads the description when adding the job | |
| **Board finder on job add** | `board-finder.ts` works per company; companies the user targets later aren't watched unless their job link is an ATS link | When a job's company has no watched board, run the finder in the background | ~1–3 Serper searches per new company; needs a `BoardOrigin` value (`SEARCH`) + migration |

## Earlier backlog
- Fix known issues (see PROGRESS).
- Settings page (caps, weights, sign-off), data export / delete account.
- Analytics: acceptance/reply/referral rate, alumni vs non-alumni, by company.
- E2E tests in repo, Sentry, Gemini paid tier for privacy.
- Optional: Gmail "accepted your invitation" parsing (dropped for now by user).
