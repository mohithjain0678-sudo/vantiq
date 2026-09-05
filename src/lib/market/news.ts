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

async function fetchNews(): Promise<{ items: NewsItem[]; error?: string }> {
  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) {
    return { items: [], error: "NEWSDATA_API_KEY is not set" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = new URL("https://newsdata.io/api/1/latest");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("country", "in");
    url.searchParams.set("category", "business");
    url.searchParams.set("language", "en");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      return { items: [], error: `NewsData.io returned ${res.status}` };
    }

    const json = await res.json();
    const results: unknown[] = Array.isArray(json?.results) ? json.results : [];

    const items: NewsItem[] = results
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
      .filter((x): x is NewsItem => x !== null)
      .slice(0, 10);

    return { items };
  } catch {
    return { items: [], error: "Fetch to NewsData.io failed or timed out" };
  } finally {
    clearTimeout(timeout);
  }
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
