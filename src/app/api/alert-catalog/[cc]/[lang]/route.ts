import { NextResponse } from "next/server";
import { buildPhoneCatalog } from "@/components/alerts/catalog";
import { COUNTRIES_WITH_PAGES, type CountryCode } from "@/lib/apple/countries";
import { localesOf, type Lang } from "@/lib/i18n/locales";

/**
 * The alert lightbox's catalogue (phones × prices, and another country's stores) for one country in one of its
 * page languages. Static data: prerendered at build time, cached at the edge, fetched only when the lightbox opens
 * (no page carries it any more).
 */
export const dynamicParams = false;

const pairs = (): { cc: string; lang: string }[] => [
  { cc: "us", lang: "en" },
  ...[...COUNTRIES_WITH_PAGES].filter((cc) => cc !== "us").flatMap((cc) => localesOf(cc).map((l) => ({ cc, lang: l.lang }))),
];

export function generateStaticParams() {
  return pairs().map((p) => ({ cc: p.cc, lang: encodeURIComponent(p.lang) }));
}

export async function GET(_req: Request, ctx: { params: Promise<{ cc: string; lang: string }> }) {
  const { cc, lang: raw } = await ctx.params;
  const lang = decodeURIComponent(raw);
  if (!pairs().some((p) => p.cc === cc && p.lang === lang)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(buildPhoneCatalog(cc as CountryCode, lang as Lang), { headers: { "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } });
}
