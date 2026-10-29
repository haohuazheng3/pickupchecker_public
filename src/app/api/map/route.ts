import { NextResponse } from "next/server";
import { mapSnapshot } from "@/lib/stock/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, read-only: every store's available part numbers, for the live map. */
export async function GET() {
  const snap = await mapSnapshot();
  return NextResponse.json(snap, { headers: { "cache-control": "public, max-age=10, s-maxage=10, stale-while-revalidate=30" } });
}
