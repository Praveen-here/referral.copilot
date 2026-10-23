# Roadmap & feature ideas

Ideas not built yet, with the research they come from. Current status lives in `docs/PROGRESS.md`.

## From `research/job-search-research.md` (early postings + referrals)
| Idea | Why (research) | Fits the app how | Constraints |
|---|---|---|---|
| **Early-posting monitor**: watch target companies' ATS feeds hourly (Greenhouse, Lever, Ashby, Recruitee, Workday JSON), alert on new intern/SDE roles in Bengaluru/remote | Roles hit the ATS first; LinkedIn copies 24–72 h later; early applicants get reviewed, recruiters stop after a few good ones | "Watchlist" of companies → new role appears as a job card ("New: posted 2 h ago") → one click adds the job and starts discovery | Needs a scheduled job: either a Render cron/external pinger hitting an endpoint (no polling worker, Neon compute) or GitHub Actions; ATS APIs only, never LinkedIn |
| **Genuineness signal** on jobs | ~19% ghost jobs; best signal = live on the company ATS, recent, named team | Badge: "Live on careers page · posted 3 d ago" vs "Only on LinkedIn" | Only for ATS-readable companies |
| **Warm-up step before the ask** | "Never ask for a referral in the first message; ask for advice/quick chat first" | Optional state between Accepted and Referral ask: "Say hi / ask for advice" draft, then the referral ask a few days later | Trade-off vs speed; make it a per-job toggle |
| **"Also ping the hiring manager"** line in the thank-you/resume message | Portal referral + direct HM message works much better (Blind) | Add an optional polite line asking the referrer to mention you to the HM | Keep it optional and soft |
| **Founder/CTO target for startups** | At small startups the founder *is* the hiring manager | Discovery query + scoring boost for founder/CTO titles when company is small | Need a "company size" signal (analysis or user flag) |
| **Ask early** nudges | Referrals matter most in a posting's first days | Today shows "Posted 2 days ago, ask now" ordering | Needs posting date (ATS gives it) |
| **Non-ATS sources** (Wellfound, Internshala, Cuvette, HN "Who's Hiring", founders' X/LinkedIn posts) | Some roles never reach an ATS | Paste-a-post → create job | No scraping; user pastes |
| **Outreach templates per person type**: alumnus, peer engineer, startup founder | Different ties, different asks | Message goals already split (alumni vs general vs recruiter); add FOUNDER | Prompt + validator work |

## Earlier backlog
- Fix known issues (see PROGRESS).
- Settings page (caps, weights, sign-off), data export / delete account.
- Analytics: acceptance/reply/referral rate, alumni vs non-alumni, by company.
- E2E tests in repo, Sentry, Gemini paid tier for privacy.
- Optional: Gmail "accepted your invitation" parsing (dropped for now by user).
