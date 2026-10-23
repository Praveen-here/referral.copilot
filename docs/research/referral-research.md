# Research behind the app (who refers, messages, platform limits)

Findings gathered while building (2026-10-20 → 10-21) from Blind, Taro, Reddit/forum threads, career guides and vendor docs. Mostly anecdotal: they set defaults, not facts. Where they live in code is noted. Companion file: `job-search-research.md` (user's research on early postings).

## Who actually refers a fresher → ranking (`packages/core/src/discovery/score.ts`)
| Group | What people report | App behavior |
|---|---|---|
| Alumni (same college) | Shared school is the opener that gets replies (one tracked sample: 43% vs 34% reply) | Biggest weight (40) |
| Mid-level ICs, ~1–3 yrs at company, on/near the team | Refer most, responsive, can submit referrals | Seniority fit 1.0 |
| Early-career (SDE-1, Engineer I, Graduate Engineer Trainee) | Refer readily (bonus-motivated), remember the job hunt; may need ~90 days/probation first | 0.9 (GET ≠ intern) |
| Senior engineers | Refer selectively; reputation on the line; flooded with asks | 0.8 |
| Managers | Busy, but can push the candidate directly | 0.6 |
| Staff/principal | Reply less | 0.5 |
| Directors/VPs | Rarely submit referrals themselves | 0.2 |
| Interns | Can't refer | 0.1, ×0.4 penalty |
| Recruiters/HR | Mostly **can't** submit internal referrals; can route/answer process questions | ≤2 in top list, labelled "can't refer, but can route you", separate message (no referral ask) |
| People posting "DM for referral" | Do help, but recruiters may discount bulk referrers | Small boost |
- Unrelated function (e.g. finance director alum) ×0.75: being an alum shouldn't beat a relevant engineer.
- Referral bonus at the company increases willingness (user can flag per company).

## Messages (`packages/ai/src/prompts/write-message.ts`, `packages/core/src/messages/validate.ts`)
- Short (60–90 words), specific: exact role **and company**, one modest fit line only from the user's profile, one ask, easy out, offer resume.
- Connect first, ask after acceptance; don't ask in the connection note (free accounts get ~5–10 notes/month, 200 chars).
- Em dashes, "I hope this message finds you well", "delve", "leverage", "strong/perfect fit", flattery read as AI-written → banned in code.
- User's preferred shape: see `docs/PREFERENCES.md`.

## LinkedIn limits & rules
- Automation/scraping banned (User Agreement §8.2, "Prohibited software"): accounts get restricted. App never touches linkedin.com.
- ~100 invites per rolling week (vendor-reported, not official); many ignored invites reportedly tighten limits; withdrawing doesn't restore quota. App defaults 15/day, 100/week (user's choice).
- No supported URL to open a chat with pre-filled text → copy + open profile.
- LinkedIn's posting number in `/jobs/view/<id>` is **not** the company's job ID.

## Discovery data sources
- Gemini Google-Search grounding: 429 on every model for this key; unreliable even when paid → not used.
- Serper (Google results): free plan rejects quotes, `site:`, `OR` (HTTP 400) → plain keyword queries; 10 results/query; 2,500 free searches.
- Google's LinkedIn results carry `Name - Title - Company | LinkedIn` and `Experience: · Education: · Location:` snippets; also "@Company"/"I'm a … at Company" forms.
- Small companies: alumni often absent from public search (Alaan test: 18 PES-mentioning results, 0 at the company). LinkedIn's own People-page filter is the reliable source → paste flow.

## Platform facts (free tiers, Oct 2026)
- Render: 750 free instance-hours/month **per workspace**; free service sleeps after 15 min idle (~1 min wake).
- Neon: 0.5 GB, ~100 CU-hours/month, scale-to-zero; free-plan restore window only hours; deleted branches aren't restorable by the user.
- Gemini free tier: per-model daily quotas (main model ran out during testing); free-tier prompts may be used/reviewed by Google.
- Groq free: ~30 RPM, fast (~2 s), good fallback.

## Sources (selection)
- LinkedIn: https://www.linkedin.com/help/linkedin/answer/a1341387
- Taro referrals: https://www.jointaro.com/question/FQIi8us9uoTDIYdzMhvg/how-to-get-referrals/
- Referral playbook (L4–L6, 1–3 yrs tenure): https://www.wrok.app/blog/software-engineer-referral-playbook
- Blind, referring strangers: https://www.teamblind.com/post/is-it-a-common-practice-referring-strangers-to-swe-positions-6rrq6zf6
- Referral bonus side hustle: https://www.bloomberg.com/news/articles/2025-01-09/how-employee-referrals-for-tech-jobs-became-a-side-hustle
- Alumni reply rates: https://www.wallstreetoasis.com/forum/investment-banking/response-rate-networking-with-alumni-email
- Em dash as AI tell: https://www.rollingstone.com/culture/culture-features/chatgpt-hypen-em-dash-ai-writing-1235314945/
- Render free tier: https://render.com/docs/free · Neon restore: https://neon.tech/docs/introduction/point-in-time-restore
