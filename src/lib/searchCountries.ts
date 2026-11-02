/**
 * The site-search entries of the other 18 countries (server only: built from every country's stores and
 * served with the US index by /api/search-index; the browser never imports this data). Every label carries
 * its country, so "Birmingham, UK" and "Birmingham, AL" sit side by side.
 */
import { storesOf, storePath } from "./apple/catalog";
import { COUNTRIES, INTL_CODES } from "./apple/countries";
import { regionRefs, cityRefs } from "./seo/countryLinks";
import { norm } from "./text";
import type { SearchEntry } from "./search";

export function buildCountrySearchIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const cc of INTL_CODES) {
    const c = COUNTRIES[cc];
    const stores = storesOf(cc);
    const tag = `${norm(c.name)} ${norm(c.short)} ${cc}`;
    out.push({ k: "country", l: c.name, s: `${stores.length} Apple Store${stores.length === 1 ? "" : "s"} · iPhone stock checker`, h: `/${cc}`, q: `${tag} ${norm(c.adjective)} country` });
    const regions = regionRefs(cc);
    // A country whose one region is the whole country (Singapore, Hong Kong, Taiwan) has no region level to search.
    if (regions.length > 1) for (const r of regions) out.push({ k: "state", l: `${r.name}, ${c.short}`, s: `${r.count} store${r.count === 1 ? "" : "s"} · ${c.name}`, h: r.href, q: `${norm(r.name)} ${norm(r.code)} ${tag}` });
    for (const x of cityRefs(cc)) out.push({ k: "city", l: `${x.name}, ${c.short}`, s: `${x.count} store${x.count === 1 ? "" : "s"} · ${regions.length > 1 ? `${x.state}, ` : ""}${c.name}`, h: x.href, q: `${norm(x.name)} ${norm(x.state)} ${tag}` });
    for (const s of stores) out.push({ k: "store", l: s.name, s: `${s.city}, ${c.short}${s.street ? ` · ${s.street}` : ""}`, h: storePath(s), q: `${norm(s.name)} ${norm(s.city)} ${norm(s.state)} ${tag} ${norm(s.postalCode ?? "")} ${norm(s.street ?? "")}`.replace(/\s+/g, " ").trim() });
  }
  // A one-store city's entry and its store's go to the same page: keep one per kind and page.
  const seen = new Set<string>();
  return out.filter((e) => { const k = `${e.k}:${e.h}`; if (seen.has(k)) return false; seen.add(k); return true; });
}
