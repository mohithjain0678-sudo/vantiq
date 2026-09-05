"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  name: string;
  displaySymbol: string;
  yahooSymbol: string;
};

type Quote = {
  symbol: string;
  price: string;
  change: number;
  stale?: boolean;
};

export default function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteStatus, setQuoteStatus] = useState<"idle" | "loading" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search-as-you-type against /api/stock-search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stock-search?q=${encodeURIComponent(query)}`, { cache: "no-store" });
        const json = await res.json();
        setResults(Array.isArray(json.results) ? json.results : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close the dropdown / quote card on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSelect(result: SearchResult) {
    setSelected(result);
    setQuery(result.displaySymbol);
    setOpen(false);
    setQuoteStatus("loading");
    setQuote(null);

    try {
      const res = await fetch(
        `/api/stock-quote?symbol=${encodeURIComponent(result.displaySymbol)}&yahooSymbol=${encodeURIComponent(
          result.yahooSymbol
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setQuoteStatus("error");
        return;
      }
      const json = await res.json();
      setQuote(json.tick);
      setQuoteStatus("idle");
    } catch {
      setQuoteStatus("error");
    }
  }

  function handleChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selected && value !== selected.displaySymbol) {
      setSelected(null);
      setQuote(null);
      setQuoteStatus("idle");
    }
  }

  const isUp = quote ? quote.change >= 0 : true;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder="Search a stock — Reliance, TCS, Infosys..."
        className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:border-[color:var(--brass)]"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm shadow-lg z-20 overflow-hidden">
          {searching && (
            <p className="px-3 py-2 text-xs text-[color:var(--slate)]">Searching…</p>
          )}
          {!searching && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-[color:var(--slate)]">No NSE-listed matches found.</p>
          )}
          {!searching &&
            results.map((r) => (
              <button
                key={r.yahooSymbol}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-[color:var(--ink)] transition-colors flex items-center justify-between gap-2"
              >
                <span className="truncate">{r.name}</span>
                <span className="text-xs text-[color:var(--slate)] shrink-0">{r.displaySymbol}</span>
              </button>
            ))}
        </div>
      )}

      {selected && quoteStatus !== "idle" && quoteStatus === "loading" && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-xs text-[color:var(--slate)] z-10">
          Fetching live quote…
        </div>
      )}

      {selected && quoteStatus === "error" && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-xs text-[color:var(--slate)] z-10">
          Couldn&apos;t fetch a live quote for {selected.displaySymbol} right now.
        </div>
      )}

      {selected && quote && quoteStatus === "idle" && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2.5 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">{selected.name}</p>
              <p className="text-xs text-[color:var(--slate)]">{selected.displaySymbol} · NSE</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg">₹{quote.price}</p>
              <p className={`text-xs ${isUp ? "text-[color:var(--gain)]" : "text-[color:var(--loss)]"}`}>
                {isUp ? "+" : ""}
                {quote.change.toFixed(2)}%
                {quote.stale ? " · stale" : ""}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
