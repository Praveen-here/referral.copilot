# Reddit, HN and chat communities as channels for India tech internship/fresher hiring

Method note: Reddit blocks this environment. reddit.com returns 403 on direct fetch, the search tool refuses reddit.com as a domain, and the redlib mirrors either fail DNS or show an anti-bot page. So Reddit evidence here comes from one archived snapshot (sentinel-team), a third-party subreddit profile (GummySearch), search-result summaries and news coverage. The HN Algolia API worked, so the HN counts are verified. **V** = verified at source. **R** = reported (a snippet or secondhand).

## 1. Does r/developersIndia have hiring threads or flairs, and what gets posted?

### Takeaway
r/developersIndia (about 1.6M members) runs a monthly job-seeker megathread, "Who's looking for work?", plus a "Referral" post flair. It sends recruiters to a separate subreddit job board and removes job posts from the megathread. Overall the subreddit is mostly people looking for work, with few employers posting. I could not count posts with the Hiring or Referral flair.

### Cited Findings
- The December 2025 megathread, "Who's looking for work? - Monthly Megathread - December 2025", was posted by AutoModerator and had 258 points and 117 comments. It is a template for job seekers: location, relocation, job type, notice period, experience, résumé link and a short pitch. **V** (archived snapshot) — [sentinel-team snapshot](https://reddit.sentinel-team.org/posts/1pb3cz8/snapshots/2025-12-16T02%3A51%3A00.331677Z)
- The same post sends recruiters to "the subreddit's job board", removes job posts in the thread "without warning", asks people to report paid or suspicious accounts through modmail, and asks members to post referrals under the "Referral" flair. Past megathreads are linked through a "Hire Me" flair. **V** — [same](https://reddit.sentinel-team.org/posts/1pb3cz8/snapshots/2025-12-16T02%3A51%3A00.331677Z)
- Comments seen in that snapshot: most are candidate profiles, including a Bengaluru internship seeker and a 2025 graduate asking for SWE referrals. One is an employer listing for a **paid frontend internship in Bengaluru**, and one is a paid Unreal Engine freelance gig. Some profiles say hundreds of job-site applications got little response. **V** (16 of 117 comments were captured) — [same](https://reddit.sentinel-team.org/posts/1pb3cz8/snapshots/2025-12-16T02%3A51%3A00.331677Z)
- Earlier editions of the megathread exist with the same format, including August 2024 and June 2025. **R** — [mirror snippet, Aug 2024](https://lr.sudovanilla.org/r/developersIndia/s/mPGoReJn64)
- Subreddit profile, updated 1 Oct 2026: about 1.6M members, up about 180k (12.5%) in a year. The top themes are "Advice Requests" and "Pain & Anger", and the top topics are Job, Struggling and Career. Only 3 posts in the sample had the "Referral" flair. **V** — [GummySearch r/developersIndia](https://gummysearch.com/r/developersIndia/)
- There is a separate subreddit for referrals, r/csindiareferrals. Its posts are referral requests and offers for specific companies. **R** (the mirror would not load) — [mirror listing](https://red.127.pp.ua/r/csindiareferrals)

### Inferences
- The main mechanism is candidates pitching themselves, not companies posting roles. The employers who do show up are small startups and freelance clients, sometimes breaking the rules. That matches the "paid frontend internship, Bengaluru" comment. There was no sign of MNCs posting there; MNC employees appear only as people offering referrals.
- The "Referral" flair and r/csindiareferrals are the most useful parts of Reddit for this app. They are where employees offer or are asked for referrals.

### Gaps
- I could not count posts by flair (Hiring, Referral, Hire Me), split them by company type or by intern/fresher/experienced, or name the job board, because every Reddit path was blocked. To check by hand, open r/developersIndia and filter by the Referral and Hire Me flairs.
- I found nothing on r/btechtards, r/Indian_Academia, r/StartUpIndia, r/indianstartups or college subreddits.

## 2. Indian students saying they got an internship or job from a Reddit post or a cold DM

### Takeaway
I found **no verifiable example** of an Indian student saying they were hired through a Reddit post or a DM to someone who posted. Searches with exact phrases returned nothing, and the Reddit threads themselves could not be fetched. The coverage of Reddit job-hunting that does reach news sites is about failure, not success.

### Cited Findings
- Exact-phrase searches for "developersIndia" with "got hired" or "got an internship" returned no Reddit results. **V** (search result) — [n/a: null search]
- News coverage, 2026: a B.Tech graduate in Bengaluru posted on Reddit that he applied to more than 500 roles in a month and got no interview, and the post went viral. **R** — [Asianet Newsable](https://newsable.asianetnews.com/karnataka-news/no-interviews-despite-500-applications-bengaluru-graduate-reddit-story-goes-viral-post-strikes-a-chord-articleshow-38tmxro)
- Founder hiring posts that go viral in India tend to be on **X, not Reddit**. In Feb 2025, Smallest AI founder Sudarshan Kamath posted a Bengaluru full-stack role on X with a high salary and low experience bar, and said they got "5-6 resumes every single minute". **R** — [Deccan Herald](https://www.deccanherald.com/india/karnataka/bengaluru/ai-startup-founder-unhappy-after-bengaluru-hiring-post-goes-viral-3432960)
- A US-based mirror thread from Jan 2026, not Indian, reported that cold DMs to founders mostly got no reply or "reach out when you graduate". **R** — [sentinel-team snapshot](https://reddit.sentinel-team.org/posts/1qfxfjd/snapshots/2026-01-19T19%3A10%3A26.06908Z)

### Inferences
- Reddit success stories probably exist but are buried in comments, and search engines that can reach Reddit don't index them. The user should check by hand (see the list of URLs at the end).
- A public post, on X or Reddit, gets flooded within hours. A DM sent early, or a referral, is the realistic way in, not answering the post itself.

### Gaps
- No concrete, dated "got hired via Reddit" thread with a link. Any claim that Reddit produces hires is unsupported by this research.

## 3. What Indian students say about which channels worked

### Takeaway
I could not get Reddit "how I got my internship" threads. The non-Reddit evidence, from Blind, Substack and a founder blog, says cold email to small startups works at low rates (about 1 to 2% get an offer), and that people disagree about Wellfound.

### Cited Findings
- A cold email campaign to startup founders: 79 emails, 30 replies, 11 meetings, 1 internship offer. The author says emailing startups with no posted role can get a role created for you. This is US/global, not India. **R** — [Dorm Room Fund](https://wp.dormroomfund.com/getting-your-first-internship-in-tech/)
- One writer sent more than 50 emails for a first internship and got one positive reply. The article also suggests asking junior people at startups for advice to get introductions. **R** — [Welcome to the Jungle](https://uk.welcometothejungle.com/blog/how-to-get-an-internship-at-a-startup)
- For Mumbai and Pune startups: check the careers page first, then send a tailored cold email if there is none. **R** — [AtoZ Placement Kit Substack](https://atozplacementkit.substack.com/p/b97)
- On Wellfound, Blind users disagree. One says it was "the only platform that has worked for me", that it is mostly early-stage startups, and that LinkedIn did not work for them. Another got better results from LinkedIn applications and DMs to recruiters. **R** — [Blind: success with Wellfound](https://teamblind.com/post/success-with-wellfound-angellist-dgzkndpm)
- Viral X post, July 2025: a Bengaluru founder contrasted ₹5L per month for founders with ₹15,000 per month for interns, as context on startup intern pay. **R** — [BusinessToday](https://www.businesstoday.in/latest/trends/story/5-million-for-founders-rs500-for-interns-bengaluru-founder-on-startup-intern-culture-netizens-chime-in-485180-2025-07-18)

### Gaps
- No India-specific Reddit evidence on how well Internshala, campus placement, referrals or cold email work compared with each other. The sources are general or from other countries.

## 4. HN "Who is Hiring": India, Bangalore, remote-India and intern mentions

### Takeaway
HN Who's Hiring threads are still running in 2026, at about 390 to 490 comments a month. Only about 3 to 4% mention India, and those are mostly senior or full-time remote roles. In October 2026 I found **no internship open to Indian students**. It is a poor channel for Indian interns and a small one for freshers.

### Cited Findings (all **V**, HN Algolia API, queried 2026-10-24)
- Monthly thread sizes, counting all comments including replies: Oct 2026, 395 (id 49922569); Sep 2026, 390; Aug 2026, 373; Jul 2026, 419; Jun 2026, 490; May 2026, 543; Apr 2026, 458. — [Algolia whoishiring](https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=30)
- Keyword hits per thread, from `tags=comment,story_<id>`. Algolia matches on prefixes, so "intern" also catches "international" and "internal":

| Thread | All | India | Bangalore | Bengaluru | "remote (worldwide)" | "intern" | "internship" |
|---|---|---|---|---|---|---|---|
| Oct 2026 | 396 | 16 | 1 | 0 | 11 | 33 | 5 |
| Sep 2026 | 390 | 11 | 0 | 2 | 10 | 35 | n/a |
| Jun 2026 | 490 | 16 | 0 | 0 | 9 | 43 | n/a |

  — [Algolia query example](https://hn.algolia.com/api/v1/search?tags=comment,story_49922569&query=India)
- I read the 16 "India" hits in Oct 2026 by hand. **About 5 are real roles open to people in India**:
  - Oscilar: Sr/Staff SWE, Data Scientist, FDE, PM; remote, India included
  - FunnelStory: MTS Applied ML; Remote (India)
  - SingleStore: Software Engineer, AI Platform; Remote India
  - A Wipro employee offering internal referrals across Global/India roles
  - Irash Tech, Hyderabad: a commission-only freelance BD role, not tech

  The other hits were job seekers from Bangalore, "Indiana" false matches, and replies. One reply warned that "hn hiring threads are not for external recruiters", in answer to a suspicious post. — [Oct 2026 thread](https://news.ycombinator.com/item?id=49922569)
- The 5 "internship" hits in Oct 2026 were all US or Canada onsite (Stoke Space, SwingVision and others) or off topic. None was open to India. — [same](https://news.ycombinator.com/item?id=49922569)

### Inferences
- Realistically that means 3 to 5 India-eligible roles a month, mostly mid or senior level. A fresher could use HN to find startups that hire remotely in India, such as FunnelStory and SingleStore, and then go to their employees for referrals, rather than applying through the thread.

### Gaps
- There is no public data on hires made through HN Who's Hiring, for India or anywhere else.

## 5. Telegram, WhatsApp and Discord job channels: reposts, scams or direct hiring?

### Takeaway
I found no evidence that Indian Telegram or WhatsApp "off-campus job" channels hire people directly. Public material about them is almost all scam warnings, and the legitimate-looking ones are link aggregators that repost public listings. I found nothing on Discord.

### Cited Findings
- Deccan Chronicle, Hyderabad, 14 Oct 2024: fake internships spread through WhatsApp groups and Instagram. Students paid fees and then got links to empty pages. One student paid ₹1,300 for a "typing internship" on Instagram, and the account disappeared. A quote from the article: "After charging fees they fail to provide any meaningful tasks, communication or even the promised certificates." Hyderabad cyber police said no cases had been registered recently. **V** — [Deccan Chronicle](https://www.deccanchronicle.com/southern-states/telangana/fake-internship-scam-loots-college-students-1830107)
- IIT Bhubaneswar issued an advisory that a fraudulent internship scheme was spreading "through WhatsApp groups and other channels", using the name of its Summer Internship Programme 2025. **R** — [IIT BBS announcements](https://www.iitbbs.ac.in/index.php/category/announcements/page/3)
- Telegram and WhatsApp "task" scams pay small amounts first, then ask for deposits for a "premium task", for example pay ₹1,000 to get ₹1,500. Red flags listed: a fee of ₹500 to ₹50,000 to join, "guaranteed placement", HR reachable only on Telegram, and no LinkedIn page or website. Victims are told to report on 1930 or cybercrime.gov.in and to check the company's CIN on the MCA portal. **R** — [CareerIndia, 2026](https://www.careerindia.com/features/telegram-and-whatsapp-task-scams-how-to-identify-fake-work-from-home-job-offers-and-protect-your-money-2026-011-65711.html); [ValidCollege, 2026](https://validcollege.com/news/awareness/telegram-job-scams-2026-why-students-are-losing-money-online-and-how-to-stay-safe-mxmy)
- An example of the aggregator model: a Notion page called "daily internship alerts" that funnels people into a Telegram channel. **R** — [internshipindia.notion.site](https://internshipindia.notion.site/daily-internship-alerts)

### Inferences
- These channels are, at best, a slow copy of public listings from careers pages, LinkedIn and Internshala. They give no advantage over pulling the listings directly, and they carry real scam risk.
- Any rule for these channels should flag any fee, Telegram-only HR contact, or a company with no domain or CIN.

### Gaps
- I found no statistics on how many students are scammed through Telegram or WhatsApp job channels, no evidence of hires made through them, and no data on Indian Discord job servers.

## Threads and pages to open by hand (Reddit could not be fetched here)
1. r/developersIndia "Who's looking for work?" megathreads, using the **Hire Me** flair filter: https://www.reddit.com/r/developersIndia/?f=flair_name%3A%22Hire%20Me%22
2. r/developersIndia **Referral** flair: https://www.reddit.com/r/developersIndia/?f=flair_name%3A%22Referral%22
3. The Dec 2025 megathread (archived): https://reddit.sentinel-team.org/posts/1pb3cz8/snapshots/2025-12-16T02%3A51%3A00.331677Z
4. r/csindiareferrals: https://www.reddit.com/r/csindiareferrals/
5. Reddit search: `site:reddit.com/r/developersIndia "got the offer" cold email` and `r/btechtards "off campus" internship how`
6. HN Oct 2026 Who's Hiring, filtered to India: https://hn.algolia.com/?query=India&type=comment&dateRange=pastMonth (story 49922569)
7. The r/developersIndia sidebar, to find the official job board link.
