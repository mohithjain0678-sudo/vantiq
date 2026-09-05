import { getTicks } from "./ticker";
import { getNews } from "./news";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours — this is a "daily" briefing, not a live feed
const FETCH_TIMEOUT_MS = 15_000;
const GROQ_MODEL = "openai/gpt-oss-120b"; // Groq's current recommended general-purpose model

type CacheEntry = { text: string[]; fetchedAt: number };
let cache: CacheEntry | null = null;

const SYSTEM_PROMPT = `You write a short daily market note for Vantiq, a personal-finance app used by Indian college students. Follow these rules strictly:
1. NEVER recommend buying, selling, or holding any security, and never suggest one action is better than another.
2. NEVER give a price target, forecast, or prediction of future movement.
3. Only describe what the provided data already shows — do not invent numbers, events, or causes not present in the data.
4. Do not quote any headline verbatim — always paraphrase in your own words.
5. Write 3 to 4 short bullet points, plain language, no jargon, as if explaining to a smart friend who has 5 minutes before class. Keep each bullet under 20 words.
6. Each bullet should be one complete sentence — never cut off mid-thought.
7. Output ONLY the bullet points, one per line, each starting with "- ". No heading, no intro, no closing remark, no disclaimer (the app adds its own disclaimer separately).`;

function buildUserPrompt(
  ticks: Awaited<ReturnType<typeof getTicks>>,
  news: Awaited<ReturnType<typeof getNews>>
): string {
  const indices = ticks.filter((t) => t.symbol === "NIFTY 50" || t.symbol === "SENSEX");
  const stocks = ticks.filter((t) => t.symbol !== "NIFTY 50" && t.symbol !== "SENSEX");
  const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const movers = sorted.slice(0, 4);

  const indexLines = indices
    .map((t) => `${t.symbol}: ${t.price} (${t.change >= 0 ? "+" : ""}${t.change.toFixed(2)}%)`)
    .join("\n");
  const moverLines = movers
    .map((t) => `${t.symbol}: ${t.price} (${t.change >= 0 ? "+" : ""}${t.change.toFixed(2)}%)`)
    .join("\n");
  const headlineLines = news.items
    .slice(0, 6)
    .map((n) => `- ${n.title} (${n.source})`)
    .join("\n");

  return `Index levels today:
${indexLines || "(unavailable)"}

Biggest movers among tracked stocks:
${moverLines || "(unavailable)"}

Recent Indian business headlines:
${headlineLines || "(none available)"}

Write the briefing following all the rules.`;
}

async function callGroq(prompt: string): Promise<{ lines: string[] | null; debug?: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { lines: null, debug: "no API key at call time" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      // Surface Groq's actual error body so we can tell an invalid key apart
      // from a bad/unavailable model name, rate limiting, etc.
      let bodyText = "";
      try {
        bodyText = (await res.text()).slice(0, 300);
      } catch {
        // ignore
      }
      return { lines: null, debug: `HTTP ${res.status}: ${bodyText}` };
    }

    const json = await res.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    if (!content) return { lines: null, debug: "empty response content from Groq" };

    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-*•]\s*/.test(l))
      .map((l) => l.replace(/^[-*•]\s*/, ""))
      // Drop a trailing bullet that looks cut off (no sentence-ending
      // punctuation) rather than show a truncated fragment to users.
      .filter((l, i, arr) => i < arr.length - 1 || /[.!?]$/.test(l));

    if (lines.length === 0) {
      return { lines: null, debug: `no bullet lines parsed from: ${content.slice(0, 200)}` };
    }
    return { lines };
  } catch (e) {
    return { lines: null, debug: e instanceof Error ? `${e.name}: ${e.message}` : "unknown fetch error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBriefing(): Promise<{
  bullets: string[];
  updatedAt: number | null;
  stale?: boolean;
  error?: string;
}> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { bullets: cache.text, updatedAt: cache.fetchedAt };
  }

  if (!process.env.GROQ_API_KEY) {
    return { bullets: [], updatedAt: null, error: "GROQ_API_KEY is not set" };
  }

  const [ticks, news] = await Promise.all([getTicks(), getNews()]);
  const prompt = buildUserPrompt(ticks, news);
  const { lines: bullets, debug } = await callGroq(prompt);

  if (bullets) {
    cache = { text: bullets, fetchedAt: now };
    return { bullets, updatedAt: now };
  }

  if (cache) {
    return { bullets: cache.text, updatedAt: cache.fetchedAt, stale: true, error: `Groq request failed: ${debug}` };
  }

  return { bullets: [], updatedAt: null, error: `Groq request failed and no cached briefing available (${debug})` };
}
