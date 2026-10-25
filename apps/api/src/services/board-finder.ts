// Finds a company's public job board through web search (DECISIONS #23): search results
// give real board links, which beat guessing slugs from names. A board is kept only when
// its tenant/slug matches the company and its feed answers.

import { BOARD_SEARCH_SITES, boardFromUrl, boardMatchesCompany, type BoardRef } from "@rc/core";
import { FeedError, readFeed } from "./feeds";
import { searchProvider } from "./search";

export type SearchableAts = keyof typeof BOARD_SEARCH_SITES;

export interface FoundBoard {
  ats: BoardRef["ats"];
  slug: string;
  companyName: string;
  /** India tech intern/entry postings the feed returned when checked. */
  postings: number;
}

/**
 * Tries each job system in order, one search each, and stops at the first that yields a
 * working board, so a company usually costs one or two searches.
 */
export async function findBoards(companyName: string, kinds: SearchableAts[]): Promise<FoundBoard[]> {
  const search = searchProvider();
  // "Eternal (Zomato, Blinkit)" searches as "Eternal"; matching still accepts every brand.
  const query = companyName.split(/[(/]/)[0]!.trim();
  for (const ats of kinds) {
    const results = await search.search(`${query} India site:${BOARD_SEARCH_SITES[ats]}`);
    // Same board in different letter case ("Cisco_Careers", "cisco_careers"): keep the spelling seen most.
    const counts = new Map<string, Map<string, number>>();
    for (const r of results) {
      const ref = boardFromUrl(r.url);
      if (!ref || ref.ats !== ats || !boardMatchesCompany(ref, companyName)) continue;
      const spellings = counts.get(ref.slug.toLowerCase()) ?? new Map<string, number>();
      spellings.set(ref.slug, (spellings.get(ref.slug) ?? 0) + 1);
      counts.set(ref.slug.toLowerCase(), spellings);
    }
    const slugs = [...counts.values()].map((s) => [...s].sort((a, b) => b[1] - a[1])[0]![0]);

    const found: FoundBoard[] = [];
    for (const slug of slugs.slice(0, 3)) {
      try {
        const feed = await readFeed({ ats, slug, companyName });
        found.push({ ats, slug, companyName, postings: feed.postings.length });
      } catch (e) {
        if (!(e instanceof FeedError)) throw e;
      }
    }
    if (found.length > 0) return found;
  }
  return [];
}
