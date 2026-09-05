export type StockSearchResult = {
  name: string;
  displaySymbol: string; // e.g. "RELIANCE" — what we show and pass to the quote endpoint
  yahooSymbol: string; // e.g. "RELIANCE.NS" — what Yahoo's chart endpoint expects
};

const FETCH_TIMEOUT_MS = 4_000;

// Same free, no-key Yahoo Finance endpoint family as ticker.ts's chart API —
// this is the "search" sibling, used to resolve a typed company name/symbol
// to real NSE-listed tickers instead of scoping search to a fixed list.
const SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search";

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchange?: string; // "NSI" = NSE, "BSE" = BSE
  quoteType?: string; // "EQUITY", "INDEX", "ETF", etc.
};

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = new URL(SEARCH_URL);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("quotesCount", "10");
    url.searchParams.set("newsCount", "0");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = await res.json();
    const quotes: YahooQuote[] = Array.isArray(json?.quotes) ? json.quotes : [];

    return quotes
      .filter((q) => q.quoteType === "EQUITY" && q.exchange === "NSI" && q.symbol)
      .map((q) => {
        const yahooSymbol = q.symbol as string; // already e.g. "RELIANCE.NS"
        const displaySymbol = yahooSymbol.replace(/\.NS$/, "");
        return {
          name: q.longname || q.shortname || displaySymbol,
          displaySymbol,
          yahooSymbol,
        };
      })
      .slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
