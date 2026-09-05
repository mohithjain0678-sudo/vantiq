// Symbols shown in the ticker. `symbol` is what we display, `yahoo` is the
// ticker Yahoo Finance's public chart endpoint expects (.NS = NSE listing,
// ^NSEI / ^BSESN = the Nifty 50 / Sensex indices).
const SYMBOLS: { symbol: string; yahoo: string }[] = [
  { symbol: "NIFTY 50", yahoo: "^NSEI" },
  { symbol: "SENSEX", yahoo: "^BSESN" },
  { symbol: "RELIANCE", yahoo: "RELIANCE.NS" },
  { symbol: "TCS", yahoo: "TCS.NS" },
  { symbol: "HDFC BANK", yahoo: "HDFCBANK.NS" },
  { symbol: "INFY", yahoo: "INFY.NS" },
  { symbol: "ICICI BANK", yahoo: "ICICIBANK.NS" },
  { symbol: "BAJFINANCE", yahoo: "BAJFINANCE.NS" },
  { symbol: "ITC", yahoo: "ITC.NS" },
  { symbol: "SBIN", yahoo: "SBIN.NS" },
];

export type Tick = {
  symbol: string;
  price: string;
  change: number;
  stale?: boolean;
};

const CACHE_TTL_MS = 30_000; // don't hit Yahoo more than once per 30s
const FETCH_TIMEOUT_MS = 4_000;

type CacheEntry = { data: Tick[]; fetchedAt: number };
// Module-level cache. On Vercel this persists across requests on a warm
// serverless instance, which is enough to keep us well under any rate limit.
let cache: CacheEntry | null = null;
// Last known-good price per symbol, used as a fallback if a single quote
// request fails so the ticker never has to show a blank/missing entry.
const lastGood = new Map<string, Tick>();

async function fetchQuote(entry: { symbol: string; yahoo: string }): Promise<Tick | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(entry.yahoo)}?interval=1d`,
      {
        signal: controller.signal,
        headers: {
          // Yahoo's public chart endpoint is more permissive with a browser-like UA.
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) return null;

    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price: number | undefined = meta?.regularMarketPrice;
    const prevClose: number | undefined = meta?.chartPreviousClose ?? meta?.previousClose;

    if (typeof price !== "number" || typeof prevClose !== "number" || prevClose === 0) {
      return null;
    }

    const change = ((price - prevClose) / prevClose) * 100;

    const tick: Tick = {
      symbol: entry.symbol,
      price: price.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      change,
    };

    lastGood.set(entry.symbol, tick);
    return tick;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Exported so other callers (e.g. the stock search feature, which resolves
// arbitrary NSE symbols rather than the fixed tracked list) can fetch a
// single live quote without duplicating the chart-endpoint fetch logic.
// Bypasses the tracked-symbol cache/fallback since it's for one-off lookups.
export async function fetchQuoteBySymbol(displaySymbol: string, yahooSymbol: string): Promise<Tick | null> {
  return fetchQuote({ symbol: displaySymbol, yahoo: yahooSymbol });
}

export async function getTicks(): Promise<Tick[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const results = await Promise.all(SYMBOLS.map(fetchQuote));

  const data: Tick[] = results.map((tick, i) => {
    if (tick) return tick;
    // Fall back to the last known-good price for this symbol, marked stale,
    // rather than dropping it from the ticker.
    const fallback = lastGood.get(SYMBOLS[i].symbol);
    if (fallback) return { ...fallback, stale: true };
    return { symbol: SYMBOLS[i].symbol, price: "—", change: 0, stale: true };
  });

  cache = { data, fetchedAt: now };
  return data;
}

export function getTicksCacheTimestamp(): number | null {
  return cache?.fetchedAt ?? null;
}
