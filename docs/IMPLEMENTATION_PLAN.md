# Referral Copilot: Implementation Plan

> **Historical spec and research.** Partly superseded by what was built. For the current state read `CLAUDE.md` → `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`. Use this file only for product intent and the research background (§9.2, §10.1, sources).

Status: planning only, no code yet. Every decision below states **why**. When a decision changes, update this file before you change the code.

Last updated: 2026-10-20

---

## 0. Scope decisions (current)

The first version is intentionally simple. **The one thing it must do really well is find the right people.**

| Area | v1 decision |
|---|---|
| Finding people | **Automatic.** Paste a job URL → the agent finds the **top 15** people most likely to refer you for that role, with reasons. Optional: paste a LinkedIn People-tab page to improve results. |
| Connecting | **Manual.** `[Open LinkedIn]` opens the profile in a new tab → you click Connect → `[✓ Request sent]`. |
| Checking acceptance | **Manual.** Pending tab → `[Open LinkedIn]` → if you see "Message", click `[✓ Accepted]`. |
| Referral message | **AI-drafted instantly** when you mark someone accepted. `[Copy message & open LinkedIn]` copies the message and opens the profile → Message → Ctrl+V → Send → `[✓ Message sent]`. |
| Replies | **Manual.** "Awaiting reply" tab → `[Open LinkedIn]` → one-click outcome. The app reminds you when to check and drafts follow-ups. |
| AI | **Gemini (primary)** + **Groq (fallback)**. |
| Database | **PostgreSQL on Neon (free tier).** |
| Not in v1 | Gmail reading, LinkedIn data-archive import, background job queue, email notifications, paid people-data APIs. |

**Why manual LinkedIn steps:** LinkedIn's User Agreement (§8.2) and its "Prohibited software and extensions" policy ban tools that scrape LinkedIn or automate connecting and messaging, and the penalty is account restriction. The app does all the thinking and remembering, and the user does the few clicks on LinkedIn itself.

**Why no pre-filled LinkedIn message:** LinkedIn has no supported URL that opens a chat with text already typed in, and typing into LinkedIn's page from our app would count as prohibited automation. Copy, then paste with Ctrl+V, costs about 3 seconds.

---

## 1. Product architecture

A personal referral CRM with an AI research layer.

| Area | Responsibility | AI involvement |
|---|---|---|
| **Jobs** | Opportunities, their analysis, and their status | Reads the job posting and extracts its structure |
| **Discovery** | Find and rank the top 15 people per job | Web-grounded search, extraction, verification, ranking features |
| **Pipeline** | One outreach per (person, job): state, messages, check dates | Writes messages; optionally interprets a pasted reply |
| **Today** | What needs attention now | None (computed from dates and states) |

**Core loop:**

```
Paste job URL (10s)
→ AUTO: read posting → analyze role → discover people → verify → rank → top 15 with reasons
→ OPTIONAL (~15s): open a People-tab link, Ctrl+A, Ctrl+C, paste once → better results
→ YOU (~10s each): [Open LinkedIn] → Connect → [✓ Request sent]        (invite budget shown)
→ YOU, any time: Pending tab → [Open LinkedIn] → "Message" visible? → [✓ Accepted]
→ AUTO: referral draft ready instantly (alumni vs non-alumni version)
→ YOU (~5s): [Copy message & open LinkedIn] → Message → Ctrl+V → Send → [✓ Message sent]
→ AUTO: "check for reply" reminders on day 2 and day 5, follow-up drafts
→ YOU: Awaiting-reply tab → [Open LinkedIn] → read → one-click outcome
```

**Product principle:** quality over volume. The app caps outreach at 15 people per job, contacts them in waves, and enforces an invite budget. Five well-chosen alumni beat thirty cold requests, and this also protects the user's LinkedIn account.

---

## 2. System architecture

```
┌──────────────────────┐  HTTPS   ┌─────────────────────────────────────┐
│ apps/web (Next.js)   │ ───────▶ │ apps/api (Express)                  │
│ React + Tailwind     │  cookie  │  routes → services → core (pure)    │
│ TanStack Query       │  session │            │         └─ ai (Gemini/Groq)
└──────────────────────┘          │            └─ db (Prisma)           │
                                  └──────┬───────────────┬──────────────┘
                                         ▼               ▼
                                 ┌──────────────┐  ┌───────────────────────────┐
                                 │ Neon Postgres│  │ Gemini API (primary,      │
                                 │ (free tier)  │  │  + Google Search grounding)│
                                 └──────────────┘  │ Groq API (fallback)       │
                                                   └───────────────────────────┘
```

**Decisions:**

- **Express API + Next.js web,** as you chose. Business logic lives in shared packages, so the split costs little.
- **No job queue or worker in v1.** In the earlier design, a pg-boss worker would poll Postgres every few seconds. On Neon's free tier that keeps the database awake around the clock and burns the monthly compute allowance (§5.4). v1 doesn't need one:
  - **Reminders are computed when the page loads,** not by scheduled jobs. "Check reply on day 2/5", "follow-up due" and "invite pending 21 days" are queries over `next_check_at` and the state timestamps. Nothing needs to wake up.
  - **Discovery** (~20–60 s) runs as an in-process async task that writes progress to a `discovery_runs` row, and the UI polls that row. If the server restarts mid-run, the run is marked failed and the user clicks "Retry". That's acceptable for a single-user app.
  - *When to add a queue:* when there are multiple users or truly scheduled work, such as emails. The `Queue` interface can be added then without touching domain code.
- **A sleeping API server is fine.** Since nothing is scheduled, a free host that sleeps when idle only costs a few seconds of cold start on the first request.
- **Modular monolith.** One developer, one domain. Package boundaries instead of network boundaries.

---

## 3. Frontend architecture

**Stack:** Next.js (App Router), React, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod.

**Why TanStack Query:** the data sits behind a separate API that uses cookies. Client-side fetching with **refetch on window focus** means that when you come back from a LinkedIn tab, the page is already up to date.

**Routes:**

| Route | Purpose |
|---|---|
| `/today` (home) | Accepted → message ready; replies to check today; follow-ups due; invites to withdraw |
| `/jobs` | Active jobs with pipeline counts |
| `/jobs/new` | Paste job URL → auto-read (or paste JD) → editable analysis → save → discovery starts |
| `/jobs/[id]` | Analysis, discovery progress, top 15, invite budget bar, pipeline tabs |
| `/people/[id]` | Person detail, history across all jobs, notes |
| `/profile` | Your profile: university, degree, skills, projects, resume link, preferences |
| `/settings` | Ranking weights, invite budget, follow-up timing, data export/delete |

**Job page pipeline tabs:** `To connect (15)` → `Pending` → `Accepted, message ready` → `Awaiting reply` → `Done`

**Each row has:** name, title, a 🎓 alumni badge, score, "why" reasons, `[Open LinkedIn]`, and the one-click status buttons for that tab. There's also `✗ Wrong person / left company`, which removes the row and moves #16 up.

**Speed features:**
- `[Copy message & open LinkedIn]` copies to the clipboard and opens the profile in a new tab.
- On return (`visibilitychange`), a small prompt asks "Sent to Rahul? [Yes] [Not yet]".
- A 10-second undo toast after every status change.
- Keyboard shortcuts on lists: `j/k` to move, `o` to open, `c` to copy and open, `s` to mark the next status.

---

## 4. Backend architecture

```
http/routes/   parse + validate (Zod), auth, error mapping
services/      use-cases; own DB transactions
core/          PURE logic: state machine, scoring, alumni matching, message validation, check schedule
ai/            provider abstraction (Gemini, Groq), prompts, schemas, fallback chain
db/            Prisma client + repositories (always scoped by userId)
```

**Why:** the parts that must be correct (state machine, ranking, message rules) are pure functions. That makes them fast to test exhaustively without a database or AI.

**State changes go through one function.** `transitionOutreach(outreach, event)` returns the new state plus the next check date. The service writes the outreach update and an `outreach_events` row in the same transaction. That event log is the audit trail, the activity timeline and, later, the analytics source.

---

## 5. Database

### 5.1 Hosting: Neon (recommended)

| | **Neon Free** ✅ | Supabase Free | Others |
|---|---|---|---|
| Storage | 0.5 GB per project | 500 MB | Aiven has a small free tier. Render's free DB **expires after 30 days**. Railway is a one-time trial credit |
| Idle behavior | **Scales to zero, wakes on the next query** (cold start under a second to a few seconds) | **Project pauses after ~7 days of inactivity.** You must restore it manually | — |
| Compute | ~100 compute-unit hours/month | Always on while active | — |
| Extras | Branching (a free copy of the DB for testing migrations) | Auth, storage, realtime (we don't need them) | — |

**Why Neon:** job hunting comes in bursts. If you don't open the app for a week during exams, Supabase pauses the project and you'd have to restore it. Neon just wakes up on the next request. 0.5 GB is far more than this app needs: thousands of jobs and people come to a few MB. We use our own auth, so Supabase's extra features aren't needed.

**Neon setup notes:**
- **Region:** pick the one closest to India (Singapore, `aws-ap-southeast-1`, unless a Mumbai region is offered).
- **Two connection strings:** the **pooled** one (host contains `-pooler`) for the app → `DATABASE_URL`, and the **direct** one for Prisma migrations → `DIRECT_URL`.
- **Keep compute low:** no polling workers and no keep-alive pings. That's why v1 has no queue (§2).
- **Use branches:** create a `dev` branch for development and keep `main` for real data.

### 5.2 Schema (Prisma, every user-owned table has `user_id`)

> **As built (M0, 2026-10-20):** the source of truth is `packages/db/prisma/schema.prisma`. Differences from the text below:
> - `companies` are per user (`user_id`, unique on `user_id + normalized_name`, plus `is_sample`), so the referral-bonus flag is the user's own note.
> - Scoring weights and invite caps live in `user_profiles.settings` instead of a separate `scoring_profiles` table.
> - Alumni aliases are seeded in code (`packages/core/src/relationships/alumni.ts`) until the institution tables are populated.

**users**: `id`, `email` (unique), `name`, `created_at`. Session tables come from the auth library.

**user_profiles**: `user_id` (PK), `headline`, `degree`, `field`, `graduation_year`, `current_semester`, `skills` (text[]), `projects` (jsonb: `[{name, oneLiner, tech[]}]`), `resume_url`, `linkedin_url`, `github_url`, `portfolio_url`, `preferred_roles` (text[]), `preferred_locations` (text[]), `message_preferences` (jsonb: sign-off name, tone).
*Why projects as short one-liners:* the referral message needs one concrete reason you fit ("built a Spring Boot inventory API"). The AI may only use what's written here (§10).

**institutions**: `id`, `name`, `normalized_name`. **institution_aliases**: `institution_id`, `alias`, `normalized_alias` (unique).
*Why:* alumni matching is the strongest ranking signal, and profiles spell schools many ways ("PES University", "PESU", "PES Institute of Technology", "PESIT", "PES University EC Campus"). Aliases turn this into an exact match. Seeded with your university.

**educations**: `id`, `user_id` *or* `contact_id` (CHECK: exactly one), `institution_id` (nullable), `institution_raw`, `degree`, `field`, `start_year`, `end_year`.

**companies**: `id`, `name`, `normalized_name` (unique), `domain`, `linkedin_slug`, `has_referral_bonus` (nullable bool, user-set).

**job_opportunities**: `id`, `user_id`, `company_id`, `title`, `external_job_id`, `url`, `location`, `description_raw`, `analysis` (jsonb), `status` (`ACTIVE | APPLIED | CLOSED | ARCHIVED`), `deadline`, `created_at`.
*Why analysis is jsonb:* it's LLM output whose shape will change, and it's read whole.

**contacts**: `id`, `user_id`, `company_id`, `full_name`, `linkedin_url` (nullable), `headline`, `current_title`, `location`, `seniority` (`INTERN | JUNIOR | MID | SENIOR | STAFF_PLUS | MANAGER | DIRECTOR_PLUS | UNKNOWN`), `function` (`ENGINEERING | RECRUITING | PRODUCT | DATA | OTHER | UNKNOWN`), `source` (`AI_SEARCH | PEOPLE_TAB_PASTE | PROFILE_PASTE | MANUAL`), `confidence` (`USER_VERIFIED | LINKEDIN_PASTE | WEB_EVIDENCE`), `evidence` (jsonb: source titles/URLs/snippets the person was found in), `is_connected`, `notes`, timestamps.
Unique: (`user_id`, normalized `linkedin_url`) when it isn't null.
*Why `evidence`:* every person the AI suggests must point to where it found them (§9.1). That is the main defense against made-up people.

**contact_tags**: (`contact_id`, `tag`) PK, `tag` (`COLLEGE_ALUMNI | SAME_COLLEGE_DIFFERENT_COURSE | RECRUITER | HIRING_MANAGER | OPEN_TO_REFER`), `evidence`, `source` (`RULE | AI | USER`).
*Derived, not stored:* "already connected" (`contacts.is_connected`) and "previously contacted" (another outreach with a sent message).

**outreach**: `id`, `user_id`, `job_id`, `contact_id`, `rank`, `match_score`, `score_breakdown` (jsonb), `state`, `next_check_at`, `followup_count`, `last_sent_at`, `version` (optimistic lock), timestamps. Unique (`job_id`, `contact_id`).

**outreach_events**: `id`, `outreach_id`, `type`, `from_state`, `to_state`, `payload`, `created_at`. Append-only.

**messages**: `id`, `outreach_id`, `kind` (`CONNECTION_NOTE | REFERRAL_REQUEST | FOLLOW_UP | RESUME_SHARE | THANK_YOU | REPLY_RESPONSE | INBOUND_REPLY`), `status` (`DRAFT | SENT | DISCARDED`), `body`, `facts_used` (jsonb), `ai_run_id`, `edited_by_user`, `sent_at`.

**discovery_runs**: `id`, `job_id`, `status` (`RUNNING | DONE | FAILED`), `progress` (jsonb: step, counts), `queries` (jsonb), `candidates_found`, `candidates_verified`, `error`, timestamps.

**ai_runs**: `id`, `user_id`, `task`, `provider`, `model`, `prompt_version`, `input_hash`, `output` (jsonb), `validation_status`, `tokens_in`, `tokens_out`, `latency_ms`, `fell_back` (bool), `error`, `created_at`.
*Why:* debugging ("why did it pick this person?"), caching, tracking how often Gemini fails over to Groq, and a ready-made evaluation dataset.

**scoring_profiles**: `user_id`, `weights` (jsonb overrides of the defaults in code).

**Deletes:** removing a contact or job cascades to its rows. The contacts are third-party personal data, so a delete really deletes.

---

## 6. AI architecture

### 6.1 Providers: Gemini primary, Groq fallback

```ts
interface LLMProvider {
  name: 'gemini' | 'groq';
  supports: { webGrounding: boolean; structuredOutput: boolean };
  generate<T>(req: { task; system; messages; schema?: ZodSchema<T>; tier: 'fast' | 'quality'; grounding?: boolean })
    : Promise<{ data: T; sources?: GroundingSource[]; usage }>;
}
```

| Task | Primary | Fallback | Why |
|---|---|---|---|
| People discovery (web search) | **Gemini + Google Search grounding** | None (show "search unavailable, retry"); People-tab paste still works | Only Gemini has built-in web search here. Groq without search would just invent people |
| Read job posting / analyze JD | Gemini fast tier | Groq | Simple extraction |
| Parse pasted People-tab / profile text | Gemini fast tier | Groq | Extraction |
| Classify title → seniority/function, role relevance | Gemini fast tier (cached) | Groq | Cheap and repeated, so caching matters |
| Write messages | Gemini quality tier | Groq | The core value |
| Interpret a pasted reply (optional) | Gemini fast tier | Groq | — |

- **Fallback rule:** on HTTP 429 (rate limit), 5xx, timeout or schema-validation failure after one repair attempt, retry the same task on Groq. Logged in `ai_runs.fell_back`. *Why:* free tiers hit rate limits, and the workflow shouldn't stall because of it.
- **Model names live in config, never in code:** `GEMINI_MODEL_FAST`, `GEMINI_MODEL_QUALITY`, `GROQ_MODEL`. Pick current ones from AI Studio and the Groq console when coding starts: a Flash-class Gemini for quality, a Flash-Lite-class one for fast, and a large Llama or gpt-oss model on Groq. *Why:* both providers rename and retire models often, and free-tier limits change. Check limits in AI Studio and at console.groq.com/settings/limits.
- **Structured output:** Gemini's JSON schema mode and Groq's JSON mode, always validated with Zod.
- **Gemini grounding limit:** grounded search has its own quota (reports mention a monthly free allowance for Gemini 3 models). Discovery uses about 3–6 grounded calls per job, which is well within it. Usage is tracked in `ai_runs`.

### 6.2 Free-tier privacy (important)
Google's Gemini API terms say that on **unpaid** usage, Google may use prompts and responses to improve its products, and **human reviewers may read them**. Paid usage is excluded. What this means here:
- Prompts contain names and job titles of real people and your profile. For personal use that's your call, but **send the minimum**: no phone numbers, no email addresses, no full resume text.
- Turning on billing on the Google Cloud project (usage will cost pennies) moves you to paid-tier data terms. **Recommended once you rely on the app.**

### 6.3 Prompts are versioned code
`packages/ai/prompts/<task>/v1.ts` exports `{version, system, build(input), schema}`. Prompt changes are behavior changes, so they're versioned and evaluated (§21).

---

## 7. Agent / tool design

No autonomous agent loop in v1. A **deterministic pipeline of tools**, where the LLM is used inside specific steps. *Why:* every step has a known trigger, and predictable steps are easier to test, cheaper and easier to debug. The LLM never decides workflow state.

| Tool | Kind | What it does |
|---|---|---|
| `readJobPosting(url)` | IO | Public ATS endpoints (Greenhouse, Lever, Ashby, Workday). For LinkedIn job URLs it returns `NEEDS_PASTE`, because the app never fetches linkedin.com |
| `analyzeJob(input)` | LLM | Title, job ID, location, skills, domains, recommended contact titles |
| `planDiscovery(job, profile)` | Pure | Builds the search plan (§9.1) |
| `discoverPeople(plan)` | LLM + web grounding | Runs grounded searches, returns candidate people + sources |
| `verifyCandidates(candidates, sources)` | Pure | Drops anyone not supported by a real source (§9.1) |
| `classifyContact(contact, job)` | Pure + cached LLM | Seniority, function, alumni tags, role relevance |
| `rankCandidates(features, weights)` | Pure | Score, reasons, top 15 |
| `parsePastedPeople(text)` | LLM | Extracts people from a pasted People-tab page or profile |
| `buildPeopleTabLinks(job, profile)` | Pure | `linkedin.com/company/<slug>/people/?keywords=...` |
| `generateMessage(kind, factSheet)` | LLM | Draft (§10) |
| `validateMessage(body, factSheet)` | Pure | Style and fact rules (§10.4) |
| `transitionOutreach(outreach, event)` | Pure | State machine (§8) |

A chat-style copilot over these same tools can come later.

---

## 8. Workflow / state machine

### 8.1 States

```
DISCOVERED ─[Request sent]──────▶ CONNECTION_SENT ─[Accepted]─▶ ACCEPTED_MESSAGE_READY
    │                                   │ 21+ days                    │ [Message sent]
    │ [Already connected]               ▼                             ▼
    └──────────────────────────▶ (offer: withdraw → DROPPED)    AWAITING_REPLY ◀─┐
                                                                  │        │       │ [Follow-up sent]
                                                    [Replied/Asked resume] │ [No reply yet] → next check
                                                                  ▼        └───────┘
                                                            IN_CONVERSATION
                                                                  │
                                         ┌────────────────────────┼─────────────────────┐
                                         ▼                        ▼                     ▼
                                 REFERRAL_RECEIVED 🎉          DECLINED            NO_RESPONSE
Also from any active state: SKIPPED, WRONG_PERSON, JOB_CLOSED, STOPPED
```

"Already connected" skips straight to `ACCEPTED_MESSAGE_READY`. Connection status is stored on the person, so marking someone accepted for one job also advances them in your other jobs.

### 8.2 Check schedule (computed when pages load, no background jobs)

| State | `next_check_at` | Shows on Today as |
|---|---|---|
| `CONNECTION_SENT` | +3 days, then every 4 days | "Check if accepted" |
| `CONNECTION_SENT` > 21 days | — | "Withdraw and drop?" (ignored invites reportedly hurt your invite limits) |
| `AWAITING_REPLY` | +2 days, then +5 days | "Check for reply" |
| `AWAITING_REPLY`, day 5, no reply | — | "Follow-up ready" (draft prepared) |
| After follow-up 1 | +7 days | "Check for reply". Follow-up 2 is offered only for alumni or if the job is still open |
| After the last follow-up + 7 days | — | "Mark no response?" |

Max **2 follow-ups**, ever. Never after `DECLINED`.

### 8.3 Reply outcomes (one click each)

On the Awaiting-reply tab, `[Open LinkedIn]` opens the profile. LinkedIn's "Message" button there opens your existing chat. (Chat URLs use internal IDs the app doesn't have, so the profile is the reliable route.)

| Button | → State | App then |
|---|---|---|
| No reply yet | (same) | Hides until the next check date |
| Replied | `IN_CONVERSATION` | Optional: paste their reply → AI drafts your answer |
| Asked for resume | `IN_CONVERSATION` | "Here's my resume" draft with your resume link |
| Referred me 🎉 | `REFERRAL_RECEIVED` | Thank-you draft. Suggests marking the job `APPLIED` |
| Said no | `DECLINED` | Optional short "thanks anyway". No more follow-ups |

### 8.4 Implementation
A hand-written transition table in `core/outreach/machine.ts` with guards. Invalid events → `InvalidTransitionError` (409). Optimistic locking via `version`. *Why not XState:* about 10 states and 20 transitions are clearer as a table and can be tested exhaustively.

---

## 9. Finding the right people (the most important part)

> **As built (M3, 2026-10-20):** searching uses a **web search API (Serper, Google results; Tavily as an alternative)** instead of Gemini's Google Search grounding:
> - **Grounding is unavailable:** it returned 429 on every model for this key, and forum reports show it failing even on paid tiers.
> - **A search API is also more verifiable:** Google's LinkedIn results carry `Name - Title - Company | LinkedIn` titles and `Experience: · Education: · Location:` snippets, which code parses and checks directly (`packages/core/src/discovery/verify.ts`).
> - **Gemini's role:** it reads the job and classifies people (seniority, function, relevance), with Groq as fallback and rule-based classification if both fail.
>
> Code: `apps/api/src/services/discovery.ts`. Measured with fixture results: about 13 s per run.

### 9.1 Discovery pipeline

```
Job analysis + your profile
   ↓
Search plan (4–6 targeted searches)
   ↓
Gemini with Google Search grounding: "find people currently at <company> who …"
   ↓
Extract candidates (name, title, company, school, profile URL) + the sources used
   ↓
VERIFY: keep only candidates backed by a real source
   ↓
Classify (seniority, function, alumni) → rank → top 15 (+ 10 reserves)
```

**Search plan per job** (templated from the job analysis):
1. Alumni + relevant role: *"<university> alumni working as <role family> at <company> <location>"*
2. Alumni at the company in any role: *"<university> graduates at <company>"*
3. Same team or domain: *"<recommended title> <domain> at <company> <location>"*
4. Campus/university recruiters: *"university recruiter campus hiring <company> India"*
5. Signals of willingness to refer: *"<company> employees 'referral' OR 'hiring' <role family> <location>"*

**Verification rules (the main defense against made-up people):**
- A candidate is kept only if its **name appears in a grounding source title or snippet** returned by the search, and that source also mentions the **company**.
- The profile URL is kept only if it's a well-formed `linkedin.com/in/...` URL that appears in the sources. Otherwise `linkedin_url` stays empty and `[Open LinkedIn]` opens a LinkedIn people search for "Name + Company". Clicking a search link in your own browser is fine.
- **School is only set if a source states it.** Otherwise it's "school unknown", never guessed, because the message would otherwise make a false claim.
- **Current employer check:** the source has to suggest they're there *now* (e.g. "Software Engineer at HPE" in the title, not just "ex-HPE"). People with "ex-", "former" or "previously" are dropped.
- Duplicates are merged by URL, then by name + company.

**Optional accuracy boost: People-tab paste.** The job page shows 2–3 links such as `linkedin.com/company/hpe/people/?keywords=PES%20University`. You open one, press Ctrl+A and Ctrl+C, and paste it into the app once. The parser extracts everyone on the page. These people get `confidence = LINKEDIN_PASTE`, which is the most current data available, and they're merged into the ranking. The app itself never opens or reads LinkedIn pages.

**Accuracy target and how it's measured:** for 5 real jobs, you check the top 15 by hand (right person, at the company now, relevant role). **Target: ≥ 12 of 15 correct (80%).** These checks become a regression test set for prompt changes (§21). The "✗ Wrong person / left company" button feeds the same metric during normal use.

### 9.2 Who actually refers: research basis

Collected from engineers on Blind, Taro and Fishbowl, plus career guides and Ask a Manager. The evidence is anecdotal, so it sets the default weights, which are configurable.

| Finding | What it means for ranking |
|---|---|
| **A referral puts the referrer's reputation at stake.** Engineers say referring is a judgment about fit, and some feel referring strangers defeats the purpose | Prefer people who can **judge your fit** (same function, same domain) and feel **connected to you** (alumni) |
| **A shared school is the strongest lever.** Alumni are "usually more willing since you have something in common" | Biggest weight |
| **The referral bonus drives willingness.** A good bonus makes a 30–60 s look at your profile worthwhile, and without one many say no | Small boost if `companies.has_referral_bonus` (you set it) |
| **Mid-level engineers are the sweet spot.** Senior referrals carry more weight but get the lowest reply rates. Interns can't refer | Seniority curve below |
| **People who post "DM me for referrals" or "we're hiring"** do help, but recruiters may discount referrals from people who refer lots of strangers | Moderate boost, not top weight |
| **Campus/university recruiters** are a valid separate route for intern roles, especially where engineers won't refer strangers | Included in the top 15, separate message type |
| **Some engineers prefer a quick chat first, then refer if it's a fit** | Message offers an easy out and lets the conversation lead to the referral (§10) |

### 9.3 Scoring

Features (each 0..1, each with a human-readable reason):

| Feature | Default weight |
|---|---|
| `sameInstitution` (alias match on a stated school) | 40 |
| `roleRelevance` (title vs the job's recommended titles/domains) | 20 |
| `seniorityFit`: MID/SENIOR 1.0 · JUNIOR 0.7 · STAFF+/MANAGER 0.7 · DIRECTOR+ 0.3 · INTERN 0.1 | 10 |
| `domainOverlap` (headline keywords vs job skills/domains) | 10 |
| `alreadyConnected` | 8 |
| `sameProgram` (same school + similar degree) | 5 |
| `sameLocation` | 5 |
| `recruiterForRole` (campus/university recruiter) | 5 |
| `openToReferSignal` | 5 |
| `companyReferralBonus` | 3 |
| Penalty: `recentlyContactedForOtherJob` (within 30 days) | −15 |
| Penalty: `previouslyDeclined` | −25 |

`score = clamp(100 × Σwᵢfᵢ / Σwᵢ, 0, 100) × confidenceMultiplier`, where the multiplier is `USER_VERIFIED/LINKEDIN_PASTE = 1.0` and `WEB_EVIDENCE = 0.9`.

**Output per person:** score, bucket (High ≥ 75, Medium 50–74, Low < 50), reasons ("✓ PES University alum", "✓ Software Engineer, same domain", "? school not confirmed"), and a recommended action.

**Top 15 composition:** at most **3 recruiters**, and the rest engineers or managers, so a list full of recruiters can't crowd out engineers. The top 15 is shown in **waves**: the first 5 are highlighted as "contact today", and the next 5 are suggested if acceptances are low after 4–5 days.

**Why weights and not "let the AI decide":** a ranking you can't explain is one you can't trust or tune. The AI supplies the features (role relevance, seniority) and the formula decides the order.

### 9.4 Invite budget

LinkedIn doesn't publish its limits. Tool vendors report:
- About **100 invites per rolling 7 days** (less for new accounts).
- About **5–10 personalized notes per month** on free accounts, max 200 characters.
- Many ignored or pending invites reportedly **lower** your limit, and withdrawing doesn't restore quota.

**App defaults:** max **15 invites/day** and **100/week** (weekly cap raised from 60 at the user's request, 2026-10-20), shown as a budget bar. The default is **connect without a note**, and personalization goes in the referral message after acceptance. The app suggests using your few notes only on top alumni.

---

## 10. Messages: human, short, honest

### 10.1 What the research says (engineers, recruiters, career guides, Reddit/Blind)
- **Short wins:** 3–5 sentences, **under ~100 words**. Initial messages work best at 2–4 sentences.
- **Be specific:** the exact role, the **job ID and link**, and **one** concrete reason you fit. Make it easy to say yes, because the referrer often needs the job ID to submit.
- **Connect first, ask later.** Don't ask for a referral in the connection note.
- **Lower the pressure:** acknowledge that they don't know you, give an easy out ("totally fine if not"), and offer your resume. A referral is a favour that risks their reputation, so respect that.
- **Generic mass messages get ignored,** and messages that read as AI-written get ignored faster. People now see **em dashes (—)** as a sign of ChatGPT-written text (Rolling Stone, NPR and others have covered this), along with words like "delve" and "leverage" and overly polished phrasing. No single sign proves anything, but together they make a message feel automated.

### 10.2 Pipeline

```
FactSheet (only verified facts) → Strategy (pure) → LLM draft → Validator → (retry once / template) → Draft
```

**FactSheet:** only stored facts, each with an ID. For example: `contact.firstName`, `contact.title`, `shared.institution` (only if the alumni tag has evidence), `user.degree`, `user.semester`, `user.topProject` (from your profile only), `job.title`, `job.id`, `job.url`. Raw pasted or searched text **never** reaches the writing step.

**Strategies:** `ALUMNI_REFERRAL`, `CONNECTED_REFERRAL`, `GENERAL_REFERRAL`, `RECRUITER_INTRO`, `FOLLOW_UP_1`, `FOLLOW_UP_2`, `RESUME_SHARE`, `THANK_YOU`, `THANKS_ANYWAY`, `CONNECTION_NOTE` (optional, ≤ 200 characters, no ask).

### 10.3 Style rules (in the prompt *and* enforced in code)
- Write like a student texting a senior they respect: plain words, contractions ("I'm", "I'd"), short sentences.
- **No em dashes (—) or en dashes (–) at all.** Use commas, periods or "and".
- No: "I hope this message finds you well", "I am reaching out to", "delve", "leverage", "passionate", "esteemed", "synergy", "I came across your impressive profile", "Dear Sir/Madam", emojis, bullet points, exclamation-mark spam, flattery.
- Only one ask per message. The alumni connection goes in the **first** sentence, said naturally ("Fellow PES student here").
- Vary openings and structure: the generator gets a random style seed plus your last 5 sent messages as "don't reuse this phrasing".
- Sign off with your first name only.

**Example of the target tone (alumni, ~70 words):**
> Hi Rahul, fellow PES student here (MCA, 3rd sem). I saw HPE has a Software Engineer Intern opening (Job ID 123456) and it lines up well with the backend work I've been doing in Java and Spring Boot.
>
> Would you be open to referring me? Happy to send my resume, and totally fine if it's not something you do.
>
> Thanks,
> Praveen

### 10.4 Validator (pure code, runs on every draft)
- Replace or reject `—` and `–` (deterministic: an em dash between clauses → ", "). *Why in code:* models keep producing em dashes even when told not to, so a prompt rule alone isn't enough.
- Banned-phrase list (above) → regenerate.
- Word limits: referral ≤ 110 words, follow-up ≤ 50, connection note ≤ 200 characters.
- Facts: name, company and job ID must match the FactSheet. No school name may appear unless `shared.institution` exists. `factsUsed` must be a subset of the FactSheet.
- Similarity to your last 20 messages must be below a threshold → otherwise regenerate.
- After 2 failures → a plain template for that strategy. The user is never blocked.

---

## 11. Human-in-the-loop

**Rule:** the AI prepares, the user commits. Every LinkedIn action and every status change is a user click, and every click can be undone for 10 seconds.

Review points:
- The job analysis is shown editable before saving.
- The top 15 is shown with reasons and "school unknown" flags. Wrong person → one click to replace.
- Every draft is editable, with "Regenerate", "Shorter" and "More formal".
- A pasted reply's interpretation is only a suggestion. You click the outcome.

---

## 12. LinkedIn boundary and compliance

**Hard rule: the backend never sends a request to linkedin.com.** The outbound HTTP client has an allowlist (Gemini, Groq, public ATS job APIs) and an explicit denylist for `linkedin.com`.

| ✅ The app does | ❌ The app never does |
|---|---|
| Finds people through Gemini's Google Search grounding (public search results) | Loads, scrolls or reads LinkedIn pages (server, headless browser, extension, iframe) |
| Builds People-tab and search links **you** open in your own browser | Clicks Connect or Send, or types into LinkedIn |
| Parses text **you** copied and pasted | Uses LinkedIn's private APIs or your session cookies |
| Copies a draft to your clipboard | Sends connection requests or messages, including after acceptance |
| Paces your invites below reported limits | Uses unlicensed people-data vendors |

---

## 13. API design (REST, `/api/v1`, Zod-validated, shared types)

```
Auth          POST /auth/*        GET /me
Profile       GET|PUT /me/profile        GET|POST|PATCH|DELETE /me/educations
Institutions  GET /institutions?q=        POST /institutions/:id/aliases

Jobs          POST /jobs/read-url { url } → posting | { needsPaste: true }
              POST /jobs/analyze { text } → analysis preview
              POST /jobs                  GET /jobs   GET|PATCH|DELETE /jobs/:id
              POST /jobs/:id/close

Discovery     POST /jobs/:id/discover          → { runId }
              GET  /jobs/:id/discovery/:runId  → progress
              GET  /jobs/:id/people-tab-links
              POST /jobs/:id/paste-people { text } → merged + re-ranked
              GET  /jobs/:id/candidates?tab=to_connect|pending|accepted|awaiting|done

People        GET|PATCH|DELETE /contacts/:id     GET /contacts/:id/history
              POST /contacts/:id/wrong-person    → removes + promotes the next reserve

Outreach      POST /outreach/:id/events { type, expectedVersion }
                   types: REQUEST_SENT, ALREADY_CONNECTED, ACCEPTED, MESSAGE_SENT,
                          NO_REPLY_YET, REPLIED, RESUME_REQUESTED, REFERRED,
                          DECLINED, FOLLOWUP_SENT, NO_RESPONSE, SKIP, WITHDRAW, UNDO
              POST /outreach/:id/drafts { kind, tweak? }   PATCH /messages/:id
              POST /outreach/:id/reply-paste { text } → suggested outcome + reply draft

Today         GET /today        GET /me/invite-budget
Settings      GET|PUT /settings      GET /me/export      DELETE /me
```

**Command-style events instead of `PATCH state`:** the client can't create invalid states, and every change is logged.

---

## 14. Authentication

- **Google sign-in only** (decision 2026-10-20), using **Better Auth** on Express with server-side sessions in Postgres. The cookie is HttpOnly, Secure and SameSite=Lax. Scopes: `openid email profile` only. These are non-sensitive, so Google doesn't need to verify the app.
- **Same origin:** Next.js proxies `/api/*` to Express (Next `rewrites`). The browser only ever talks to `localhost:3000` (and later one production domain), so cookies are first-party with no CORS setup. Google redirect URI: `http://localhost:3000/api/auth/callback/google`.
- Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000`.
- **Why sessions:** they can be revoked, there's nothing in JS-readable storage, and there are no refresh tokens to manage.
- **Multi-user-ready schema** (`user_id` everywhere), even though you're the only user. Adding that later is painful; doing it now costs almost nothing.

---

## 15. Security

| Risk | Mitigation |
|---|---|
| **API keys** | `GEMINI_API_KEY`, `GROQ_API_KEY`, `DATABASE_URL` and `DIRECT_URL` live in `.env` (gitignored), validated at startup, and are never sent to the browser. Don't paste keys into chats or commits. If one leaks, rotate it in AI Studio or the Groq console |
| Cross-user access | Repositories require `userId`. Tests try cross-user access on every resource |
| CSRF | SameSite cookies + Origin check on mutations |
| Prompt injection (job descriptions, pasted pages and search results are untrusted text) | Delimited as data. Extraction outputs are schema-validated. The writing step only sees the FactSheet. The LLM has no tools with side effects. Nothing is sent without a click |
| SSRF | Job URLs are fetched only when they match known ATS hosts, through the allowlisted client |
| AI cost/quota abuse | Rate limits on AI endpoints. Input size caps (JD ≤ 20k chars, paste ≤ 50k) |
| XSS | React escaping. Message bodies are never rendered as HTML |

---

## 16. Data privacy

- **Third-party data:** contacts are real people who didn't sign up. Store only what ranking and messaging need. Discovery keeps the top 15 + 10 reserves per job and discards the rest. No background crawling.
- **Gemini free tier:** see §6.2. Prompts may be reviewed by Google. Send the minimum, and enable billing for paid-tier terms once you rely on the app.
- **Logs:** no names, message bodies or pasted text in application logs (pino redaction). `ai_runs` inputs and outputs are deleted after 90 days, keeping only metrics.
- **Controls:** full JSON export, plus hard delete of a contact, job or the whole account.
- **If this ever becomes multi-user:** India's DPDP Act 2023 applies (privacy notice, lawful basis, deletion process).

---

## 17. Notifications (v1)

In-app only. The **Today page is the notification centre**: a query over states and `next_check_at`. A badge count is shown in the nav. *Why no email or push:* that would need scheduled jobs and a sender, and the daily check-in habit is enough for one user. Email digests come later if wanted.

---

## 18. Background work (v1: none scheduled)

| Work | How in v1 |
|---|---|
| Discovery | In-process async task + `discovery_runs` progress row, polled by the UI |
| Reminders, follow-ups, stale invites | Computed from timestamps when `/today` or the job page loads |
| Draft after "Accepted" | Generated synchronously in the same request (2–5 s, with a spinner) |
| `ai_runs` retention | A cleanup runs on login, at most once a day (simple and free) |

---

## 19. Error handling

| Error | HTTP | Behavior |
|---|---|---|
| Validation | 400 | Field errors shown inline |
| Not found / not yours | 404 | — |
| Invalid transition, stale version, duplicate | 409 | Client refetches and shows the current state |
| AI rate-limited on Gemini | — | Automatic fallback to Groq (except discovery) |
| Discovery failed | 503 | "Search is busy, retry in a minute" + People-tab paste as an alternative |
| AI output invalid | — | One repair retry → fallback provider → template (messages) or empty editable form (extraction) |

Error envelope: `{ error: { code, message, details, requestId } }`. **AI failures never block the workflow.**

---

## 20. Logging and observability

- **pino** JSON logs with `requestId`, route, latency and status, plus PII redaction.
- **`ai_runs`** answers the important questions: Gemini vs Groq share, fallback rate, validation failures, latency, and which prompt version produced a bad draft.
- **Discovery quality metrics:** "wrong person" clicks per job and verified vs dropped candidates. Shown on a small admin page.
- **Sentry** free tier for exceptions (PII scrubbing on).
- `GET /healthz` and `GET /readyz` (DB reachable).

---

## 21. Testing strategy

| Layer | What | Tool |
|---|---|---|
| Core unit tests | Every (state, event) pair; check schedule with a fake clock; scoring fixtures; alias matching (PES/PESU/PESIT); **message validator** (em dashes, banned phrases, length, made-up school) | Vitest |
| Discovery verification | Fixtures of grounding responses: a person not in the sources → dropped; "ex-HPE" → dropped; school not in the sources → unknown | Vitest |
| AI contract | Mock provider returns good, malformed and 429 responses → repair, Groq fallback and template paths all work | Vitest |
| **Evals** (run on prompt changes) | **Discovery:** 5 real jobs with your hand-verified top 15 → precision ≥ 80%. **Messages:** 30 scenarios → 0 em dashes, 0 banned phrases, 0 facts outside the FactSheet, alumni mentioned if and only if tagged, ≤ 110 words, and a "does it sound human?" spot check by you | `pnpm eval` |
| Integration | API + a Neon **dev branch** (or local Docker Postgres): auth, cross-user isolation, transitions + events + version conflicts | Vitest + Supertest |
| E2E | Paste job → top 15 → Request sent → Accepted → copy message → Message sent → No reply → Follow-up | Playwright (against our own app only) |

---

## 22. MVP scope

**In:**
1. Auth, profile (education, skills, projects, resume link), institution aliases
2. Add a job by URL (ATS auto-read) or pasted JD → analysis
3. **Automatic discovery → verified, ranked top 15** + reserves, with reasons; optional People-tab paste
4. Pipeline tabs with one-click statuses and `[Open LinkedIn]`
5. Invite budget bar
6. Referral drafts on "Accepted" (alumni vs general), plus follow-up, resume-share and thank-you drafts
7. Message validator (no em dashes, no AI clichés, short, fact-checked)
8. Today page with computed reminders
9. Gemini → Groq fallback, `ai_runs` logging
10. Export and delete

**Out (later, if ever):** Gmail, LinkedIn archive import, job queue, email/push notifications, analytics dashboard, resume parsing and job-fit score, chat copilot, paid people-data APIs.

**Definition of done:** paste a job URL → a top 15 in **under 2 minutes**, with **≥ 12/15 correct** on your hand checks. Marking someone accepted shows a referral draft you'd send **without editing** most of the time.

---

## 23. Future phases

- **Phase 2:** resume upload + job-fit score (strong matches and gaps feed the message), better discovery (an extra search provider if Gemini grounding precision is below target), reply-paste conversation threads, simple analytics (acceptance rate, reply rate, alumni vs non-alumni).
- **Phase 3:** optional Gmail notification parsing for automatic acceptance/reply detection, email digests, multi-job campaigns per company, a chat copilot over the existing tools.

---

## 24. Folder structure

```
referral-copilot/
├─ apps/
│  ├─ web/                          # Next.js
│  │  ├─ app/ (today, jobs, jobs/[id], people/[id], profile, settings, (auth))
│  │  ├─ components/ (candidate-row, pipeline-tabs, message-card, budget-bar, paste-people-dialog, ui/)
│  │  └─ lib/ (api-client.ts, queries/)
│  └─ api/                          # Express
│     └─ src/ (server.ts, config.ts, http/{middleware,routes}/, services/, test/)
├─ packages/
│  ├─ core/                         # PURE: outreach/machine.ts, outreach/schedule.ts,
│  │                                #       scoring/, relationships/alumni.ts,
│  │                                #       discovery/{plan,verify}.ts, messages/{factsheet,strategies,validate,templates}.ts
│  ├─ ai/                           # provider.ts, providers/{gemini,groq,mock}.ts, run-task.ts (fallback chain),
│  │                                # prompts/{analyze-job,discover-people,parse-people,classify-contact,write-message,read-reply}/v1.ts,
│  │                                # evals/
│  ├─ db/                           # prisma/schema.prisma, seed (institutions), repositories/
│  └─ shared/                       # Zod DTOs + enums
├─ docs/IMPLEMENTATION_PLAN.md
├─ .env.example                     # GEMINI_API_KEY, GROQ_API_KEY, GEMINI_MODEL_*, GROQ_MODEL, DATABASE_URL, DIRECT_URL, AUTH_SECRET
└─ .github/workflows/ci.yml
```

---

## 25. Milestones (one developer, part-time)

| # | Milestone | Deliverable | Est. |
|---|---|---|---|
| M0 | Foundations | Monorepo, Neon project (main + dev branch), Prisma baseline, Express skeleton, Next.js shell, auth, CI | 3–4 days |
| M1 | Profile | Profile + education + projects UI, institution aliases + matching tests | 2–3 days |
| M2 | AI layer + jobs | Gemini/Groq providers, fallback chain, `ai_runs`, ATS readers, job analysis, add-job flow | 4–5 days |
| **M3** | **Discovery** | Search plan, grounded discovery, verification, classification, scoring, top 15 UI with reasons, wrong-person replacement, People-tab paste | **6–8 days** |
| M3.5 | Discovery accuracy | Hand-check 5 real jobs, tune prompts and weights until ≥ 80% precision. **Don't move on until this passes**, since it's the core of the product | 2–3 days |
| M4 | Pipeline | State machine + tests, events endpoint, tabs with one-click statuses, invite budget, undo | 3–4 days |
| M5 | Messages | FactSheet, strategies, prompts, validator, templates, copy-and-open flow, message evals | 4–5 days |
| M6 | Today + follow-ups | Computed reminders, follow-up drafts, reply outcomes, reply-paste helper | 2–3 days |
| M7 | Ship | Security pass, export/delete, Sentry, deploy (web: Vercel; API: Render/Railway free; DB: Neon) | 2–3 days |

**Total: about 5–7 weeks part-time.** Start using it for real applications after M4.

---

## Sources for the research above

- LinkedIn policy: [Prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387), [Automated activity](https://www.linkedin.com/help/linkedin/answer/90586)
- Invite limits (vendor-reported): [Salesforge](https://www.salesforge.ai/blog/linkedin-connection-request-limit), [Dripify](https://help.dripify.com/en/articles/8490987-limited-personalized-connection-request-notes-for-free-linkedin-accounts), [La Growth Machine](https://help.lagrowthmachine.com/en/articles/8480511-linkedin-basic-accounts-new-connection-request-limits-advice-on-how-to-proceed)
- Who refers: [Taro](https://www.jointaro.com/question/AMSkB3QPYj5Zg2Tw5uND/referring-people-who-reach-out-on-linkedin), [Blind: referring strangers](https://www.teamblind.com/post/should-we-be-referring-strangers-fqvrfotz), [Fishbowl](https://www.fishbowlapp.com/post/tips-on-cold-messaging-people-on-linkedin-for-jobscoffee-chats-referrals-i-have-been-finding-relevant-roles-but-dont-have), [Ask a Manager](https://www.askamanager.org/2019/01/linkedin-is-telling-strangers-to-ask-me-for-referrals-to-jobs-i-have-nothing-to-do-with.html), [Bardeen](https://www.bardeen.ai/answers/how-to-message-someone-on-linkedin-for-referral)
- Message style: [Happenstance](https://happenstance.ai/how-to/ask-for-a-job-referral-on-linkedin), [Taplio](https://taplio.com/blog/linkedin-referral-request-examples), [Jobrise](https://jobrise.io/blog/job-referral-message-templates), [Rolling Stone on em dashes](https://www.rollingstone.com/culture/culture-features/chatgpt-hypen-em-dash-ai-writing-1235314945/), [Pangram: signs of AI writing](https://www.pangram.com/signs-of-ai-writing), [NPR](https://www.npr.org/transcripts/nx-s1-5596088)
- Gemini: [API terms (free-tier data use)](https://ai.google.dev/terms), [grounding quota discussion](https://discuss.ai.google.dev/t/grounding-free-quota-clarifying-2026-rules-for-gemini-2-5-flash-paid-tier-1/144593)
- Groq: [free tier overview](https://eesel.ai/blog/groq-pricing), [BenchLM Groq limits](https://benchlm.ai/md/free-tier/groq.md)
- Postgres hosting: [Koyeb free tiers 2026](https://www.koyeb.com/blog/top-postgresql-database-free-tiers-in-2026), [Swyftstack free Postgres](https://swyftstack.com/blog/free-postgresql-hosting), [Flavio Copes](https://flaviocopes.com/database-hosting-options/)
