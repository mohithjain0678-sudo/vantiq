export type NewsItem = {
  title: string;
  source: string;
  link: string;
  publishedAt: string; // ISO string
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — keeps us well under the 200 credits/day free tier
const FETCH_TIMEOUT_MS = 6_000;

type CacheEntry = { data: NewsItem[]; fetchedAt: number };
let cache: CacheEntry | null = null;

// Keywords used two ways: (1) as a query hint to NewsData.io itself, biasing
// what comes back before we even see it, and (2) to score/rank results
// afterward, since `country=in&category=business` alone still lets through
// a lot of generic global business news that merely happens to have an
// Indian source. Includes index names, regulators/currency, and the names +
// NSE tickers of the 8 stocks tracked in ticker.ts, so headlines about them
// specifically score higher.
const RELEVANCE_KEYWORDS = [
  "nifty",
  "sensex",
  "nse",
  "bse",
  "dalal street",
  "rbi",
  "sebi",
  "rupee",
  "repo rate",
  "reliance",
  "tcs",
  "tata consultancy",
  "hdfc",
  "infosys",
  "infy",
  "icici",
  "bajfinance",
  "bajaj finance",
  "itc",
  "sbin",
  "state bank of india",
];

// A shorter, punchier OR-query for NewsData.io's `q` param. Keeping this
// list smaller than RELEVANCE_KEYWORDS above avoids overly restrictive
// results at the API level — the full keyword list still does the finer
// scoring pass locally after the fetch.
const QUERY_HINT = "NSE OR BSE OR Sensex OR Nifty OR RBI OR rupee";

function relevanceScore(title: string): number {
  const lower = title.toLowerCase();
  return RELEVANCE_KEYWORDS.reduce((score, kw) => (lower.includes(kw) ? score + 1 : score), 0);
}

// Re-ranks by relevance and drops zero-score items, but only down to a
// floor — if the feed is thin on Indian-market-specific headlines that day,
// we backfill with the next-best (score 0) items rather than showing an
// empty or near-empty News Radar / starving the briefing of headlines.
const MIN_ITEMS_FLOOR = 6;

function rankAndFilter(items: NewsItem[]): NewsItem[] {
  const scored = items.map((item) => ({ item, score: relevanceScore(item.title) }));
  // Stable-ish sort: higher score first, ties keep original (recency) order.
  scored.sort((a, b) => b.score - a.score);

  const relevant = scored.filter((s) => s.score > 0).map((s) => s.item);
  if (relevant.length >= MIN_ITEMS_FLOOR || relevant.length === scored.length) {
    return relevant;
  }

  // Backfill with the highest-scoring remainder (score 0, but still in
  // original relevance order) to reach the floor.
  const remainder = scored.filter((s) => s.score === 0).map((s) => s.item);
  return [...relevant, ...remainder].slice(0, Math.max(MIN_ITEMS_FLOOR, relevant.length));
}

function parseResults(json: unknown): NewsItem[] {
  const results: unknown[] = Array.isArray((json as { results?: unknown[] })?.results)
    ? (json as { results: unknown[] }).results
    : [];

  return results
    .map((r): NewsItem | null => {
      const item = r as {
        title?: string;
        source_id?: string;
        source_name?: string;
        link?: string;
        pubDate?: string;
      };
      if (!item.title || !item.link) return null;
      return {
        title: item.title,
        source: item.source_name || item.source_id || "Unknown source",
        link: item.link,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      };
    })
    .filter((x): x is NewsItem => x !== null);
}

async function fetchFromNewsData(apiKey: string, withQueryHint: boolean): Promise<NewsItem[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = new URL("https://newsdata.io/api/1/latest");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("country", "in");
    url.searchParams.set("category", "business");
    url.searchParams.set("language", "en");
    if (withQueryHint) url.searchParams.set("q", QUERY_HINT);

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;

    const json = await res.json();
    return parseResults(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchNews(): Promise<{ items: NewsItem[]; error?: string }> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return { items: [], error: "NEWSDATA_API_KEY is not set" };
  }

  // Primary call: query hint biases NewsData.io toward Indian-market-specific
  // results at the source.
  const primary = await fetchFromNewsData(apiKey, true);
  if (primary === null) {
    return { items: [], error: "Fetch to NewsData.io failed or timed out" };
  }

  let combined = primary;

  // Some days the query-hinted call returns too few results (the hint is
  // fairly narrow). Top up with an unhinted call so News Radar / the
  // briefing never end up starved of headlines — this costs one extra
  // credit only on thin days, well within the 200/day free quota.
  if (primary.length < 5) {
    const backup = await fetchFromNewsData(apiKey, false);
    if (backup) {
      const seen = new Set(primary.map((i) => i.link));
      combined = [...primary, ...backup.filter((i) => !seen.has(i.link))];
    }
  }

  const ranked = rankAndFilter(combined).slice(0, 10);
  return { items: ranked };
}

export async function getNews(): Promise<{ items: NewsItem[]; error?: string; stale?: boolean }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { items: cache.data };
  }

  const { items, error } = await fetchNews();

  if (items.length > 0) {
    cache = { data: items, fetchedAt: now };
    return { items };
  }

  // Fetch failed or returned nothing — serve the last good cache if we have one.
  if (cache) {
    return { items: cache.data, stale: true, error };
  }

  return { items: [], error };
}

export function getNewsCacheTimestamp(): number | null {
  return cache?.fetchedAt ?? null;
}
