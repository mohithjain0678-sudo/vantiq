import { NextResponse } from "next/server";
import { getBriefing } from "@/lib/market/briefing";

export async function GET() {
  const { bullets, updatedAt, error, stale } = await getBriefing();
  return NextResponse.json(
    { bullets, updatedAt, stale: !!stale, error },
    {
      headers: {
        "Cache-Control": "public, s-maxage=10800, stale-while-revalidate=3600",
      },
    }
  );
}
