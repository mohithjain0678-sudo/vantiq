import { NextResponse } from "next/server";
import { getTicks, getTicksCacheTimestamp } from "@/lib/market/ticker";

export async function GET() {
  const data = await getTicks();
  return NextResponse.json(
    { ticks: data, updatedAt: getTicksCacheTimestamp() ?? Date.now() },
    {
      headers: {
        // Let Vercel's edge cache absorb repeat requests between refreshes.
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
