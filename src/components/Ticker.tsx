"use client";

type Tick = {
  symbol: string;
  price: string;
  change: number;
};

const TICKS: Tick[] = [
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

function TickItem({ tick }: { tick: Tick }) {
  const positive = tick.change >= 0;
  return (
    <span className="inline-flex items-center gap-2 px-6 py-2 whitespace-nowrap text-sm">
      <span className="text-paper/80 font-medium">{tick.symbol}</span>
      <span className="text-paper/50">{tick.price}</span>
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
  const row = [...TICKS, ...TICKS];
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
