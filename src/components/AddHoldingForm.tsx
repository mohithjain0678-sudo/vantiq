"use client";

import { useEffect, useRef, useState } from "react";

type SearchResult = {
  name: string;
  displaySymbol: string;
  yahooSymbol: string;
};

export default function AddHoldingForm({
  onAdd,
  submitting,
}: {
  onAdd: (holding: {
    displaySymbol: string;
    yahooSymbol: string;
    companyName: string;
    quantity: number;
    buyPrice: number;
  }) => void;
  submitting: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2 || (selected && query === selected.displaySymbol)) {
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
  }, [query, selected]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(result: SearchResult) {
    setSelected(result);
    setQuery(result.displaySymbol);
    setOpen(false);
    setResults([]);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selected && value !== selected.displaySymbol) {
      setSelected(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity);
    const price = Number(buyPrice);
    if (!selected || !qty || qty <= 0 || !price || price <= 0) return;

    onAdd({
      displaySymbol: selected.displaySymbol,
      yahooSymbol: selected.yahooSymbol,
      companyName: selected.name,
      quantity: qty,
      buyPrice: price,
    });

    setSelected(null);
    setQuery("");
    setQuantity("");
    setBuyPrice("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div ref={containerRef} className="relative">
        <label className="block text-sm text-[color:var(--slate)] mb-1">Company</label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => query.trim().length >= 2 && !selected && setOpen(true)}
          placeholder="Search a stock — Reliance, TCS, Wipro..."
          className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--brass)]"
        />
        {open && query.trim().length >= 2 && !selected && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm shadow-lg z-20 overflow-hidden">
            {searching && <p className="px-3 py-2 text-xs text-[color:var(--slate)]">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="px-3 py-2 text-xs text-[color:var(--slate)]">No NSE-listed matches found.</p>
            )}
            {!searching &&
              results.map((r) => (
                <button
                  type="button"
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-[color:var(--slate)] mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--brass)]"
          />
        </div>
        <div>
          <label className="block text-sm text-[color:var(--slate)] mb-1">Buy price (₹/share)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            className="w-full bg-[color:var(--ink-raised)] border border-[color:var(--hairline)] rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--brass)]"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !selected}
        className="w-full py-2 bg-[color:var(--brass)] text-[color:var(--ink)] font-medium rounded-sm hover:bg-[color:var(--brass-dim)] transition-colors disabled:opacity-50"
      >
        {submitting ? "Adding..." : "Add holding"}
      </button>
    </form>
  );
}
