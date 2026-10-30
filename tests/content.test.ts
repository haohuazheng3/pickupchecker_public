import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tokensIn, tokenValue, type Facts } from "@/lib/content/facts";
import { PRODUCT_COPY } from "@/content/product-pages";
import { PRODUCT_TITLES, HOME_TITLES, STORE_KEYWORDS } from "@/content/titles";
import { HOME_INTRO, HOME_SECTIONS, HOME_FAQ } from "@/content/home";
import { photo } from "@/lib/content/images";
import { MODELS, STORES, catalogFor, statesWithStores, citiesWithStores, hasStatePage, isOneStoreState, stateCodeOf } from "@/lib/apple/catalog";
import { storeTitle } from "@/lib/seo/enrich";
import { placeTitle, placeDescription, placeIntro, placeSections, type PlaceCopyInput } from "@/lib/seo/placeCopy";
import { storePhotos } from "@/content/store-photos";
import { placePhotos } from "@/content/place-photos";
import { SALES_TAX } from "@/content/sales-tax";
import { publicRouteCheck } from "@/lib/seo/routes";
import { hubFaq } from "@/lib/seo/placeCopy";
import { NOT_INDEXED_PRODUCTS, PRODUCTS, US, isIndexedProductPage, productBySlug } from "@/lib/seo/products";

/**
 * A site path that renders a page directly: the proxy neither redirects nor 404s it, and every segment
 * maps to a folder under src/app (the static one, else the dynamic [param] one) that ends in a page.
 */
function liveRoute(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  if (publicRouteCheck(path)) return false;
  let dir = join(process.cwd(), "src", "app");
  for (const seg of path.split("/").filter(Boolean)) {
    if (existsSync(join(dir, seg))) { dir = join(dir, seg); continue; }
    const dyn = readdirSync(dir).find((d) => d.startsWith("["));
    if (!dyn) return false;
    dir = join(dir, dyn);
    if (dyn.startsWith("[...") || dyn.startsWith("[[...")) break;
  }
  // An optional catch-all ([[...x]]) also matches zero further segments.
  const optional = readdirSync(dir).find((d) => d.startsWith("[[..."));
  if (!existsSync(join(dir, "page.tsx")) && optional) dir = join(dir, optional);
  return existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "route.ts"));
}

/** Facts with every number filled, so every token in the copy must resolve. */
const facts: Facts = {
  at: "2026-10-30T12:00:00Z",
  models: Object.fromEntries(MODELS.map((m) => {
    const items = catalogFor(m.key);
    const cfg = Object.fromEntries(items.map((i) => [`${i.storage} ${i.color}`, 3]));
    return [m.key, { key: m.key, unknown: false, storesNow: 5, pairsNow: 50, pairsTotal: 100, restocks: 9, soldouts: 8, medianMs: 60_000, lastRestockAt: "2026-10-30T10:00:00Z", topConfig: "256GB Night Sky", byConfig: cfg, byColor: Object.fromEntries(items.map((i) => [i.color, 4])), byStorage: Object.fromEntries(items.map((i) => [i.storage, 4])), restocksByConfig: cfg, restocksByColor: Object.fromEntries(items.map((i) => [i.color, 2])), restocksByStorage: Object.fromEntries(items.map((i) => [i.storage, 2])), restockStores: 6, priceLow: 1, priceHigh: 2 }];
  })) as Facts["models"],
};

/** Every piece of hand-written text on the stock pages. */
function allCopy(): string[] {
  const out: string[] = [HOME_INTRO, HOME_TITLES.description, ...HOME_TITLES.h2.map((h) => h.title)];
  for (const s of Object.values(HOME_SECTIONS)) out.push(s.lead, ...s.blocks.flatMap(blockText));
  for (const f of HOME_FAQ) out.push(f.q, f.a);
  for (const t of Object.values(PRODUCT_TITLES)) out.push(t.main.title, t.main.h1 ?? "", t.description, ...t.h2.map((h) => h.title));
  for (const c of Object.values(PRODUCT_COPY)) {
    out.push(c.intro);
    for (const s of Object.values(c.sections)) out.push(s.lead, ...s.blocks.flatMap(blockText));
    for (const f of c.faq) out.push(f.q, f.a);
  }
  return out;
}
function blockText(b: { t: string } & Record<string, unknown>): string[] {
  if (b.t === "p" || b.t === "h3" || b.t === "note") return [String(b.text)];
  if (b.t === "ul" || b.t === "ol") return b.items as string[];
  if (b.t === "table") return [...(b.head as string[]), ...(b.rows as string[][]).flat(), String(b.caption ?? ""), String(b.source ?? "")];
  return [];
}

const MARKERS = /\b(TODO|TBD|FIXME|XXX|lorem|ipsum|placeholder)\b|\[待|待补|待确认|占位|内部|备注|注：以下|示例数据|\bspec\b/i;

describe("hand-written copy", () => {
  it("has no internal notes, placeholders or Chinese in the English pages", () => {
    for (const t of allCopy()) {
      expect(t, t).not.toMatch(MARKERS);
      expect(t, t).not.toMatch(/[一-鿿]/);
    }
  });
  it("links only to pages that answer directly (no redirect, no 404)", () => {
    const links: string[] = [];
    for (const t of allCopy()) for (const m of t.matchAll(/\]\((\/[^)\s]*)\)/g)) links.push(m[1]);
    expect(links.length).toBeGreaterThan(5);
    expect(links.filter((h) => !liveRoute(h))).toEqual([]);
  });
  it("uses only live tokens that resolve", () => {
    for (const t of allCopy()) for (const k of tokensIn(t)) expect(tokenValue(k, facts), k).not.toBeNull();
  });
  it("binds every secondary keyword to a written section", () => {
    for (const [slug, t] of Object.entries(PRODUCT_TITLES)) {
      const c = PRODUCT_COPY[slug];
      expect(c, slug).toBeDefined();
      for (const h of t.h2) expect(c.sections[h.keyword], `${slug}: ${h.keyword}`).toBeDefined();
      expect(c.faq.length, slug).toBeGreaterThan(0);
    }
    for (const h of HOME_TITLES.h2) expect(HOME_SECTIONS[h.keyword], h.keyword).toBeDefined();
  });
  it("keeps titles within 60 characters and descriptions within 160", () => {
    for (const t of [HOME_TITLES, ...Object.values(PRODUCT_TITLES)]) {
      expect(t.main.title.length, t.main.title).toBeLessThanOrEqual(60);
      expect(t.description.length, t.description).toBeLessThanOrEqual(160);
    }
  });
  it("points every photo at a self-hosted file", () => {
    const ids = new Set<string>();
    for (const c of Object.values(PRODUCT_COPY)) { c.photos.forEach((p) => ids.add(p)); for (const s of Object.values(c.sections)) for (const b of s.blocks) if (b.t === "img") ids.add(b.id); }
    for (const s of Object.values(HOME_SECTIONS)) for (const b of s.blocks) if (b.t === "img") ids.add(b.id);
    for (const s of STORES) storePhotos(s).forEach((p) => ids.add(p));
    for (const s of statesWithStores()) placePhotos(s.name).forEach((p) => ids.add(p));
    for (const c of citiesWithStores()) placePhotos(`${c.name}, ${c.state}`).forEach((p) => ids.add(p));
    for (const id of ids) {
      const p = photo(id);
      expect(p, id).toBeDefined();
      for (const w of p!.widths) expect(existsSync(join(process.cwd(), "public", `${p!.base}-${w}.webp`)), `${id}-${w}`).toBe(true);
      expect(p!.alt.length, id).toBeGreaterThan(10);
    }
  });
});

describe("location pages", () => {
  const blank = { day: 0, week: 0, month: 0, soldouts: 0, medianMs: null, medianSamples: 0, restockStores: 0, lastRestock: null, daily: [], byPart: [], days: 30, tz: "America/New_York" };
  const input = (kind: "state" | "city", name: string, state: string, stores: typeof STORES): PlaceCopyInput => ({ kind, name, state, stateSlug: state.toLowerCase(), stores, cities: 2, stockNow: { duo: 0, "18-pro": stores.length, "18-pro-max": stores.length }, stock: new Map(), duo: blank, max: blank });
  it("gives every store, state and city page a unique title that starts with the place", () => {
    const titles = new Set<string>();
    for (const s of STORES) {
      const t = storeTitle(s, stateCodeOf(s), 0, isOneStoreState(s.state) ? s.state : undefined);
      expect(t.length).toBeLessThanOrEqual(60);
      expect(t.startsWith("Apple ")).toBe(true);
      titles.add(t);
    }
    expect(titles.size).toBe(STORES.length);
    const placeTitles = new Set<string>();
    for (const st of statesWithStores().filter((s) => hasStatePage(s.name))) placeTitles.add(placeTitle(input("state", st.name, st.name, STORES.filter((x) => x.state === st.name))));
    for (const c of citiesWithStores().filter((c) => c.stores.length > 1)) placeTitles.add(placeTitle(input("city", c.name, c.state, c.stores)));
    expect(placeTitles.size).toBe(statesWithStores().filter((s) => hasStatePage(s.name)).length + citiesWithStores().filter((c) => c.stores.length > 1).length);
    for (const t of placeTitles) { expect(t.length, t).toBeLessThanOrEqual(60); expect(t.startsWith("Apple Stores in "), t).toBe(true); }
  });
  it("writes intros, descriptions and sections that answer with numbers and carry no notes", () => {
    for (const st of statesWithStores().filter((s) => hasStatePage(s.name))) {
      const i = input("state", st.name, st.name, STORES.filter((x) => x.state === st.name));
      const text = [placeIntro(i), placeDescription(i), ...placeSections(i).flatMap((s) => [s.h2, s.lead, ...s.blocks.flatMap(blockText)])].join("\n");
      expect(text).not.toMatch(MARKERS);
      expect(placeDescription(i).length).toBeLessThanOrEqual(155);
      expect(placeSections(i).map((s) => s.id)).toEqual(SALES_TAX[st.name] ? ["iphone-duo", "iphone-18-pro-max", "price-with-tax"] : ["iphone-duo", "iphone-18-pro-max"]);
    }
  });
  it("names New York City and Washington State the way their own searches do", () => {
    const nyc = citiesWithStores().find((c) => c.name === "New York" && c.state === "New York")!;
    expect(placeTitle(input("city", nyc.name, nyc.state, nyc.stores))).toMatch(/^Apple Stores in NYC: /);
    const wa = STORES.filter((x) => x.state === "Washington");
    expect(placeTitle(input("state", "Washington", "Washington", wa))).toMatch(/^Apple Stores in Washington State: /);
    expect(placeTitle(input("state", "New York", "New York", STORES.filter((x) => x.state === "New York")))).toMatch(/^Apple Stores in New York: /);
    // No two indexable place pages may open with the same place name.
    const heads = new Map<string, string>();
    for (const st of statesWithStores().filter((s) => hasStatePage(s.name))) heads.set(placeTitle(input("state", st.name, st.name, STORES.filter((x) => x.state === st.name))).split(":")[0], `state ${st.name}`);
    for (const c of citiesWithStores().filter((c) => c.stores.length > 1)) {
      const head = placeTitle(input("city", c.name, c.state, c.stores)).split(":")[0];
      expect(heads.has(head), `${c.name}, ${c.state} vs ${heads.get(head)}`).toBe(false);
      heads.set(head, `city ${c.name}`);
    }
  });
  it("answers the hub questions from the store list and the tax table", () => {
    const { count, taxFree } = hubFaq();
    expect(count.a.startsWith(`${STORES.length}, in `)).toBe(true);
    const top = [...statesWithStores()].sort((a, b) => b.count - a.count)[0];
    expect(count.a).toContain(`${top.name} has the most (${top.count})`);
    for (const st of statesWithStores().filter((x) => SALES_TAX[x.name]?.combined === 0)) expect(taxFree.a).toContain(st.name);
    expect(taxFree.a).toMatch(/\$1,999 list price/);
  });
  it("has a 2026 sales-tax rate for every state with an Apple Store", () => {
    for (const st of statesWithStores()) expect(SALES_TAX[st.name], st.name).toBeDefined();
  });
});

describe("product index scope", () => {
  it("indexes national product pages except the storage sizes with no opening", () => {
    for (const slug of NOT_INDEXED_PRODUCTS) expect(productBySlug(slug)?.kind, slug).toBe("storage");
    expect(isIndexedProductPage(productBySlug("iphone-duo")!, US)).toBe(true);
    expect(isIndexedProductPage(productBySlug("iphone-18-pro-max-burgundy")!, US)).toBe(true);
    expect(isIndexedProductPage(productBySlug("iphone-duo-512gb")!, US)).toBe(false);
    expect(PRODUCTS.filter((p) => (p.kind === "storage" || p.kind === "color") && isIndexedProductPage(p, US))).toHaveLength(14);
  });
});

describe("keyword map", () => {
  it("binds only real stores", () => {
    const slugs = new Set(STORES.map((s) => s.slug));
    for (const slug of Object.keys(STORE_KEYWORDS)) expect(slugs.has(slug), slug).toBe(true);
  });
  it("leaves no marker in the source of the copy files", () => {
    for (const f of readdirSync(join(process.cwd(), "src", "content")).filter((x) => x.endsWith(".ts"))) {
      const src = readFileSync(join(process.cwd(), "src", "content", f), "utf8");
      expect(src, f).not.toMatch(/\b(TODO|TBD|FIXME|XXX)\b/);
    }
  });
});
