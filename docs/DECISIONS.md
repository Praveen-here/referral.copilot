# Decisions

Format: **Decision** / Reason / Consequence. Newest last.

1. **No LinkedIn automation or scraping; user performs every LinkedIn action.**
   LinkedIn's User Agreement §8.2 and its prohibited-software policy ban it, and the penalty is account restriction.
   Connecting, accepting checks, messaging and reply checks are one-click manual steps. No pre-filled LinkedIn message URL exists, so we use copy + open profile.

2. **Deterministic workflow + LLM only inside specific steps (no agent loop).**
   Every step has a known trigger; predictability, testability and cost.
   The state machine in `packages/core` is the source of truth; the LLM never decides state.

3. **Modular monolith: Express API + Next web, shared packages; Next proxies `/api`.**
   User chose Express; proxying keeps auth cookies first-party with no CORS.
   Two processes in dev; Google redirect URI is on :3000.

4. **Neon Postgres, no queue/worker, reminders computed on read.**
   Neon free tier scales to zero; a polling worker would burn the compute quota. Supabase pauses idle projects.
   Discovery runs in-process (lost on restart, user retries). Add a queue only for multi-user or truly scheduled work.

5. **Google sign-in only, Better Auth with DB sessions + 5-min cookie cache.**
   Simple for a personal app; sessions are revocable. Cookie cache saves ~150 ms DB round trips.
   OAuth app in Google "testing" mode: only listed test users can log in.

6. **Gemini primary, Groq fallback, rule-based fallback after that.**
   User's choice of providers; free tiers hit rate limits. `gemini-3.5-flash` with minimal thinking measured ~2 s vs 4–19 s for flash-lite.
   Free-tier Gemini data may be used by Google; send minimal personal data, enable billing for paid-tier terms when relied on.

7. **People search via Serper (Google results), not Gemini Search grounding.**
   Grounding returned 429 on every model for this key and is unreliable even on paid tiers; Google's LinkedIn result titles/snippets are structured and verifiable in code.
   Precision comes from `verifyCandidate`. Serper free plan forbids most operators (`OR` between `site:` filters, any `site:` query with `num` 20; `site:` alone works at ≤10 results, checked 2026-10-25), so people queries are plain keywords (more queries, ~8 per job).

8. **Verify, don't trust: every candidate needs source evidence.**
   Hallucinated people or schools would put false claims into messages.
   Keep only results showing the company in Experience/title; reject `ex-`/former; school only from source text; "school unknown" otherwise.

9. **Explainable weighted scoring, alumni-heavy, with guards.**
   Research (Blind/Taro/forums): shared school is the strongest lever; mid-level engineers refer most; interns can't refer.
   Weights in `core/discovery/score.ts`; intern ×0.4, unrelated function ×0.75, ≤3 recruiters in top 15; sort by uncapped score.

10. **Messages: short, human, no em dashes, enforced in code.**
    Em dashes and stock phrases read as AI-written; models emit them despite prompts.
    `stripDashes` + `validateMessage` run on every draft and edit; templates are the fallback (currently the only writer).

11. **Optimistic UI + undo instead of confirmations.**
    apple-design principle: respond on press; forgiveness over dialogs; Neon latency made clicks feel slow.
    Client applies `transition()` locally, server reconciles; one toast at a time so Undo is unambiguous; server keeps `version` for conflicts.

12. **Invite pacing: 15/day, 100/week defaults.**
    LinkedIn reportedly allows ~100/week; the user chose the full weekly ceiling.
    Stale-invite (21 days) withdraw suggestions matter more because there is no safety margin.

13. **Host web + API as one Render free service, kept awake by Better Stack hitting `/healthz`.**
    Render's 750 free instance-hours are shared per workspace; two always-on services would need ~1,490 h. The health route avoids the DB so Neon can still scale to zero.
    One container, one port exposed; API moved to `API_PORT`. If memory runs short, upgrade the instance rather than split services.

14. **Rank by who actually refers a fresher, not by seniority.** (research 2026-10-21: Blind, Taro, forums, career guides; anecdotal)
    Mid-level ICs ~1–3 years in refer most and stay responsive; early-career engineers refer readily (often bonus-driven) once past ~90-day probation; seniors/staff refer selectively (reputation); directors rarely submit referrals; most recruiters can't submit internal referrals but can route; alumni reply more (one tracked sample 43% vs 34%).
    `SENIORITY_FIT`: MID 1.0, JUNIOR 0.9, SENIOR 0.8, MANAGER 0.6, STAFF 0.5, DIRECTOR 0.2, INTERN 0.1; ≤2 recruiters in the top list, labelled "can't refer, but can route you". Graduate Engineer Trainee = full-time junior, not intern.

15. **Alumni recall: more web queries, but LinkedIn's own People filter is the real fix (user paste).**
    Diagnosis on a small company (Alaan): Google returned 18 PES-mentioning profiles, none at the company; verification correctly rejected them all. For small companies alumni are scarce or not public.
    Discovery reports `alumniFound`; zero shows a "Check on LinkedIn" card. Paste supports three sources; "filtered for my college" marks everyone alum, so it's opt-in, never the default.

16. **AI-written messages: generated on demand outside DB transactions; facts-only; code-checked; template fallback.**
    Generation takes 2–5 s, so it can't hold a transaction. The model invented a job detail ("6-month internship") and a false shared college in testing.
    Prompt forbids job details not in facts; `claimsSharedCollege` + greeting/job-ID/"sender is a student" checks with one corrective retry; failed rewrites keep the user's draft. Gemini tries a model list on 429 (per-model free quotas) before Groq.

17. **Messages follow the user's reference shape; only real job IDs are quoted.**
    User rejected generic AI phrasing and a message that quoted LinkedIn's posting number as "job ID" without naming the company.
    Prompt encodes the user's template (`docs/PREFERENCES.md`); `companyJobId()` drops IDs equal to the LinkedIn posting number; checks require company name + "Here's the job link:" and forbid "job ID" when none is known; layout tidied in code.

18. **One Neon branch (`production`) shared by local and Render.**
    The `dev` branch was deleted (cause unclear; Neon doesn't auto-delete) with 5 companies of data; free plan can't restore deleted branches.
    Keep a single branch to avoid split data; consider a periodic export (pg_dump) before risky changes.

19. **Read every public job feed, not only Greenhouse/Lever.** (user, 2026-10-24: "grab almost all the opportunity out there")
    Research found Greenhouse+Lever+Ashby+Workday reach ~40–50% of well-known Indian companies; limiting to two systems missed most of them.
    Readers in `services/feeds.ts` for Greenhouse, Lever, Ashby, SmartRecruiters, Workday CXS, amazon.jobs and debugwithshubham.com. Still never LinkedIn automation, logins, bot-check bypasses, or sites whose terms ban crawling (Naukri, Internshala, Unstop; Darwinbox sits behind Cloudflare). Boards come from real links (seed list, user's job URLs, aggregator apply links), never guessed from names: guessed slugs matched unrelated companies 10+ times.

20. **Early job alerts: scan on open + optional outside cron, first-seen diffing, shared public tables.**
    No polling worker (#4). A scan starts when `/openings` is requested and the last scan is >2 h old, or when an outside scheduler calls `/api/cron/openings` (needs `CRON_SECRET`). All feeds are read concurrently (≤4 per job system, 2 for Workday), IDs diffed in memory, then one batched transaction.
    "New" = first seen in the last 3 days (not on a board's first scan) or dated by the feed within 2 days. `job_board`/`job_posting` are public data shared by all users (an exception to per-user scoping); what a user did with a posting is per user in `posting_action`. Only India tech roles at intern/entry/unspecified level are stored; an intern, apprentice or graduate program whose title names no field counts as tech unless it names a business function (user, 2026-10-25: don't drop "Grad Intern" for lacking a tech word).

21. **Show debugwithshubham.com's hand-curated list too.** (user approved, 2026-10-24)
    Reverse-engineering showed it's a Next.js page over a public FastAPI `/api/jobs/` list that an admin fills by hand (batched timestamps, form defaults, untrimmed names). Its apply links also reveal company boards to watch directly.
    Read at most 3 pages per scan, personal use only, never republished; each row links to the source. Their "posted" time is when they added it, not when the company posted it, so the company's own board copy wins in de-duplication.

22. **No Reddit API, no user passwords; Reddit/LinkedIn/X content only via Google results or user pastes.**
    Reddit closed self-service API access (Responsible Builder Policy, Nov 2025); new Data API apps are for moderation use cases only, and the user's use isn't one. LinkedIn bans automation even on the user's own login, and a ban would cost the account used for outreach.
    Research uses Claude's web search; in-app, prefer paste-a-post over Serper post searches (Google indexes only a small, popularity-biased slice of posts).

23. **Find missing job boards by web search, then verify; don't copy intern-list.com.** (user, 2026-10-25)
    intern-list.com (run by Jobright.ai) is a Webflow page embedding ~31 public Airtable shared views; a script rebuilds each table daily from Jobright's own US job index (all rows recreated within ~1 min, apply links go to `jobright.ai/jobs/info/...`). It has no India roles (its 18 "India" matches were Indiana), so it isn't a source. What it does have is coverage: the gap is boards we don't know, not a cleverer fetch.
    `services/board-finder.ts` searches `"<company> India site:<job system host>"` (Serper free plan allows `site:` only with ≤10 results), parses result links with `boardFromUrl`, keeps a board only if its tenant/slug matches the company (`boardMatchesCompany`: AMD's search returns Avnet's Workday first) and its feed answers. These are real links, so #19's no-guessing rule holds. Run once over the research CSV (`src/scripts/find-boards.ts`, 2026-10-25): 100 companies, 11 verified boards, 10 seeded (Qualcomm's `wd12/External` answers but is empty). The rest have no public feed (own sites, Darwinbox, Keka, TurboHire, YC/Wellfound); their careers pages are JS-rendered and expose no board links.
    Jobright itself (job page `__NEXT_DATA__`, founder interviews in The Register 2025 / TechCrunch 2024): crawls ATS feeds, career sites and boards (~400k posts/day claimed), tags each job with `countryCode`, and runs every description through an LLM (normalized title, seniority, skills, salary range, H-1B/citizen/clearance flags). US-only by choice: the product is built around US visa sponsorship, and the founders say other countries come later. Only the seniority/eligibility part is worth having here (ROADMAP "Description check").

24. **No automatic acceptance/reply checking; Today drops follow-ups and checks.** (user, 2026-10-29)
    Checking each profile by hand piled up. Researched alternatives: LinkedIn's Invitations and Messages APIs are partner-only; unofficial APIs (Unipile, Linked API) and having the app open profiles in the user's session are scraping under User Agreement §8.2, are easy to detect (regular repeat profile views) and show up in the recipient's "Who viewed your profile"; LinkedIn sued Proxycurl (shut July 2025) and ProAPIs (Oct 2025). Acceptance emails are not sent for every acceptance and no setting forces them (only in-app/push notifications are reliable). Copy-pasting the Connections page doesn't work on mobile.
    Today shows only Messages ready and Clean up. Proposed next: user shares the profile from LinkedIn's acceptance notification to the app (PROGRESS Next #0).

25. **Badge = messages waiting to be sent; conversations live in a chat sheet; nothing asks the user to check.** (user, 2026-10-29)
    Checks and follow-up reminders piled up. A badge that means one thing ("N messages written, just send them") is actionable; cleanup items are never urgent so they don't count.
    `readyToSend` (core) drives the badge and Today's "Messages ready". Awaiting reply groups by `conversationGroup` (Talking / Waiting / Gone quiet after 14 silent days; display only, no state writes). Follow-ups only on "Nudge" and from the template (no AI call). Replies are pasted into a per-person chat; the AI sees the last 10 messages; "I sent something else" keeps the thread true when the user writes their own message.
