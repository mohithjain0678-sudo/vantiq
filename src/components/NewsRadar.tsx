"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsRadar() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "empty">("loading");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/news", { cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        if (Array.isArray(json.items) && json.items.length > 0) {
          setItems(json.items);
          setStatus("ok");
        } else {
          setStatus("empty");
        }
      } catch {
        if (mounted) setStatus("empty");
      }
    }

    load();
    const interval = setInterval(load, 15 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="border border-[color:var(--hairline)] rounded-sm p-6 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg">News Radar</h2>
        <span className="text-xs text-[color:var(--slate)]">Indian business headlines</span>
      </div>

      {status === "loading" && (
        <p className="text-sm text-[color:var(--slate)]">Loading headlines…</p>
      )}

      {status === "empty" && (
        <p className="text-sm text-[color:var(--slate)]">
          No headlines available right now — check back shortly.
        </p>
      )}

      {status === "ok" && (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="border-b border-[color:var(--hairline)] pb-3 last:border-b-0 last:pb-0">
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:text-[color:var(--brass)] transition-colors"
              >
                {item.title}
              </a>
              <p className="text-xs text-[color:var(--slate)] mt-1">
                {item.source} · {timeAgo(item.publishedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[color:var(--slate)] mt-4 pt-4 border-t border-[color:var(--hairline)]">
        Headlines only, for information. Not investment advice.
      </p>
    </div>
  );
}
