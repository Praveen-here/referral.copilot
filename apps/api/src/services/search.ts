// People search through a web search API (plan §12): the app asks a search
// engine, never LinkedIn itself.

import type { SearchResult } from "@rc/core";
import { env } from "../env";
import { HttpError } from "../http/errors";

export interface SearchProvider {
  name: "serper" | "tavily";
  search(query: string): Promise<SearchResult[]>;
}

function serper(apiKey: string): SearchProvider {
  return {
    name: "serper",
    async search(query) {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "x-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ q: query, num: 20, gl: "in" }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string; organic?: { title?: string; link?: string; snippet?: string }[] };
      if (!res.ok) throw new Error(`Serper ${res.status}: ${body.message ?? "request failed"}`);
      return (body.organic ?? []).map((r) => ({ title: r.title ?? "", url: r.link ?? "", snippet: r.snippet ?? "" }));
    },
  };
}

function tavily(apiKey: string): SearchProvider {
  return {
    name: "tavily",
    async search(query) {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        // Tavily filters by domain instead of the site: operator.
        body: JSON.stringify({ query: query.replace(/site:\S+\s*/, ""), max_results: 20, include_domains: ["linkedin.com"] }),
        signal: AbortSignal.timeout(20_000),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: unknown; results?: { title?: string; url?: string; content?: string }[] };
      if (!res.ok) throw new Error(`Tavily ${res.status}: ${JSON.stringify(body.detail ?? "request failed").slice(0, 200)}`);
      return (body.results ?? []).map((r) => ({ title: r.title ?? "", url: r.url ?? "", snippet: r.content ?? "" }));
    },
  };
}

export function searchProvider(): SearchProvider {
  if (env.SERPER_API_KEY) return serper(env.SERPER_API_KEY);
  if (env.TAVILY_API_KEY) return tavily(env.TAVILY_API_KEY);
  throw new HttpError(503, "SEARCH_NOT_CONFIGURED", "People search isn't set up yet. Add SERPER_API_KEY to .env.");
}

export const searchConfigured = () => Boolean(env.SERPER_API_KEY || env.TAVILY_API_KEY);
