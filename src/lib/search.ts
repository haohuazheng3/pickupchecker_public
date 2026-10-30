/**
 * Site search: one small index (states, cities, stores, models, pages) built from the catalog, and a
 * dependency-free matcher that runs in the browser. The index is served by /api/search-index.
 */
import { MODELS, STORES, statePath, cityPath, storePath, stateCodeOf, type ModelKey } from "./apple/catalog";
import { stateRefs, cityRefs } from "./seo/links";
import { rankStores, zipAnchor } from "./geo";
import { norm } from "./text";

export { norm };

export type SearchKind = "store" | "city" | "state" | "model" | "page";
/** k = kind, l = label, s = sub-label, h = href, q = normalised searchable words. */
export interface SearchEntry { k: SearchKind; l: string; s: string; h: string; q: string }


const PAGES: [string, string, string, string][] = [
  ["Live stock map", "All 269 stores, live", "/map", "map live stock stores near me"],
  ["Restock log", "Restocks and sell-outs, newest first", "/restocks", "restocks restock log history sold out feed"],
  ["Get the app", "Home Screen app for phone notifications", "/install", "install app home screen notifications push alerts iphone android get the app"],
  ["Set up an alert", "One store × one exact phone per alert", "/#notify", "alert alerts notify get notified new watch"],
  ["My alerts", "Alerts, devices, plan", "/account", "account my alerts rules devices plan billing sign in"],
  ["Pricing", "$5 · $10 · $20 a month", "/pricing", "pricing plans plus pro max price cost subscription upgrade"],
  ["How it works", "What we check and how fast", "/how-it-works", "how it works faq about speed"],
  ["Stores by state", "All 269 US Apple Stores", "/stores", "stores states cities all list directory"],
  ["Contact", "hello@pickupchecker.com", "/contact", "contact support help email"],
];

export function buildSearchIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const [l, s, h, q] of PAGES) out.push({ k: "page", l, s, h, q });
  for (const m of MODELS) {
    const base = `${norm(m.name)} ${norm(m.short)} ${norm(m.blurb)}`;
    out.push({ k: "model", l: `${m.name} stock`, s: "Live pickup stock by store", h: `/stock/${m.slug}`, q: `${base} stock live` });
    out.push({ k: "model", l: `${m.name} restocks`, s: "Restock log", h: `/restocks?model=${m.key as ModelKey}`, q: `${base} restocks restock log` });
    out.push({ k: "model", l: `${m.name} map`, s: "Where it is in stock right now", h: `/map?model=${m.key as ModelKey}`, q: `${base} map` });
  }
  for (const st of stateRefs()) out.push({ k: "state", l: st.name, s: `${st.count} store${st.count === 1 ? "" : "s"}`, h: st.href, q: `${norm(st.name)} ${st.code.toLowerCase()} state` });
  for (const c of cityRefs()) out.push({ k: "city", l: `${c.name}, ${c.stateCode}`, s: `${c.count} store${c.count === 1 ? "" : "s"} · ${c.state}`, h: c.href, q: `${norm(c.name)} ${c.stateCode.toLowerCase()} ${norm(c.state)}` });
  for (const s of STORES) {
    const code = stateCodeOf(s);
    out.push({ k: "store", l: s.name, s: `${s.city}, ${code}${s.street ? ` · ${s.street}` : ""}`, h: storePath(s), q: `${norm(s.name)} ${norm(s.city)} ${code.toLowerCase()} ${norm(s.state)} ${s.postalCode ?? ""} ${norm(s.street ?? "")}`.trim() });
  }
  return out;
}

const KIND_WEIGHT: Record<SearchKind, number> = { page: 5, model: 4, state: 3, city: 2, store: 1 };

/**
 * Every token must match; label matches outrank word matches, which outrank substrings; ties go to
 * broader pages, then to index order. A bare ZIP code lists the nearest stores by distance.
 */
export function searchIndex(entries: SearchEntry[], query: string, limit = 9): SearchEntry[] {
  const raw = query.trim();
  if (/^\d{5}$/.test(raw)) {
    // A ZIP lists the nearest stores by distance (the same ranking as the wizard), even when no store
    // shares its sectional area.
    const a = zipAnchor(raw);
    if (!a) return [];
    const byHref = new Map(entries.filter((e) => e.k === "store").map((e) => [e.h, e]));
    return rankStores(a).map((st) => byHref.get(storePath(st))).filter((e): e is SearchEntry => Boolean(e)).slice(0, limit);
  }
  const tokens = norm(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return [];
  const scored: { e: SearchEntry; score: number; i: number }[] = [];
  entries.forEach((e, i) => {
    const label = norm(e.l);
    const words = e.q.split(" ");
    let score = 0;
    for (const t of tokens) {
      let best = 0;
      if (label === t) best = 6;
      else if (label.startsWith(t)) best = 5;
      else if (words.includes(t)) best = 4;
      else if (words.some((w) => w.startsWith(t))) best = 3;
      else if (e.q.includes(t)) best = 2;
      if (best === 0) { score = 0; break; }
      score += best;
    }
    if (score > 0) scored.push({ e, score: score * 10 + KIND_WEIGHT[e.k], i });
  });
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).slice(0, limit).map((x) => x.e);
}

// Keep the path helpers referenced so the catalog's URL scheme stays the single source of truth.
void statePath; void cityPath;
