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
   Precision comes from `verifyCandidate`. Serper free plan forbids operators, so queries are plain keywords (more queries, ~8 per job).

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

14. **Rank by who actually refers a fresher, not by seniority.** (research 2026-10-21: Blind, Taro, forums, career guides; anecdotal)
    Mid-level ICs ~1–3 years in refer most and stay responsive; early-career engineers refer readily (often bonus-driven) once past ~90-day probation; seniors/staff refer selectively (reputation); directors rarely submit referrals; most recruiters can't submit internal referrals but can route; alumni reply more (one tracked sample 43% vs 34%).
    `SENIORITY_FIT`: MID 1.0, JUNIOR 0.9, SENIOR 0.8, MANAGER 0.6, STAFF 0.5, DIRECTOR 0.2, INTERN 0.1; ≤2 recruiters in the top list, labelled "can't refer, but can route you". Graduate Engineer Trainee = full-time junior, not intern.

15. **Alumni recall: more web queries, but LinkedIn's own People filter is the real fix (user paste).**
    Diagnosis on a small company (Alaan): Google returned 18 PES-mentioning profiles, none at the company; verification correctly rejected them all. For small companies alumni are scarce or not public.
    Discovery reports `alumniFound`; zero shows a "Check on LinkedIn" card. Paste supports three sources; "filtered for my college" marks everyone alum, so it's opt-in, never the default.

16. **AI-written messages: generated on demand outside DB transactions; facts-only; code-checked; template fallback.**
    Generation takes 2–5 s, so it can't hold a transaction. The model invented a job detail ("6-month internship") and a false shared college in testing.
    Prompt forbids job details not in facts; `claimsSharedCollege` + greeting/job-ID/"sender is a student" checks with one corrective retry; failed rewrites keep the user's draft. Gemini tries a model list on 429 (per-model free quotas) before Groq.

13. **Host web + API as one Render free service, kept awake by Better Stack hitting `/healthz`.**
    Render's 750 free instance-hours are shared per workspace; two always-on services would need ~1,490 h. The health route avoids the DB so Neon can still scale to zero.
    One container, one port exposed; API moved to `API_PORT`. If memory runs short, upgrade the instance rather than split services.
