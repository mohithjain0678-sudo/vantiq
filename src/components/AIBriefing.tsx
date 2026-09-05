"use client";

import { useEffect, useState } from "react";

export default function AIBriefing() {
  const [bullets, setBullets] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "empty">("loading");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch("/api/briefing", { cache: "no-store" });
        const json = await res.json();
        if (!mounted) return;
        if (Array.isArray(json.bullets) && json.bullets.length > 0) {
          setBullets(json.bullets);
          setStatus("ok");
        } else {
          setStatus("empty");
        }
      } catch {
        if (mounted) setStatus("empty");
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="border border-[color:var(--hairline)] rounded-sm p-6 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-lg">Today&apos;s briefing</h2>
        <span className="text-xs text-[color:var(--slate)]">What moved, in plain language</span>
      </div>

      {status === "loading" && (
        <p className="text-sm text-[color:var(--slate)]">Putting today&apos;s briefing together…</p>
      )}

      {status === "empty" && (
        <p className="text-sm text-[color:var(--slate)]">
          No briefing available right now — check back shortly.
        </p>
      )}

      {status === "ok" && (
        <ul className="space-y-2">
          {bullets.map((b, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="text-[color:var(--brass)]">—</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[color:var(--slate)] mt-4 pt-4 border-t border-[color:var(--hairline)]">
        AI-written summary of public data. Not investment advice.
      </p>
    </div>
  );
}
