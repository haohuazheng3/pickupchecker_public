/**
 * /sitemap-places.xml: the iPhone Duo region and city pages open to answer engines and Bing but not Google
 * (lib/seo/aiOpen.ts, owner 2026-11-18). Kept out of robots.txt and out of /sitemap.xml on purpose — Google may not
 * crawl them (robots.txt) and would only report them as blocked — and submitted to Bing Webmaster Tools by hand and by
 * scripts/ops/bing-daily.mjs. lastmod = the latest real availability event at the place's stores.
 */
import { INTL_CODES } from "@/lib/apple/countries";
import { aiOpenEntries } from "@/lib/seo/aiOpen";
import { latestEventPerStore } from "@/lib/stock/queries";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const open = process.env.NEXT_PUBLIC_INDEXABLE === "1";
  const now = new Date();
  const entries = open ? aiOpenEntries() : [];
  const latest = open ? Object.assign({}, ...(await Promise.all([latestEventPerStore(), ...INTL_CODES.map((cc) => latestEventPerStore(cc))]))) as Record<string, string> : {};
  const lastmod = (storeNumbers: string[]): string => {
    let best = "";
    for (const n of storeNumbers) { const iso = latest[n]; if (iso && iso > best) best = iso; }
    return best ? new Date(best).toISOString() : now.toISOString();
  };
  const body = entries.map((e) => `<url><loc>${esc(base + e.path)}</loc><lastmod>${lastmod(e.storeNumbers)}</lastmod><changefreq>hourly</changefreq><priority>0.7</priority></url>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } });
}
