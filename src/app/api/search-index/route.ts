import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search";
import { buildCountrySearchIndex } from "@/lib/searchCountries";

/** The site-search index (the US, then the other countries): static data, prerendered at build time and cached at the edge. */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json([...buildSearchIndex(), ...buildCountrySearchIndex()], { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
