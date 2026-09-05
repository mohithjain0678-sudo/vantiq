import { NextRequest, NextResponse } from "next/server";
import { fetchQuoteBySymbol } from "@/lib/market/ticker";

export async function GET(req: NextRequest) {
  const displaySymbol = req.nextUrl.searchParams.get("symbol");
  const yahooSymbol = req.nextUrl.searchParams.get("yahooSymbol");

  if (!displaySymbol || !yahooSymbol) {
    return NextResponse.json({ error: "symbol and yahooSymbol are required" }, { status: 400 });
  }

  const tick = await fetchQuoteBySymbol(displaySymbol, yahooSymbol);
  if (!tick) {
    return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
  }

  return NextResponse.json(
    { tick },
    {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    }
  );
}
