import { NextResponse } from "next/server";
import { countryFromPrefix } from "@/lib/apple/countries";
import { mapSnapshot } from "@/lib/stock/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public, read-only: every store's available part numbers, for the live map (?country=uk: that country's stores). */
export async function GET(req: Request) {
  const cc = countryFromPrefix(new URL(req.url).searchParams.get("country") ?? undefined)?.cc ?? "us";
  const snap = await mapSnapshot(cc);
  return NextResponse.json(snap, { headers: { "cache-control": "public, max-age=5, s-maxage=5, stale-while-revalidate=15" } });
}
