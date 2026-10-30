import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search";

/** The site-search index: static data, prerendered at build time and cached at the edge. */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildSearchIndex(), { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
