# ATS landscape in India: public job feeds an app can read (Oct 2026)

Legend: **VERIFIED** = fetched live on 2026-10-23 from this machine with curl, output trimmed below. **DOCUMENTED** = stated in the vendor's own docs. **REPORTED** = third-party claim, not checked. Nothing here touches LinkedIn or needs a login.

## Which ATS do Indian tech companies use, and how common is each?

### Takeaway
No survey gives real ATS market share for Indian startups. The best usage count is TheirStack's per-country technology pages (built from job-posting data). Those show Workday, SuccessFactors, Workable and Keka as the most common in India overall. Among well-known Indian product startups, Greenhouse and Lever turn up most often, then Darwinbox, Workday (MNC-style firms) and TurboHire. I checked about 30 well-known Indian tech companies directly: Greenhouse, Lever, Ashby and Workday cover a large share of the funded product startups and MNC-backed firms, while Darwinbox, Keka, Zoho Recruit and TurboHire cover much of the rest.

### Cited Findings
**Counts of companies in India using each ATS (TheirStack titles, fetched 2026-10-23; methodology is TheirStack's, based on job-posting detection):**
- Workday 587 — [TheirStack](https://theirstack.com/en/technology/workday/in)
- Workable 577 — [TheirStack](https://theirstack.com/en/technology/workable/in)
- SuccessFactors 445 (SAP SuccessFactors page: 435) — [TheirStack](https://theirstack.com/en/technology/successfactors/in), [TheirStack](https://theirstack.com/en/technology/sap-successfactors/in)
- Keka 376 (this is Keka as an HR/payroll product, not only Keka Hire) — [TheirStack](https://theirstack.com/en/technology/keka/in)
- Darwinbox 208 — [TheirStack](https://theirstack.com/en/technology/darwinbox/in)
- Zoho Recruit 203 — [TheirStack](https://theirstack.com/en/technology/zoho-recruit/in)
- Greenhouse 137 — [TheirStack](https://theirstack.com/en/technology/greenhouse/in)
- BambooHR 111 — [TheirStack](https://theirstack.com/en/technology/bamboohr/in)
- Lever 101 — [TheirStack](https://theirstack.com/en/technology/lever/in)
- SmartRecruiters 96 — [TheirStack](https://theirstack.com/en/technology/smartrecruiters/in)
- Freshteam 87 — [TheirStack](https://theirstack.com/en/technology/freshteam/in)
- JazzHR 51 — [TheirStack](https://theirstack.com/en/technology/jazzhr/in)
- Breezy HR 38 — [TheirStack](https://theirstack.com/en/technology/breezy-hr/in)
- Rippling 25 (likely the HR product, not only the ATS) — [TheirStack](https://theirstack.com/en/technology/rippling/in)
- Ashby 21 — [TheirStack](https://theirstack.com/en/technology/ashby/in)
- Recruitee 19 — [TheirStack](https://theirstack.com/en/technology/recruitee/in)
- iCIMS 16 — [TheirStack](https://theirstack.com/en/technology/icims/in)
- Teamtailor 10 — [TheirStack](https://theirstack.com/en/technology/teamtailor/in)
- Oracle Talent Management Cloud / Taleo 7 — [TheirStack](https://theirstack.com/en/technology/taleo/in)
- Eightfold AI 1; Personio 1 — [TheirStack](https://theirstack.com/en/technology/eightfold-ai/in), [TheirStack](https://theirstack.com/en/technology/personio/in)
- TurboHire: no TheirStack page found (`/technology/turbohire/in` returned no title).
- Global (not India) share: a Pin report on June 2026 data puts Ashby at 15.6%, Greenhouse 5.2% and Lever 1.5%, from a 600+ team sample that leans toward agencies — [Pin](https://www.pin.com/blog/ats-market-share-report)
- Indian vendor guides call Darwinbox the fit for large enterprises and conglomerates, and Keka Hire, Zimyo or factoHR the fit for SMEs. This is editorial opinion, not usage data — [factoHR](https://factohr.com/best-applicant-tracking-software-india/); IMARC names Keka and Darwinbox as India-focused ATS vendors — [IMARC](https://www.imarcgroup.com/india-applicant-tracking-system-market)

**VERIFIED company to ATS mapping (careers-page HTML checked or the API returned that company's jobs, 2026-10-23):**
| Company | ATS | Evidence |
|---|---|---|
| Razorpay | Greenhouse, slug `razorpaysoftwareprivatelimited` | razorpay.com/jobs links job-boards.greenhouse.io/razorpaysoftwareprivatelimited; API: 26 jobs, e.g. "Analyst, Banking Alliances", Bengaluru |
| Groww | Greenhouse (EU board), slug `groww` | groww.in/careers links job-boards.eu.greenhouse.io; API: 10 jobs, all India |
| InMobi | Greenhouse `inmobi` | 82 jobs, 42 India |
| Rubrik | Greenhouse `rubrik` | 148 jobs, 31 India |
| Druva | Greenhouse `druva` | 31 jobs, 12 India |
| CRED | Lever `cred` | 8 jobs, country "IN" |
| Meesho | Lever `meesho` | 58 jobs |
| Zeta | Lever `zeta` | 27 jobs |
| Paytm | Lever `paytm` | paytm.com/careers links jobs.lever.co/paytm; 197 jobs |
| Freshworks | Lever `freshworks` exists but returned 0 postings (probably moved off it) | API 200, empty array |
| Atlan | Ashby `atlan` | 5 jobs, location "India" |
| BrowserStack | Workday `browserstack.wd3 / External` | careers page link; CXS returned 15 total |
| Sprinklr | Workday `sprinklr.wd1 / careers` | careers page link; CXS returned 69 total |
| CleverTap | Darwinbox | clevertap.com/careers links clevertap.darwinbox.in/ms/candidate/careers/ |
| Unacademy | Darwinbox | unacademy.com/careers links unacademy.darwinbox.in/ms/candidate/careers |
| Ola | TurboHire | olacabs.com/careers links olacareers.turbohire.co/careerpage/... |
| Setu (Pine Labs group) | TurboHire | setu.co/careers links pinelabsgroup.turbohire.co |
| Coditas (Pune) | Zoho Recruit | coditas.zohorecruit.in/jobs/Careers returns jobs with Country "India", City "Pune City" |
| Bosch (India postings) | SmartRecruiters `BoschGroup` | 631 India postings (`country=in`) |

- Slug "slice" on Greenhouse is **not** the Indian fintech: its jobs are in Skopje. Check `company_name` and location before trusting a slug guess (VERIFIED).
- No ATS signature in static HTML (JS-rendered or in-house) for PhonePe, Swiggy, Zomato, Postman, Chargebee, Zerodha, Dream11, ShareChat, Cars24, Urban Company, Juspay, Hasura, Licious, Lenskart, Nykaa, Myntra, Flipkart, Innovaccer, CRED's own site. Greenhouse/Lever/Ashby slug guesses for PhonePe, Postman, BrowserStack, Swiggy, Zomato, Sprinklr, Chargebee, Hasura, CleverTap, Dream11, ShareChat, Unacademy, Cars24, Udaan and Zepto all returned 404 (VERIFIED).

### Inferences
- Of the 30 Indian companies I probed, 14 resolved to a public JSON feed (Greenhouse 5, Lever 4 with data, Ashby 1, Workday 2, plus Bosch on SmartRecruiters and Coditas on Zoho). 5 more resolved to Darwinbox or TurboHire, which have no clean public feed. About 15 were unresolved from static HTML. So roughly 40-50% of a well-known Indian startup list is directly coverable with Greenhouse + Lever + Ashby + Workday, and maybe 60% once Keka and Zoho embed endpoints are added. This is a small, non-random sample, not a measured fraction.
- TheirStack's India counts are dominated by IT services and MNC subsidiaries (Workday/SuccessFactors/Workable). Product startups that a student targets lean Greenhouse/Lever/Ashby/Darwinbox.

### Gaps
- No NASSCOM/Zinnov/Redseer-type survey of ATS share among Indian startups found.
- TheirStack's detection method and freshness weren't inspected; counts are a lower bound of companies with detected postings.
- The ATS for PhonePe, Swiggy, Zomato, Postman, Flipkart and similar was not found (needs a JS-rendered check or the job link from a posting).

## Public endpoints: URL pattern, fields, posting date, India location format

### Takeaway
Greenhouse, Lever, Ashby, SmartRecruiters, Workday CXS, Rippling, Keka (embed endpoint) and Zoho Recruit (job data inside careers HTML) all returned real job data without auth. Greenhouse, Ashby, SmartRecruiters and Keka give exact publish timestamps. Lever gives `createdAt` (epoch ms). Workday's list only says "Posted N Days Ago" in the list, with an exact `startDate` on the detail call. Darwinbox and Eightfold (PCSX) blocked unauthenticated calls, and Workable rate-limited this IP at once.

### Cited Findings
**Greenhouse — VERIFIED**
- `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` (add `?content=true` for description, departments, offices). Docs: "Job Board data is publicly available, so authentication is not required for any GET endpoints"; the docs mention no rate limit — [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)
- EU-hosted boards (Groww: `job-boards.eu.greenhouse.io/groww`) were still served by the US host `boards-api.greenhouse.io` (VERIFIED).
- Sample (Druva): `{"title":"Professional Services Consultant","location":{"name":"Pune, Maharashtra, India"},"first_published":"2026-10-21T09:03:29-04:00","updated_at":"2026-10-21T09:03:29-04:00","requisition_id":"2902","absolute_url":"https://www.druva.com/...?gh_jid=8883093002"}`.
- Live responses include a `first_published` field, which the docs page doesn't list. India locations are free text set by each company: "Bengaluru-VTP, India", "Bangalore", "Bengaluru", "Pune, Maharashtra, India". `metadata` holds company-defined custom fields (InMobi: Employment Type, Department, Base Country). It can also expose internal data: one InMobi field held an employee email, so never store or show raw metadata.
- Headers: weak `etag`, `cache-control: max-age=0, private, must-revalidate`, behind CloudFront. A conditional GET with `If-None-Match` returned **304** (VERIFIED).

**Lever — VERIFIED**
- `GET https://api.lever.co/v0/postings/{site}?mode=json` (EU: `https://api.eu.lever.co/v0/postings/{site}`), params `skip, limit, location, commitment, team, department, level, group`. Filter values are case-sensitive and OR'ed. The docs state a 429 limit only for application POSTs ("more than 2 application POST requests per second") and none for GETs. Published postings "may be scraped by third parties" — [lever/postings-api](https://github.com/lever/postings-api)
- Sample (CRED): `{"text":"accounts payable manager","createdAt":1790573982021,"categories":{"commitment":"full time","department":"Prefr","location":"hyderabad","team":"finance","allLocations":["hyderabad"]},"workplaceType":"onsite","country":"IN","hostedUrl":"https://jobs.lever.co/cred/aa98..."}`. Meesho: location "Bangalore, Karnataka"; Zeta: "Bangalore - WF".
- `country` (ISO code "IN") is the reliable India filter. Location strings vary in case (CRED's `location=Bangalore` filter returned `[]` because CRED stores "bangalore"). `createdAt` is epoch milliseconds. No "updated" field.
- Returns a weak ETag (VERIFIED).

**Ashby — VERIFIED**
- `GET https://api.ashbyhq.com/posting-api/job-board/{JOB_BOARD_NAME}?includeCompensation=true`. Fields: title, location, secondaryLocations, department, team, isRemote, workplaceType, employmentType (FullTime/PartTime/Intern/Contract/Temporary), address, jobUrl, applyUrl, isListed, `publishedAt` ("when the job was last published") — [Ashby docs](https://developers.ashbyhq.com/docs/public-job-posting-api)
- Sample (Atlan): `{"title":"Business Development Representative","location":"India","department":"Marketing","team":"Growth Marketing","employmentType":"FullTime","publishedAt":"2026-06-04T15:06:31.440+00:00","isRemote":true,"workplaceType":"Remote","address":{"postalAddress":{"addressCountry":"India"}}}`
- Headers: `cache-control: public, max-age=60, stale-while-revalidate=60`, ETag, Cloudflare `cf-cache-status: HIT` (VERIFIED).
- `employmentType: "Intern"` makes internship filtering clean on Ashby.

**SmartRecruiters — VERIFIED**
- `GET https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings?limit=..&country=in` worked unauthenticated. Sample (BoschGroup, totalFound 631 for India): `{"name":"Area Sales Manager / Power Tool / Gandhidham","releasedDate":"2026-10-23T07:39:43.014Z","location":{"city":"Gandhidham","region":"GUJARAT","country":"in","remote":false,"hybrid":false,"fullLocation":"Gandhidham, GUJARAT, India"},"function":{"label":"Sales"},"typeOfEmployment":{"label":"Full-time"},"experienceLevel":{"label":"Associate"}}`
- The current docs page says the Posting API supports API key / OAuth with `internal_postings_read` scope and doesn't say whether public listing needs auth. In practice the public list worked without a key — [SmartRecruiters Posting API](https://developers.smartrecruiters.com/docs/posting-api)
- Wrong identifiers return 200 with `totalFound: 0` (Visa test), not 404, so detection must check the count.

**Workday CXS (`*.myworkdayjobs.com`) — VERIFIED, undocumented**
- List: `POST https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` with JSON `{"appliedFacets":{},"limit":20,"offset":0,"searchText":""}`. Tenant, `wdN` and site come straight from the careers URL (`browserstack.wd3.myworkdayjobs.com/External` gives tenant `browserstack`, site `External`).
- List sample (BrowserStack): `{"total":15,"jobPostings":[{"title":"Account Manager - Strategic Sales","externalPath":"/job/India-Remote/Account-Manager---Strategic-Sales_JR103457","locationsText":"India Remote","postedOn":"Posted Today","bulletFields":["JR103457"]}],"facets":[...jobFamilyGroup, workerSubType...]}`
- Detail: `GET https://{tenant}.{wdN}.myworkdayjobs.com/wday/cxs/{tenant}/{site}{externalPath}` returns `jobPostingInfo` with `title, location ("Mumbai Remote"), postedOn, startDate ("2026-10-23"), timeType ("Full time"), jobReqId, country {"descriptor":"India"}`.
- The list gives only relative dates ("Posted 23 Days Ago") and sometimes "N Locations". Use the `externalPath`/req ID as the dedupe key and the first-seen time as the date. Fetch detail only for new IDs. Third-party scrapers report the same placeholder behaviour — [Apify ATS scrapers listing](https://apify.com/porchrun/ats-jobs-scraper) (REPORTED)
- Headers: `Cache-Control: no-store, no-cache`, no ETag, so you can't make a conditional request (VERIFIED).
- No official public docs; Workday's terms for this endpoint were not found.

**Rippling ATS — VERIFIED**
- `GET https://ats.rippling.com/api/v2/board/{slug}/jobs` returned `{"items":[{"id":..,"name":"Business Operations Manager","url":"https://ats.rippling.com/rippling/jobs/...","department":{"name":"Bizops"},"locations":[{"name":"San Francisco, CA","country":"United States","countryCode":"US",...}]}]}`. Only Rippling's own board was tested, with no Indian example. A posting date wasn't seen in the trimmed sample.

**Keka Hire — VERIFIED (embed endpoint)**
- Careers page: `https://{tenant}.keka.com/careers/`; job pages `.../careers/jobdetails/{id}` — [EC-Council careers page](https://www.eccouncil.org/find-your-dream-job/)
- `https://{tenant}.keka.com/api/v1/hire/jobs` returned **401** (needs auth).
- `GET https://{tenant}.keka.com/careers/api/embedjobs/default/active/{guid}`, where `{guid}` is a UUID embedded in that tenant's careers page HTML, returned 18 jobs unauthenticated. Sample: `{"id":92825,"title":"Senior Consultant - GRC","departmentName":"IT Governance","jobLocations":[{"city":"Kuala Lumpur","countryCode":"MY","countryName":"Malaysia"}],"jobType":2,"experience":"4-6","salaryRangeFormat":"MYR 5,000.00 - 7,000.00","publishedOn":"2026-10-19T03:02:26.83Z","publishedSinceDays":4,"skillNames":[...]}`. `Cache-Control: no-cache,no-store`.
- Undocumented and the URL depends on a page-embedded GUID, so it's fragile. Only one tenant tested (EC-Council, not an Indian startup). An invalid tenant returns an HTML "Invalid Tenant" page with status 200. Older Keka links used `hr.kekahire.com/jobdetails/{id}` — [cplusplus forum post](https://cplusplus.com/forum/jobs/279202) (REPORTED).

**Zoho Recruit — VERIFIED (data embedded in HTML)**
- `https://{company}.zohorecruit.in/jobs/Careers` (Coditas) returned 200. The HTML contains HTML-escaped JSON job records with `Posting_Title, Job_Opening_Name, Job_Type ("Full time"), Country ("India"), City ("Pune City"), Currency ("INR"), Date_Opened` field, `id`. No separate JSON/RSS endpoint was found.

**Darwinbox — no public endpoint found**
- Careers pages are `https://{tenant}.darwinbox.in/ms/candidate/careers` (CleverTap, Unacademy; VERIFIED links). A guessed JSON path returned a Cloudflare "Attention Required" challenge page. The careers page is a JS app. No documented public feed was found, and anything past the challenge would be bypassing a bot check, so this source is out of scope.

**Eightfold — blocked**
- Qualcomm's `/api/apply/v2/jobs?domain=qualcomm.com` returned **403** `{"message":"Not authorized for PCSX"}`. Microsoft's `apply.careers.microsoft.com/api/pcsx/search` returned "Please try again later" (VERIFIED). A third-party tool says Eightfold has a newer "PCSX" search and a legacy "SmartApply" API — [Crawlora tool listing](https://glama.ai/mcp/servers/Crawlora-org/crawlora-mcp/tools/jobs_eightfold_board) (REPORTED). Official docs cover only key-authenticated APIs — [Eightfold API auth guide](https://apidocs.eightfold.ai/docs/eightfold-api-authorization-guide).

**Workable — rate-limited at once, not verified**
- `apply.workable.com/api/v1/widget/accounts/{slug}`, `/api/v3/accounts/{slug}/jobs`, `/careers/llms.txt` and `/careers/jobs.md` all returned **429 Cloudflare error 1015** to curl from this IP after one 404. Through a different fetcher, `https://apply.workable.com/careers/jobs.md` returned a Markdown table with Title | Department | Location | Type | Salary | Posted (`2026-10-06`) | link, and "Last updated: 2026-10-23" — [Workable careers jobs.md](https://apply.workable.com/careers/jobs.md). Workable seems to publish per-account `llms.txt` / `jobs.md` for machine readers, but this was seen only on Workable's own account. Treat Workable as fragile and rate-limited.

**Not verified (no real Indian or other example tested; probes with a guessed slug 404'd):** Recruitee (`{slug}.recruitee.com/api/offers/`), Personio (`{slug}.jobs.personio.de/xml`), Breezy (`{slug}.breezy.hr/json`), Teamtailor (`{slug}.teamtailor.com/jobs.rss`), BambooHR (`{slug}.bamboohr.com/careers/list`), JazzHR, iCIMS, Oracle Taleo/ORC, SuccessFactors, TurboHire, Wellfound, Notion pages, Google Forms. These patterns come from memory or common scraper usage, **not** verified here. Endpoints that returned 404 for the probe slug (Recruitee JSON 404 `{"error":"Not Found"}`, Personio/Breezy/Teamtailor HTML 404) do at least show those hosts answer for that path shape.

**Freshteam is being shut down:** Freshworks stops renewals from 2026-03-07, and access lasts until each contract ends (through April 2027 at the latest) — [People Matters](https://www.peoplematters.in/amp/news/business/freshworks-to-end-freshteam-hr-product-stop-renewals-from-march-2026-47939). Don't build a Freshteam reader.

### Inferences
- Build order by payoff: Greenhouse, Lever, Ashby (stable, documented, dated, cacheable), then Workday CXS (covers MNC India offices like BrowserStack and Sprinklr), then SmartRecruiters, then Keka/Zoho (fragile, but Indian-SME heavy).
- For "new posting" detection, set first-seen = the time an ID first appears in the feed. Use `first_published`/`publishedAt`/`releasedDate`/`createdAt` only as a cross-check, because Ashby's `publishedAt` resets on re-publish and Workday's list has no absolute date.
- India filter by source: Lever `country=="IN"`; SmartRecruiters `location.country=="in"`; Ashby `address.postalAddress.addressCountry`; Workday detail `country.descriptor`; Greenhouse needs city/"India" string matching (Bengaluru/Bangalore/Gurugram/Gurgaon, etc.); Keka `countryCode`.

### Gaps
- Exact feeds for Recruitee, Personio, Breezy, Teamtailor, BambooHR, JazzHR, iCIMS, Taleo, SuccessFactors, TurboHire and Wellfound were not verified with real tenants.
- Eightfold's public endpoints are unconfirmed; the calls tried were refused.

## Rate limits, caching, polling, and terms (ATS + Indian job boards)

### Takeaway
Of the ATS vendors checked, only Lever documents a rate limit (for application POSTs only), and Lever's docs say published postings may be scraped. Greenhouse and Ashby support ETag revalidation (Greenhouse returned 304) and Ashby edge-caches for 60 s. Workday, Keka and Workable send no-cache headers, and Workable's Cloudflare limit tripped almost at once. Naukri's terms ban automated crawling and scraping. Unstop and Internshala block API paths in robots.txt. None of the Indian boards checked offers a public jobs feed.

### Cited Findings
- Lever: GET has no stated limit; application POST limit is 2/s; postings may be scraped by third parties — [lever/postings-api](https://github.com/lever/postings-api)
- Greenhouse: public GETs, no rate limit mentioned — [Greenhouse docs](https://docs.greenhouse.io/job-board.html); ETag + 304 supported, `max-age=0, private, must-revalidate` (VERIFIED)
- Ashby: no rate-limit text in docs — [Ashby docs](https://developers.ashbyhq.com/docs/public-job-posting-api); `public, max-age=60, stale-while-revalidate=60` + ETag (VERIFIED)
- Workday CXS: `no-store, no-cache`, no ETag (VERIFIED)
- Workable: Cloudflare 429 error 1015 with `Retry-After: 0` after a handful of requests (VERIFIED)
- Naukri terms prohibit using "automated means to crawl and/or scrape content from Naukri.com" and mirroring the site — [Naukri T&C](https://www.naukri.com/termsconditions); naukri.com robots.txt includes `Disallow: /` for at least one user-agent group (VERIFIED, fetched robots.txt). Naukrigulf requires written consent for automated programs — [Naukrigulf T&C](https://naukrigulf.com/terms-and-conditions)
- Internshala robots.txt: `Disallow: /api/`, `/job/details/`, `/job/search/`, `Crawl-delay` 1-5 (VERIFIED)
- Unstop robots.txt: `Disallow: /api/*` and `Disallow: /` lines (for some user-agent groups), `Crawl-delay: 1` (VERIFIED, groups not fully parsed)
- Instahyre and Cutshort robots.txt have `User-agent: *` with no blanket disallow in the lines matched (VERIFIED). No public jobs API was found for either, and their terms were not reviewed.
- Wellfound robots.txt disallows specific paths (`/jobs/applications`, `/jobs/signup`, etc.) but not job listing pages wholesale (VERIFIED). No public API was found.

### Inferences
- Polling: for Greenhouse and Ashby, send `If-None-Match` and poll each company every 30-60 minutes; 304s cost almost nothing. For Lever, also every 30-60 minutes (weak ETag returned; 304 not tested). For Workday, use a single POST with `limit:20` sorted by default (newest first in observed output), a few times a day, and fetch detail only for new IDs. For Keka, Zoho and Workable, once or twice a day with backoff on 429. With Neon at ~150 ms per round trip and the project's no-polling-workers rule, run this as one cron batch: fetch all feeds concurrently (respecting per-host concurrency of about 2), diff IDs in memory, then do a single batched DB write.
- Detecting which ATS a company uses, from its careers URL/HTML (all patterns observed above): `boards.greenhouse.io` / `job-boards(.eu).greenhouse.io/{slug}` or `?gh_jid=` in links → Greenhouse; `jobs.lever.co/{site}` → Lever; `jobs.ashbyhq.com/{name}` → Ashby; `{tenant}.wdN.myworkdayjobs.com/{site}` → Workday; `{tenant}.darwinbox.in/ms/candidate/careers` → Darwinbox; `{tenant}.keka.com/careers` → Keka; `{x}.zohorecruit.in/jobs/Careers` → Zoho Recruit; `{x}.turbohire.co/careerpage/...` → TurboHire; `ats.rippling.com/{slug}` → Rippling; `smartrecruiters.com` links → SmartRecruiters. Many Indian careers pages render with JS, so static grep missed about half. A fallback is to look at the apply link of any job the user pastes.
- Indian job boards (Naukri, Internshala, Unstop) should be paste-only sources in this app, not fetched.

### Gaps
- No vendor published a polling-frequency recommendation.
- Greenhouse, Ashby, SmartRecruiters and Workday terms of service for programmatic reading of public boards were not located; only Lever explicitly allows third-party scraping of published postings.
- Instahyre, Cutshort, Internshala and Unstop terms of use were not read in full.
