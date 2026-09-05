"use client";

import { useEffect, useRef, useState } from "react";

type Tick = {
  symbol: string;
  price: string;
  change: number;
  stale?: boolean;
};

// Shown immediately on first paint, before the first live fetch resolves,
// so the ticker never appears empty. Replaced as soon as /api/ticker responds.
const FALLBACK_TICKS: Tick[] = [
  { symbol: "NIFTY 50", price: "24,812.40", change: 0.62 },
  { symbol: "SENSEX", price: "81,203.15", change: 0.58 },
  { symbol: "RELIANCE", price: "2,946.10", change: -0.24 },
  { symbol: "TCS", price: "4,102.75", change: 1.14 },
  { symbol: "HDFC BANK", price: "1,742.30", change: 0.31 },
  { symbol: "INFY", price: "1,889.05", change: -0.47 },
  { symbol: "ICICI BANK", price: "1,298.60", change: 0.89 },
  { symbol: "BAJFINANCE", price: "7,410.20", change: -1.02 },
  { symbol: "ITC", price: "468.90", change: 0.15 },
  { symbol: "SBIN", price: "832.45", change: 0.73 },
];

const REFRESH_MS = 30_000;

function TickItem({ tick }: { tick: Tick }) {
  const positive = tick.change >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-6 py-2 whitespace-nowrap text-sm">
      <span className="text-paper/80 font-medium">{tick.symbol}</span>
      <span className={tick.stale ? "text-paper/30" : "text-paper/50"}>
        {tick.price}
      </span>
      <span
        className={
          positive ? "text-[color:var(--gain)]" : "text-[color:var(--loss)]"
        }
      >
        {positive ? "▲" : "▼"} {Math.abs(tick.change).toFixed(2)}%
      </span>
    </span>
  );
}

export default function Ticker() {
  const [ticks, setTicks] = useState<Tick[]>(FALLBACK_TICKS);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function load() {
      try {
        const res = await fetch("/api/ticker", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (mounted.current && Array.isArray(json.ticks) && json.ticks.length) {
          setTicks(json.ticks);
        }
      } catch {
        // Keep showing whatever we last had (fallback or last live data).
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const row = [...ticks, ...ticks];
  return (
    <div className="w-full overflow-hidden border-b border-[color:var(--hairline)] bg-[color:var(--ink-raised)]">
      <div className="ticker-track flex">
        <div className="flex shrink-0">
          {row.map((t, i) => (
            <TickItem tick={t} key={`a-${i}`} />
          ))}
        </div>
        <div className="flex shrink-0" aria-hidden="true">
          {row.map((t, i) => (
            <TickItem tick={t} key={`b-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
