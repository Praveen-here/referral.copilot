# Startups hiring technical interns / freshers in India (seed to Series C, YC, AI), as of Oct 2026

Method note (read first): On 2026-10-23 I ran a script against the public JSON job-board endpoints of Ashby, Lever, Greenhouse, Workable and Recruitee for 289 slug guesses (Indian startups, YC Indian companies, AI startups, plus some late-stage Indian tech firms as controls). For every board that answered, I pulled all postings, filtered them to India locations, and grepped the titles for intern/trainee/apprentice and entry-level words (SDE I, Software Engineer I, QA Engineer 1, New Grad, Associate). I also read YC's public job pages (Bengaluru software engineer, India), the Wellfound "software engineer intern / India" role page, Internshala's computer-science internship page, and ran web searches for Reddit/X/aggregator posts. "Verified" means I saw it myself in the live endpoint or page on 2026-10-23. "Reported" means a third-party page or search snippet I could not confirm. Dates are taken from the endpoints: Ashby `publishedAt`, Lever `createdAt`, Greenhouse `updated_at`, Workable `published_on`, Recruitee `published_at`.

Endpoint caveats found during probing:
- The Workable widget endpoint (`apply.workable.com/api/v1/widget/accounts/{slug}`) returns HTTP 200 with an empty job list for **any** slug, real or not. An empty Workable result therefore proves nothing. Only Writesonic gave a real non-empty Workable board.
- Generic Greenhouse slugs collide with unrelated companies. `clear`, `slice`, `nurix`, `pronto`, `porter` and `kite` all returned boards with 0 India jobs, so they are almost certainly other companies and are left out. The Lever slug `fi` (9 jobs, 0 India) is probably not Epifi/Fi Money. The Lever slug `trueml` matched on "Remote in ..." locations in Latin America, not India, so it is a false positive.
- Lever `createdAt` is when the posting was created. Old postings that are still open (for example FamPay "Copy Intern", 2020-06-08) show up as live.

## Which startups posted technical intern or fresher roles in India in 2025-2026, and where?

### Takeaway
Real, verifiable **technical intern** postings in India on public startup ATS boards are rare. Across the 30 boards with live India jobs, only 4 had a tech intern or apprentice role open (Hevo Data, FamPay, CloudSEK, Neuron7), and about 4 had explicit entry-level tech roles (Hevo SDE I, AiPrise Software Engineer I, FamPay QA Engineer-1, Giga ML Software Engineer I/II). Most startup intern roles that are visible publicly sit on Internshala (mostly very small firms), Wellfound, YC Work at a Startup, or in founder and aggregator posts on X/LinkedIn. The well-known funded AI startups (Sarvam, Composio, Emergent, Plane, SigNoz, TrueFoundry, Ema) post plenty of India engineering roles, but their India intern posts are non-technical (marketing, founder's office), and their India engineering roles are mostly senior or staff.

### Cited Findings

**Technical intern / apprentice roles verified live on public ATS endpoints (India):**
- Hevo Data (Lever `hevodata`): "Associate Software Development Engineer (SDE) Intern", Bangalore, created 2026-09-21. Also "SDE I", Bangalore, 2026-07-27, and "Associate Customer Experience Engineer", Pune, 2026-09-25. 51 of 53 postings are in India — [Lever API](https://api.lever.co/v0/postings/hevodata?mode=json)
- FamPay (Lever `fampay`): "Security Engineer Intern", Bengaluru, 2026-09-23. "QA Engineer- 1", Bengaluru, 2026-01-14. All 18 postings are in Bengaluru — [Lever API](https://api.lever.co/v0/postings/fampay?mode=json)
- CloudSEK (Greenhouse `cloudsek`): "Security Consultant Intern", Bengaluru, 2026-07-14. 12 of 16 postings are in India — [Greenhouse API](https://boards-api.greenhouse.io/v1/boards/cloudsek/jobs)
- Neuron7.ai (Lever `neuron7`): "Frontend - Apprentice", Bengaluru, 2026-08-12, plus "Frontend Engineer", Bengaluru, 2026-10-07 — [Lever API](https://api.lever.co/v0/postings/neuron7?mode=json)

**Entry-level technical roles verified on ATS endpoints (India):**
- AiPrise (YC S22, Ashby `aiprise`): "Software Engineer I (Bangalore, India)", 2026-08-24. Also SE II and SE III roles in Bengaluru — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/aiprise). YC lists AiPrise SE II at ₹3M-₹5M — [YC Bengaluru SWE jobs](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- Giga ML (Ashby `gigaml`): "Software Engineer I / II" (two postings), board last updated 2026-10-14. Only 1 of 33 postings is tagged Bangalore, so I could not confirm the SE I/II roles are India-based — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/gigaml)
- Plane (Ashby `plane`): mid-level "Software Engineer, Backend (Python)" 2026-07-14, "Software Engineer, Frontend (React)" 2026-04-22, and "Software Engineer, Backend (Node.js)" 2025-12-26, all in India. The titles carry no "Senior", but no experience band is given — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/plane)

**Funded Indian / AI startups with active India boards but no technical intern open (verified):**
- Sarvam AI (Ashby `sarvam`): 44 of 44 postings in India (Bengaluru, Chennai, Delhi, Mumbai), latest 2026-10-23. The only interns are marketing roles ("Marketing Intern" 2026-09-17, "Growth Marketing Intern" 2026-09-23, "Marketing internship (brand & communication)" 2026-10-23). Engineering roles include "Software Development Engineer - Tejas" (2026-10-23), DevOps Engineer and Agent Engineer — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/sarvam)
- Composio (Ashby `composio`): 3 Bangalore roles. Its "Fullstack Engineering Internship" and "Forward Deployed Engineering Internship (Fall 2026 & Winter 2027)" and its "New Grad" roles are tagged SF, not India. Latest posting 2026-10-09 — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/composio)
- TrueFoundry (Greenhouse `truefoundry`): 13 of 23 postings in India. The only intern is "Intern - Founders Office and Alliances", Bengaluru, 2026-09-28. Engineering roles are senior or staff — [Greenhouse API](https://boards-api.greenhouse.io/v1/boards/truefoundry/jobs)
- Emergent (YC S24): about 40 Bangalore roles on YC. The only intern is "Marketing Intern". Engineering roles are SDET, FDE, Senior and Staff. Emergent's own Ashby/Lever/Greenhouse slug `emergent` did not resolve — [YC Bengaluru SWE jobs](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- SigNoz (YC W21, Ashby `signoz`): 14 of 15 postings in India. Senior and Staff roles plus a "Technical Support Engineer" (2026-02-23) — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/signoz)
- Ema (Ashby `ema`): 14 India roles (Bengaluru office or remote), including "Software Engineer, Backend - India" 2026-06-24 and "Software Engineer, Machine Learning" 2025-09-18 — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/ema)
- Smallest.ai (Ashby `smallest`): 3 India roles (Senior SDET; Software Engineer - Systems and Reliability), 2026-10-22 — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/smallest)
- Bolna (YC, Ashby `bolna`): 7 of 7 postings in Bengaluru or Delhi, including "AI Solutions Engineer" 2026-07-03 — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/bolna)
- Human Archive (YC W26, Ashby `humanarchive`): 12 India roles. The only intern is "Founder's Office Intern - Partnerships" (2026-08-12). YC lists India firmware, embedded, QA and hardware-test roles at ₹1.8M-₹4M — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/humanarchive); [YC India jobs](https://www.ycombinator.com/jobs/location/india)
- Atlys (Ashby `atlys` and Recruitee `atlys`): Delhi HQ, many interns, all non-technical (Fulfilment, Pre Sales, Talent Acquisition, Marketing, Guest Delight, People Success) — [Ashby API](https://api.ashbyhq.com/posting-api/job-board/atlys); [Recruitee API](https://atlys.recruitee.com/api/offers/)

**YC job board (public pages, verified on 2026-10-23):**
- The YC Bengaluru software-engineer page showed 50 listings. The only intern titles were Codingal "Business Development Intern" (₹22K-₹25K/month) and Emergent "Marketing Intern". No new-grad engineering roles were visible. The page says "Create a profile to see more jobs", so the public list is partial — [YC Bengaluru SWE](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- The YC India location page showed 24 listings and no intern or new-grad roles. Many were "Remote (US)" roles at companies with India teams (LiteLLM "Forward Deployed Engineer - India" $50K-$90K; Spenmo Software Engineer, SEA & India) — [YC India jobs](https://www.ycombinator.com/jobs/location/india)
- Ressl AI (YC W26, Bengaluru, team of 3) was reported in search snippets of the YC Bengaluru page as posting "Software Engineering Intern" at ₹25K-₹75K/month, Bengaluru / Remote (IN). On 2026-10-23 its YC jobs page showed no open jobs, so the role has closed or was taken down — [YC Ressl AI jobs](https://www.ycombinator.com/companies/ressl-ai/jobs)
- Crustdata (YC F24): its "Software Engineering Intern (Forward Deployed)" and "ML Engineer Intern" are in San Francisco. Its India role is "Founding ML Engineer (India)", 3+ years, ₹7M-₹18.5M. The ₹7M-₹18.5M figure a search summary attached to the intern is the India founding-engineer salary, not intern pay — [YC Crustdata jobs](https://www.ycombinator.com/companies/crustdata/jobs)
- Weekday (YC W21, Bengaluru): its own YC page shows no India technical intern. Aggregator posts list "Weekday (YC W21) Software Engineer Intern", Bengaluru/remote, ₹30K-₹50K/month, but Weekday is an AI recruiter that posts on behalf of clients, so the real employer is unnamed — [YC Weekday jobs](https://www.ycombinator.com/companies/weekday/jobs); [jobfound.org repost](https://jobfound.org/job/weekday-yc-w21-is-hiring-for-software-engineer-intern-bengaluru-karnataka-india-india-20-october-2026); [placement-officer repost](https://www.placement-officer.com/2026/09/weekday-yc-w21-software-engineer-intern.html)

**Wellfound (verified listings):**
- Skedler (Guidanz): "Software Engineer Intern - 2026 Graduates", Chennai / remote, with Bangalore Urban as a location. The listing promises a full-time Associate Software Engineer offer after 6 months and shows ₹3L-₹10L, which looks like an annual figure — [Wellfound job](https://wellfound.com/jobs/4644154-software-engineer-intern-2026-graduates)
- Fluexy: "AI Software Engineering Intern", Bengaluru, remote, 3 months, "Paid Stipend" ₹5,000-₹10,000 (unit unclear) — [Wellfound job](https://wellfound.com/jobs/4683437-ai-software-engineering-intern)
- The Wellfound "software engineer intern / India" role page showed 40 roles at 20 companies on 2026-10-23, and **none was labelled an internship**. The closest were 0-year roles: Backdoor "Founding Engineer", Bangalore, 0 yrs, $30K-$50K; Neutals "Software Engineering Experts (Freshers)", remote; AtomicAds "Member of Technical Staff", Bangalore, 1 yr, ₹15L-₹50L; New Street Technologies "Software Engineer II, Backend", Bengaluru, 1 yr — [Wellfound role page](https://wellfound.com/role/l/software-engineer-intern/india)

**Internshala (verified page 1 of 15, computer-science internships):**
- 50 listings on page 1, dominated by very small firms and NGOs (Codeatrix, Innoknowvex, Women First India Foundation, Pledge India Foundation, TechAlmas, Gateway Software Solutions). Stipends run from unpaid to ₹25,000/month, and several show "Job offer post internship" (for example Innoknowvex up to ₹5 LPA, KMATS up to ₹5 LPA, Ikaansh up to ₹3.6 LPA). Funded VC-backed startups were essentially absent from page 1 — [Internshala CS internships](https://internshala.com/internships/computer-science-internship/)

**Reported (aggregators, social; not verified):**
- Juspay "SDE Intern (+PPO)", batch 2026/2027, ₹50,000/month; Heizen SDE intern ₹25,000/month with a PPO (from an "SDE Jobs and Internships" LinkedIn aggregator, about 127 days old at search time) — [LinkedIn aggregator page](https://in.linkedin.com/company/sde-jobs-and-internships) (search snippet only; not opened, per the no-LinkedIn-fetch rule)
- Groww frontend SDE interns, batches 2025/2026, "50-70k/month" (X post, about 840 days old, so stale) — [X post](https://x.com/RRK_coder/status/1809188238566777186)

### Inferences
- For a student, a public ATS board is a weak source of **intern** leads at Indian startups. It is a good source of **people to ask** (the company has a live India engineering team) and of entry roles (SDE I / SE I / QA-1).
- Well-funded AI startups in India seem to fill technical intern seats off-board (referrals, X/LinkedIn founder posts, campus, Wellfound/YC profiles), because their public boards carry only senior engineering roles plus non-technical interns.
- YC and Wellfound public pages are partial (both hide more jobs behind sign-in), so "no interns visible" there is a lower bound.

### Gaps
- I could not open LinkedIn or X posts (no LinkedIn fetching by rule; X needs login), so founder "we're hiring interns" posts are covered only by search snippets.
- I did not reach Cutshort, Instahyre or Cuvette listings, or Hacker News "Who's Hiring" India mentions, inside the tool budget.
- r/developersIndia threads did not surface in search results, so I have no Reddit evidence.
- I did not identify slugs for startups on Keka, Zoho Recruit, Darwinbox or Freshteam (no single public JSON pattern was tested), so those companies are missing from the verified set.

## Which ATS do they use, and what share use a fetchable ATS?

### Takeaway
I probed 289 slugs on Ashby, Lever, Greenhouse, Workable and Recruitee. That turned up 30 companies with a confirmed board that had live India jobs: 15 Ashby, 9 Lever, 5 Greenhouse, 1 Workable, and 1 company on both Ashby and Recruitee (Atlys). The rest (dozens of known funded startups, such as Rocketlane, Sprinto, Appsmith, ToolJet, Hasura, Toddle, Jar, Khatabook, Kuku FM, Simplismart, Portkey, Lyzr, Jupiter, Plivo, Juspay, Razorpay, Zepto, Swiggy, PhonePe, Darwinbox, Whatfix and Chargebee) did not resolve on any of these five with obvious slugs. Ashby is the most common ATS among YC and AI startups with India teams. Lever is common among older Bengaluru SaaS and fintech companies.

### Cited Findings
- Ashby boards with India jobs (verified): sarvam, composio, gigaml, smallest, atlan, plane, signoz, bolna, ema, spotdraft, aiprise, humanarchive, clueso, atlys, tekion — e.g. [Sarvam](https://api.ashbyhq.com/posting-api/job-board/sarvam), [Plane](https://api.ashbyhq.com/posting-api/job-board/plane), [SpotDraft](https://api.ashbyhq.com/posting-api/job-board/spotdraft), [Atlan](https://api.ashbyhq.com/posting-api/job-board/atlan)
- Lever boards with India jobs (verified): hevodata, fampay, gushwork, zeta, mindtickle, docsumo, neuron7, pocketfm, plus controls cred and meesho — e.g. [Gushwork](https://api.lever.co/v0/postings/gushwork?mode=json), [Zeta](https://api.lever.co/v0/postings/zeta?mode=json)
- Greenhouse boards with India jobs (verified): truefoundry, cloudsek, observeai, plus control groww — [Observe.AI](https://boards-api.greenhouse.io/v1/boards/observeai/jobs)
- Workable (verified non-empty): writesonic, 7 jobs, 5 in India, latest 2026-10-05 — [Workable API](https://apply.workable.com/api/v1/widget/accounts/writesonic)
- Ashby slugs that answered with 0 jobs: `lyzr`, `scaler` (the board exists but is empty) — [Ashby lyzr](https://api.ashbyhq.com/posting-api/job-board/lyzr)
- Lever slugs that answered with 0 jobs: `plivo`, `freshworks` — [Lever plivo](https://api.lever.co/v0/postings/plivo?mode=json)

### Inferences
- Observed share: of the roughly 60 funded or YC Indian startups I specifically targeted (excluding late-stage controls), about 25 had a fetchable Ashby/Lever/Greenhouse/Workable/Recruitee board with India jobs. That is a rough 40%. The other ~60% either use another ATS (Keka, Zoho Recruit, Darwinbox, Freshteam, custom careers pages) or use a slug I did not guess. Treat this as a floor, not a census.
- For the app: Ashby + Lever + Greenhouse covers most YC and AI startups with India teams. Workable needs a non-empty check, because empty results are meaningless.

### Gaps
- No verification of Keka (`{slug}.keka.com/careers`), Zoho Recruit or Darwinbox endpoints, which are likely common for Indian startups.
- Slug guessing misses companies with non-obvious slugs. A proper census would read each company's careers page for the ATS link.

## Do many startups never post interns publicly? How do startups find interns?

### Takeaway
The evidence points to yes. Among 30 verified startup boards with live India jobs, only 4 listed a technical intern. YC's and Wellfound's public India pages showed almost no technical interns. Internshala is flooded with micro-firm internships, not VC-backed ones. Intern hiring at funded startups is visible mostly through YC/Wellfound listings that close fast (Ressl AI's intern was gone within days), through third-party recruiters (Weekday posting for unnamed clients), and through social or aggregator reposts.

### Cited Findings
- 4 of 30 India-active ATS boards had a technical intern or apprentice open on 2026-10-23 (Hevo, FamPay, CloudSEK, Neuron7) — [Hevo](https://api.lever.co/v0/postings/hevodata?mode=json), [FamPay](https://api.lever.co/v0/postings/fampay?mode=json), [CloudSEK](https://boards-api.greenhouse.io/v1/boards/cloudsek/jobs), [Neuron7](https://api.lever.co/v0/postings/neuron7?mode=json)
- On YC Bengaluru SWE, the only interns among 50 listings were non-technical — [YC](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- On the Wellfound software-engineer-intern India page, none of the 40 roles was labelled an internship — [Wellfound](https://wellfound.com/role/l/software-engineer-intern/india)
- The Ressl AI intern (₹25K-₹75K/month) appeared in search snippets but was no longer listed on 2026-10-23 — [YC Ressl AI](https://www.ycombinator.com/companies/ressl-ai/jobs)
- Weekday (YC W21) reposts intern roles for unnamed client companies — [jobfound.org](https://jobfound.org/job/weekday-yc-w21-is-hiring-for-software-engineer-intern-bengaluru-karnataka-india-india-20-october-2026)

### Inferences
- A referral- or alumni-driven approach (the app's model) fits the data. Many funded startups have India engineering teams (visible on ATS) but no public intern posting, so a direct ask to an engineer is often the only route.
- A useful signal for the app: an India-active board plus SDE I / SE I / New Grad / Apprentice titles marks a startup that takes juniors.

### Gaps
- No direct survey data on the share of startup interns hired via referral or social posts.

## Stipends and conversion (PPO)

### Takeaway
Stipends seen range from unpaid/₹2K (Internshala micro-firms) to ₹25K-₹75K/month (YC startup, reported) and ₹50K/month (Juspay, reported). Conversion promises appear on Wellfound (Skedler: full-time offer after 6 months) and on Internshala ("Job offer up to ₹5 LPA"). Reported numbers are unverified.

### Cited Findings
- Ressl AI (YC W26) SWE intern ₹25K-₹75K/month (search snippet, listing now closed) — [YC Bengaluru SWE](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- Codingal (YC W21) business-development intern ₹22K-₹25K/month (non-technical benchmark) — [YC Bengaluru SWE](https://www.ycombinator.com/jobs/role/software-engineer/bengaluru)
- Weekday client SWE intern ₹30K-₹50K/month (reported) — [placement-officer](https://www.placement-officer.com/2026/09/weekday-yc-w21-software-engineer-intern.html)
- Juspay SDE intern ₹50K/month with a PPO; Heizen ₹25K/month with a PPO (reported, aggregator) — [LinkedIn aggregator](https://in.linkedin.com/company/sde-jobs-and-internships)
- Skedler: full-time Associate SE offer at the end of a 6-month internship — [Wellfound](https://wellfound.com/jobs/4644154-software-engineer-intern-2026-graduates)
- Internshala CS internships: unpaid to ₹25K/month. PPO tags such as "Job offer upto ₹ 5LPA post internship" (Innoknowvex, KMATS) — [Internshala](https://internshala.com/internships/computer-science-internship/)
- A Blind thread compares a startup SDE intern offer at ₹25K with a fintech offer at ₹60K — [Blind](https://www.teamblind.com/post/sde-intern-vs-sdet-intern-edoojqxa)

### Gaps
- None of the ATS JSON boards showed stipend fields for the intern roles found (Hevo, FamPay, CloudSEK, Neuron7). I did not open individual postings to read pay or PPO terms.

---

### Company table (one row per company; "V" = verified on 2026-10-23, "R" = reported)

Stage labels are given only where I saw them on a source. Otherwise the column says "startup (stage not verified)". Late-stage controls are marked as such and are not part of the target set.

| company | category | ats | ats_slug_or_url | public_json_endpoint | india_locations_seen | intern_roles_seen | entry_roles_seen | last_posting_date_seen | hiring_channel | evidence_urls | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Hevo Data | startup, data SaaS (stage not verified) | Lever | hevodata | yes, https://api.lever.co/v0/postings/hevodata?mode=json | Bangalore, Pune | Associate SDE Intern (2026-09-21) V | SDE I (2026-07-27); Associate Customer Experience Engineer V | 2026-10-15 | Lever careers | API link | high | Best verified tech-intern lead; 51/53 jobs India |
| FamPay | startup, fintech (stage not verified) | Lever | fampay | yes, https://api.lever.co/v0/postings/fampay?mode=json | Bengaluru | Security Engineer Intern (2026-09-23) V | QA Engineer-1 (2026-01-14) V | 2026-10-12 | Lever careers | API link | high | Some very old postings still live (2020) |
| CloudSEK | startup, cybersecurity (stage not verified) | Greenhouse | cloudsek | yes, https://boards-api.greenhouse.io/v1/boards/cloudsek/jobs | Bengaluru | Security Consultant Intern (2026-07-14) V | none | 2026-10-21 | Greenhouse | API link | high | Security intern, not SDE |
| Neuron7.ai | startup, AI service SaaS (stage not verified) | Lever | neuron7 | yes, https://api.lever.co/v0/postings/neuron7?mode=json | Bengaluru | Frontend - Apprentice (2026-08-12) V | Frontend Engineer (2026-10-07) V | 2026-10-23 | Lever | API link | high | Apprentice is an intern-equivalent |
| AiPrise | YC S22 | Ashby | aiprise | yes, https://api.ashbyhq.com/posting-api/job-board/aiprise | Bengaluru | none | Software Engineer I (2026-08-24) V | 2026-10-22 | Ashby + YC jobs | API; https://www.ycombinator.com/jobs/role/software-engineer/bengaluru | high | SE II ₹3M-₹5M on YC |
| Giga ML | AI startup (stage not verified) | Ashby | gigaml | yes, https://api.ashbyhq.com/posting-api/job-board/gigaml | Bangalore (1 posting) | none | Software Engineer I / II (x2), India location not confirmed | 2026-10-14 | Ashby | API link | medium | Most roles not India-tagged |
| Plane | startup, OSS project mgmt (stage not verified) | Ashby | plane | yes, https://api.ashbyhq.com/posting-api/job-board/plane | India | none | SE Backend (Python), SE Frontend (React), SE Backend (Node.js), unlevelled V | 2026-10-05 | Ashby | API link | high | 10/33 India |
| Sarvam AI | AI startup (stage not verified) | Ashby | sarvam | yes, https://api.ashbyhq.com/posting-api/job-board/sarvam | Bengaluru, Chennai, Delhi, Mumbai | Marketing interns only (x3) V | SDE - Tejas (2026-10-23), unlevelled | 2026-10-23 | Ashby | API link | high | 44/44 India; no tech intern posted |
| Composio | AI startup (stage not verified) | Ashby | composio | yes, https://api.ashbyhq.com/posting-api/job-board/composio | Bangalore (3) | Fullstack + FDE internships, tagged SF | New Grad FDE/Fullstack, tagged SF | 2026-10-09 | Ashby | API link | high | Interns are not India-tagged |
| TrueFoundry | YC-backed AI infra (batch not verified) | Greenhouse | truefoundry | yes, https://boards-api.greenhouse.io/v1/boards/truefoundry/jobs | Bengaluru | Founders Office intern only V | none | 2026-10-13 | Greenhouse | API link | high | Eng roles senior/staff |
| Emergent | YC S24 | not found on Ashby/Lever/GH (`emergent`) | YC company page | no (Workable empty, meaningless) | Bangalore | Marketing Intern (YC) V | SDET, FDE (unlevelled) | not shown | YC Work at a Startup | https://www.ycombinator.com/jobs/role/software-engineer/bengaluru | medium | About 40 Bangalore roles on YC |
| SigNoz | YC W21 | Ashby | signoz | yes, https://api.ashbyhq.com/posting-api/job-board/signoz | India (remote) | none | Technical Support Engineer (2026-02-23) | 2026-10-15 | Ashby + YC | API; https://www.ycombinator.com/jobs/location/india | high | Mostly senior |
| Ema | AI startup (stage not verified) | Ashby | ema | yes, https://api.ashbyhq.com/posting-api/job-board/ema | Bengaluru, India remote | none | SE Backend - India (2026-06-24), SE ML (2025-09-18) | 2026-10-21 | Ashby | API link | high | 14/38 India |
| Smallest.ai | AI startup (stage not verified) | Ashby | smallest | yes, https://api.ashbyhq.com/posting-api/job-board/smallest | Bengaluru, Mumbai | none | SE Systems & Reliability | 2026-10-22 | Ashby | API link | high | Small board |
| Bolna | YC (batch not verified) | Ashby | bolna | yes, https://api.ashbyhq.com/posting-api/job-board/bolna | Bengaluru, Delhi | none | AI Solutions Engineer | 2026-10-15 | Ashby | API link | high | 7/7 India |
| Atlan | startup, data SaaS (stage not verified) | Ashby | atlan | yes, https://api.ashbyhq.com/posting-api/job-board/atlan | India | none | none | 2026-10-14 | Ashby | API link | high | Only 5 jobs |
| SpotDraft | startup, legal-tech (stage not verified) | Ashby | spotdraft | yes, https://api.ashbyhq.com/posting-api/job-board/spotdraft | Bengaluru HQ | none | none (SDE III) | 2026-10-07 | Ashby | API link | high | 9/13 India |
| Human Archive | YC W26 | Ashby | humanarchive | yes, https://api.ashbyhq.com/posting-api/job-board/humanarchive | India | Founder's Office Intern (non-tech) | firmware/embedded/QA (YC, ₹1.8M-₹4M) | 2026-09-14 | Ashby + YC | API; https://www.ycombinator.com/jobs/location/india | high | Hardware roles |
| Clueso | YC (batch not verified) | Ashby | clueso | yes, https://api.ashbyhq.com/posting-api/job-board/clueso | Bengaluru | none | none | 2026-10-13 | Ashby | API link | medium | 3 jobs |
| Atlys | startup, travel/visa (stage not verified) | Ashby + Recruitee | atlys | yes, https://api.ashbyhq.com/posting-api/job-board/atlys ; https://atlys.recruitee.com/api/offers/ | Delhi | many non-tech interns | none | 2026-10-21 | Ashby, Recruitee | API links | high | Shows heavy intern use, non-technical |
| Gushwork | YC (batch not verified) | Lever | gushwork | yes, https://api.lever.co/v0/postings/gushwork?mode=json | Bengaluru | none | none (SDE 2/3, FDE) | 2026-09-11 | Lever | API link | high | |
| Writesonic | AI startup (stage not verified) | Workable | writesonic | yes, https://apply.workable.com/api/v1/widget/accounts/writesonic | India | none | Frontend Engineer (2025-11-16) | 2026-10-05 | Workable | API link | medium | |
| Observe.AI | AI startup (stage not verified) | Greenhouse | observeai | yes, https://boards-api.greenhouse.io/v1/boards/observeai/jobs | Bengaluru, Hyderabad | none | AI Agent Engineer (unlevelled) | 2026-10-14 | Greenhouse | API link | high | |
| Mindtickle | startup, SaaS (stage not verified) | Lever | mindtickle | yes, https://api.lever.co/v0/postings/mindtickle?mode=json | Pune, Bengaluru | none | none | 2026-10-06 | Lever | API link | high | |
| Docsumo | startup, AI doc (stage not verified) | Lever | docsumo | yes, https://api.lever.co/v0/postings/docsumo?mode=json | Bangalore, Mumbai | none | none | 2026-04-30 | Lever | API link | medium | Board stale |
| Zeta | fintech (stage not verified; likely late) | Lever | zeta | yes, https://api.lever.co/v0/postings/zeta?mode=json | Bangalore, Hyderabad, Mumbai | none | none (Engineer II roles) | 2026-10-21 | Lever | API link | high | Probably beyond Series C |
| Pocket FM | consumer (likely late stage) | Lever | pocketfm | yes, https://api.lever.co/v0/postings/pocketfm?mode=json | Bangalore | none | none | 2026-10-22 | Lever | API link | medium | Only 2/10 India |
| Tekion | control, late stage | Ashby | tekion | yes, https://api.ashbyhq.com/posting-api/job-board/tekion | Bangalore, Chennai | none | none | 2026-10-23 | Ashby | API link | high | Out of scope (late) |
| Groww | control, late stage | Greenhouse | groww | yes, https://boards-api.greenhouse.io/v1/boards/groww/jobs | Bengaluru | Video Editor Intern (non-tech) | none | 2026-10-21 | Greenhouse | API; https://x.com/RRK_coder/status/1809188238566777186 | high | Old X post: SDE interns 50-70k (R, stale) |
| CRED | control, late stage | Lever | cred | yes, https://api.lever.co/v0/postings/cred?mode=json | Bengaluru, Hyderabad, Mumbai | none | none | 2026-09-28 | Lever | API link | high | Out of scope |
| Meesho | control, late stage | Lever | meesho | yes, https://api.lever.co/v0/postings/meesho?mode=json | 6+ cities | Trainee - Recruitment (non-tech) | none | 2026-10-16 | Lever | API link | high | Out of scope |
| Ressl AI | YC W26, team of 3 | YC only | ycombinator.com/companies/ressl-ai | no | Bengaluru / Remote IN | SWE Intern ₹25K-₹75K/mo (R, now closed) | none | ~mid-Oct 2026 (snippet) | YC Work at a Startup | https://www.ycombinator.com/companies/ressl-ai/jobs | medium | Intern listing gone by 2026-10-23 |
| Crustdata | YC F24 | YC | ycombinator.com/companies/crustdata | no | Bengaluru | interns SF-only | none (India role 3+ yrs) | not shown | YC | https://www.ycombinator.com/companies/crustdata/jobs | high | Not an India intern source |
| Weekday | YC W21, recruiter | YC + reposts | ycombinator.com/companies/weekday | no | Bengaluru | SWE Intern ₹30K-₹50K for clients (R) | Founder's Office (new grads OK) | 2026-10-20 (repost) | Aggregators (jobfound) | https://www.ycombinator.com/companies/weekday/jobs ; jobfound link | medium | Employer unnamed |
| Codingal | YC W21 | YC | ycombinator.com/companies/codingal | no | Bengaluru | BD intern ₹22K-₹25K (non-tech) | none | ~7 days before 2026-10-23 | YC | https://www.ycombinator.com/jobs/role/software-engineer/bengaluru | high | Non-technical |
| Cyble | YC W21 | YC | ycombinator.com/companies/cyble | no | Bengaluru | none | QA Engineer ($15K-$25K) | not shown | YC | same YC page | medium | |
| Lab0 | YC P26 | YC | ycombinator.com/companies/lab0 | no | Bengaluru | none | FDE ($35K-$70K), unlevelled | ~9 days before | YC | same YC page | medium | |
| Atrisa | YC P26 | YC | ycombinator.com/companies/atrisa | no | Bengaluru | none | Founding AI/ML Engineer ($30K-$60K) | not shown | YC | same YC page | low | Founding roles, level unclear |
| Vahan | YC S19 | YC | ycombinator.com/companies/vahan | no | Bengaluru | none | none (Lead AI Eng) | ~2 months before | YC | same YC page | medium | |
| Strac | YC W22 | YC | ycombinator.com/companies/strac | no | Bengaluru, Pune, Mumbai | none | none (3+ yrs) | ~4 days before | YC | https://www.ycombinator.com/jobs/role/software-engineer/remote-india | medium | |
| Coulomb AI | YC S21 | YC | ycombinator.com/companies/coulomb-ai | no | Bangalore | none | none (Senior FE) | ~3 days before | YC | same page | low | |
| LiteLLM | YC W23 | YC | ycombinator.com/companies/litellm | no | India (remote) | none | FDE - India ($50K-$90K) | ~2 months before | YC | https://www.ycombinator.com/jobs/location/india | medium | |
| Spenmo | YC S20 | YC | ycombinator.com/companies/spenmo | no | SEA & India | none | Software Engineer (unlevelled) | not shown | YC | same page | low | |
| Skedler (Guidanz) | startup (stage not verified) | Wellfound | wellfound.com/jobs/4644154 | no | Chennai / remote, Bangalore | SWE Intern - 2026 grads V | converts to Associate SE after 6 months | not captured | Wellfound | https://wellfound.com/jobs/4644154-software-engineer-intern-2026-graduates | medium | PPO-style conversion stated |
| Fluexy | startup (stage not verified) | Wellfound | wellfound.com/jobs/4683437 | no | Bengaluru (remote) | AI SWE Intern, paid V | none | not captured | Wellfound | https://wellfound.com/jobs/4683437-ai-software-engineering-intern | low | Stipend unit unclear |
| Backdoor | startup, 1-10 people | Wellfound | wellfound.com/jobs/4859110 | no | Bangalore | none | Founding Engineer, 0 yrs ($30K-$50K) V | ~5 days before | Wellfound | https://wellfound.com/role/l/software-engineer-intern/india | medium | |
| Neutals | startup, 1-10 people | Wellfound | wellfound.com/jobs/4849870 | no | Remote | none | SWE Experts (Freshers), 0 yrs | ~7 days before | Wellfound | same page | low | Data-labelling-style role |
| AtomicAds | startup, 11-50 people | Wellfound | wellfound.com/jobs/4012972 | no | Bangalore | none | MTS, 1 yr (₹15L-₹50L) | 2026-10-22 ("yesterday") | Wellfound | same page | medium | |
| New Street Technologies | startup, Growth Stage (Wellfound label) | Wellfound | wellfound.com/jobs/4846251 | no | Bengaluru | none | SE II Backend, 1 yr | ~7 days before | Wellfound | same page | medium | |
| Juspay | fintech (likely later than Series C) | own careers (not tested) | n/a | no (slug `juspay` not found on 5 ATSs) | not verified | SDE Intern + PPO ₹50K/mo (R) | n/a | ~127 days before search | LinkedIn aggregator | https://in.linkedin.com/company/sde-jobs-and-internships | low | Reported only |
| Heizen | startup (stage not verified) | unknown | n/a | no | not verified | SDE intern ₹25K + PPO (R) | n/a | n/a | LinkedIn aggregator | same | low | Reported only |

Failed or empty probes worth noting (no board found on Ashby/Lever/Greenhouse/Recruitee with these slugs, and the Workable result means nothing): rocketlane, sprinto, appsmith, tooljet, hasura, chatwoot, hoppscotch, portkey, maxim/getmaxim, unifyapps, fyle, atomicwork, simplismart, writesonic (Ashby/Lever), dhiwise, revrag, ultrahuman, pixxel, digantara, agnikul, toddle, classplus, jar, khatabook, dukaan, kukufm, jupiter, epifi, plivo (Lever board empty), exotel, setu, juspay, razorpay, zepto, swiggy, phonepe, flipkart, krutrim, sharechat, darwinbox, whatfix, chargebee, freshworks (Lever empty), smallcase, scaler (Ashby empty), lyzr (Ashby empty), keploy, middleware, requestly, superops, hyperverge, spyne, zuddl, invideo, testsigma, scrut, hiver, crustdata, ressl, codingal, cyble, vahan, gosats.
