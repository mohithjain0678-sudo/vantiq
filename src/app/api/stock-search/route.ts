import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/market/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchStocks(q);
  return NextResponse.json(
    { results },
    {
      headers: {
        // Short edge cache — search terms repeat a lot as users type/retype
        // similar prefixes, and NSE company identity doesn't change minute
        // to minute.
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
