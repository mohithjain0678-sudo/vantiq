import { NextResponse } from "next/server";
import { getNews, getNewsCacheTimestamp } from "@/lib/market/news";

export async function GET() {
  const { items, error, stale } = await getNews();
  return NextResponse.json(
    { items, updatedAt: getNewsCacheTimestamp(), stale: !!stale, error },
    {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    }
  );
}
