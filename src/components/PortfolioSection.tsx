"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AddHoldingForm from "./AddHoldingForm";

export type Holding = {
  id: string;
  display_symbol: string;
  yahoo_symbol: string;
  company_name: string;
  quantity: number;
  buy_price: number;
};

type LiveQuote = { price: number; change: number; stale?: boolean } | null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOne(h: Holding): Promise<LiveQuote> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `/api/stock-quote?symbol=${encodeURIComponent(h.display_symbol)}&yahooSymbol=${encodeURIComponent(h.yahoo_symbol)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        const price = Number(String(json.tick.price).replace(/,/g, ""));
        if (Number.isFinite(price)) {
          return { price, change: json.tick.change, stale: json.tick.stale };
        }
      }
    } catch {}
    await sleep(600 * (attempt + 1));
  }
  return null;
}

export default function PortfolioSection({ initialHoldings }: { initialHoldings: Holding[] }) {
  const [holdings, setHoldings] = useState(initialHoldings);
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refreshQuotes(list: Holding[]) {
    if (list.length === 0) return;
    setLoadingQuotes(true);
    try {
      for (let i = 0; i < list.length; i += 2) {
        const batch = list.slice(i, i + 2);
        const results = await Promise.all(batch.map(async (h) => [h.id, await fetchOne(h)] as const));
        setQuotes((prev) => {
          const next = { ...prev };
          for (const [id, q] of results) {
            if (q || !next[id]) next[id] = q;
          }
          return next;
        });
      }
    } finally {
      setLoadingQuotes(false);
    }
  }

  useEffect(() => {
    refreshQuotes(holdings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(h: {
    displaySymbol: string;
    yahooSymbol: string;
    companyName: string;
    quantity: number;
    buyPrice: number;
  }) {
    setSubmitting(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("holdings")
      .insert({
        user_id: user.id,
        display_symbol: h.displaySymbol,
        yahoo_symbol: h.yahooSymbol,
        company_name: h.companyName,
        quantity: h.quantity,
        buy_price: h.buyPrice,
      })
      .select()
      .single();

    setSubmitting(false);
    if (!error && data) {
      const next = [data, ...holdings];
      setHoldings(next);
      refreshQuotes([data]);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const supabase = createClient();
    const { error } = await supabase.from("holdings").delete().eq("id", id);
    setDeletingId(null);
    if (!error) {
      setHoldings(holdings.filter((h) => h.id !== id));
      setQuotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  const priced = holdings.filter((h) => quotes[h.id]);
  const totalInvested = priced.reduce((sum, h) => sum + h.quantity * h.buy_price, 0);
  const totalCurrent = priced.reduce((sum, h) => sum + h.quantity * (quotes[h.id]?.price ?? 0), 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return (
    <div className="border border-[color:var(--hairline)] rounded-sm p-6 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg">Portfolio</h2>
        {holdings.length > 0 && (
          <button
            onClick={() => refreshQuotes(holdings)}
            disabled={loadingQuotes}
            className="text-xs text-[color:var(--slate)] hover:text-[color:var(--paper)] transition-colors disabled:opacity-50"
          >
            {loadingQuotes ? "Refreshing…" : "Refresh prices"}
          </button>
        )}
      </div>

      {holdings.length > 0 && priced.length < holdings.length && (
        <p className="text-xs text-[color:var(--slate)] mb-3">
          Totals based on {priced.length} of {holdings.length} holdings with live prices.
        </p>
      )}

      {holdings.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-xs text-[color:var(--slate)] mb-1">Invested</p>
            <p className="font-display text-xl">₹{totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--slate)] mb-1">Current value</p>
            <p className="font-display text-xl">₹{totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-[color:var(--slate)] mb-1">Gain/loss</p>
            <p
              className={`font-display text-xl ${
                totalGain >= 0 ? "text-[color:var(--gain)]" : "text-[color:var(--loss)]"
              }`}
            >
              {totalGain >= 0 ? "+" : ""}
              ₹{totalGain.toLocaleString("en-IN", { maximumFractionDigits: 0 })} ({totalGainPct >= 0 ? "+" : ""}
              {totalGainPct.toFixed(1)}%)
            </p>
          </div>
        </div>
      )}

      {holdings.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {holdings.map((h) => {
            const q = quotes[h.id];
            const currentPrice = q ? q.price : null;
            const currentValue = currentPrice !== null ? h.quantity * currentPrice : null;
            const invested = h.quantity * h.buy_price;
            const gain = currentValue !== null ? currentValue - invested : null;
            const gainPct = gain !== null && invested > 0 ? (gain / invested) * 100 : null;

            return (
              <li
                key={h.id}
                className="flex items-center justify-between border-b border-[color:var(--hairline)] pb-3 text-sm group"
              >
                <div>
                  <p>
                    {h.company_name} <span className="text-[color:var(--slate)]">({h.display_symbol})</span>
                  </p>
                  <p className="text-xs text-[color:var(--slate)]">
                    {h.quantity} shares @ ₹{h.buy_price.toLocaleString("en-IN")}
                    {q?.stale ? " · stale price" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {currentValue !== null ? (
                      <>
                        <p>₹{currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
                        <p className={gain !== null && gain >= 0 ? "text-[color:var(--gain)] text-xs" : "text-[color:var(--loss)] text-xs"}>
                          {gain !== null && gain >= 0 ? "+" : ""}
                          {gainPct?.toFixed(1)}%
                        </p>
                      </>
                    ) : q === null ? (
                      <button
                        onClick={() => refreshQuotes([h])}
                        className="text-xs text-[color:var(--slate)] hover:text-[color:var(--paper)] transition-colors"
                      >
                        Price unavailable · Retry
                      </button>
                    ) : (
                      <p className="text-xs text-[color:var(--slate)]">Loading…</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(h.id)}
                    disabled={deletingId === h.id}
                    className="opacity-0 group-hover:opacity-100 text-[color:var(--slate)] hover:text-[color:var(--loss)] transition-opacity text-xs disabled:opacity-50"
                    aria-label="Remove holding"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-[color:var(--slate)] mb-6">
          No holdings tracked yet. Add one below to see its live value.
        </p>
      )}

      <AddHoldingForm onAdd={handleAdd} submitting={submitting} />

      <p className="text-xs text-[color:var(--slate)] mt-4 pt-4 border-t border-[color:var(--hairline)]">
        Live NSE prices, for your own tracking. Not investment advice.
      </p>
    </div>
  );
}
