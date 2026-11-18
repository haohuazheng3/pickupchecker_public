/** Hand-written sitemap files (the product pages beyond /sitemap.xml, lib/seo/aiOpen.ts): XML and lastmod. */
import { INTL_CODES } from "@/lib/apple/countries";
import { latestEventPerStore } from "@/lib/stock/queries";
import type { PageEntry } from "./aiOpen";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const HEADERS = { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

/** Every store's latest real availability event (ISO), all countries. */
export async function latestByStore(): Promise<Record<string, string>> {
  return Object.assign({}, ...(await Promise.all([latestEventPerStore(), ...INTL_CODES.map((cc) => latestEventPerStore(cc))])));
}

/** A <urlset>; lastmod = the newest event at the entry's stores (now when none is known). */
export function urlset(entries: PageEntry[], latest: Record<string, string>, base: string): Response {
  const now = new Date().toISOString();
  const lastmod = (storeNumbers: string[]): string => {
    let best = "";
    for (const n of storeNumbers) { const iso = latest[n]; if (iso && iso > best) best = iso; }
    return best ? new Date(best).toISOString() : now;
  };
  const body = entries.map((e) => `<url><loc>${esc(base + e.path)}</loc><lastmod>${lastmod(e.storeNumbers)}</lastmod></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, { headers: HEADERS });
}

/** A <sitemapindex> of absolute URLs. */
export function sitemapIndex(urls: string[]): Response {
  const now = new Date().toISOString();
  const body = urls.map((u) => `<sitemap><loc>${esc(u)}</loc><lastmod>${now}</lastmod></sitemap>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`, { headers: HEADERS });
}
