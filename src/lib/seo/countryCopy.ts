/**
 * Titles, Answer-First intros, keyword sections and FAQs for the pages of the other 18 countries (seo.md §12):
 * the country home, its store index, region, city and model pages. Every sentence is built from that country's
 * live stock, its restock log, its apple.com prices and its tax rule, so a page says what only that place's
 * data can say. All English; prices in the local currency; distances in the country's unit.
 */
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, appleName, modelByKey, type ModelKey, type Store } from "../apple/catalog";
import { COUNTRIES, formatPrice, theName, type Country, type CountryCode } from "../apple/countries";
import type { PlaceStats, StoreStockSummary } from "../stock/queries";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, includedRate, taxName, withProvinceTax } from "@/content/country-tax";
import { fitTitle, fmtDuration, listWords, plural, alertHref, type FaqItem } from "./enrich";
import type { Block } from "../content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";

/** Other countries' stores have been checked since this day (the US since October 29). */
export const INTL_TRACKING_SINCE = "2026-11-02";

/** "since tracking began on November 2" while the 30-day window still reaches back to the start, else "in the last 30 days". */
export function sinceWhenIntl(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "since tracking began on November 2" : "in the last 30 days";
}

const money = (c: Country, v: number) => formatPrice(c, v);

/** Lowest price of a model in one storage size (colours cost the same), in the country's currency. */
export function priceOf(cc: CountryCode, model: ModelKey, storage = "256GB"): number | null {
  const prices = catalogFor(model, cc).filter((i) => i.storage === storage).map((i) => i.price);
  return prices.length ? Math.min(...prices) : null;
}
/** Lowest and highest price of a model. */
export function priceRange(cc: CountryCode, model: ModelKey): { low: number; high: number } {
  const p = catalogFor(model, cc).map((i) => i.price);
  return { low: Math.min(...p), high: Math.max(...p) };
}

/** Place names that are also US Apple Store cities or states get the country (seo.md §12: "Manchester, UK"). */
const US_NAMES = new Set([...citiesWithStores("us").map((c) => c.name.toLowerCase()), ...statesWithStores("us").map((s) => s.name.toLowerCase())]);
export function placeLabel(cc: CountryCode, name: string): string {
  return US_NAMES.has(name.toLowerCase()) ? `${name}, ${COUNTRIES[cc].short}` : name;
}

/** "City" where Taiwan's regions are cities; "province", "prefecture"… */
const noun = (c: Country, plural = false) => (plural ? c.regionNounPlural : c.regionNoun) ?? (plural ? "areas" : "area");

/* ------------------------------------------------------------------ tax */

/** One sentence: what a 256GB Duo costs here and what tax that holds (region = a Canadian province, when known). */
export function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `Apple's ${money(c, duo)} for a 256GB iPhone Duo excludes tax; with ${region}'s ${t.rate}% ${CA_PROVINCE_TAX[region!].label} it comes to about ${money(c, t.total)}.`;
    return `Apple's ${money(c, duo)} for a 256GB iPhone Duo excludes tax: you pay 5% to 15% on top, by province.`;
  }
  const r = includedRate(c);
  if (r == null) return `A 256GB iPhone Duo is ${money(c, duo)}, and with no sales tax in Hong Kong that is what you pay at pickup.`;
  return `A 256GB iPhone Duo is ${money(c, duo)} ${c.inName}, ${r}% ${taxName(c)} included: the apple.com price is what you pay at pickup.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** The price section of a place or model page: Canada adds its province taxes, everyone else shows what the price holds. */
export function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const src = TAX_SOURCES[cc as Exclude<CountryCode, "us">];
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const table: Block = {
        t: "table",
        head: ["iPhone", "apple.com price", `With ${t.total}% ${t.label}`],
        rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]),
        caption: `${region}: Apple's Canadian price plus ${t.label} (${t.total}%)`,
        source: `[${src.label}](${src.url}); prices from apple.com/ca`,
      };
      return {
        id: "price-with-tax",
        h2: `${m.name} price in ${placeName} with sales tax`,
        lead: `The 256GB ${m.name} is **${money(c, base)} before tax**; with ${region}'s ${t.hst ? `${t.hst}% HST` : t.pst ? `${t.gst}% GST and ${t.pst}% ${t.label.split(" + ")[1]}` : `${t.gst}% GST (no provincial sales tax)`} it comes to about **${money(c, withProvinceTax(base, region!)!.total)}** at a store in ${placeName}.`,
        blocks: [{ t: "note", text: "**Tax is charged where you pick up:** the store's province sets the rate, not your home address." }, table],
      };
    }
    // The whole country: one row per province with a store.
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `${m.name} price in Canada with sales tax, by province`,
      lead: `Apple's **${money(c, base)}** for a 256GB ${m.name} excludes tax; the pickup store's province adds it, from **${money(c, withProvinceTax(base, cheapest)!.total)}** in ${cheapest} (${CA_PROVINCE_TAX[cheapest].total}%) to **${money(c, withProvinceTax(base, dearest)!.total)}** in ${dearest} (${CA_PROVINCE_TAX[dearest].total}%).`,
      blocks: [{
        t: "table",
        head: ["Province", "Tax", "Rate", `${m.short} 256GB with tax`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, `${CA_PROVINCE_TAX[p].total}%`, money(c, withProvinceTax(base, p)!.total)]),
        caption: "Provinces with an Apple Store: sales tax on an in-store pickup",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); prices from apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxName(c);
  return {
    id: "price",
    h2: `${m.name} price ${c.inName}: ${money(c, base)}, ${c.taxNote}`,
    lead: r == null
      ? `**${money(c, base)}** for the 256GB ${m.name} on apple.com is what you pay at pickup in ${placeName}: Hong Kong has **no sales tax** or VAT.`
      : `The 256GB ${m.name} is **${money(c, base)}** ${c.inName}, **${r}% ${tn} included** (${money(c, beforeTax(c, base))} before tax), and nothing is added at pickup in ${placeName}.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "apple.com price"] : ["iPhone", "apple.com price", `Before ${r}% ${tn}`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: `Apple's ${c.adjective} prices${r == null ? "" : `, ${tn} included`}`,
      source: `[${src.label}](${src.url}); prices from apple.com/${c.buyPath ?? c.shopPath}`,
    }],
  };
}

/** The tax question for a FAQ. */
export function taxFaqIntl(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `How much is the iPhone Duo with tax in ${placeName}?`, a: `About ${money(c, t.total)} for the 256GB: Apple's ${money(c, duo)} plus ${region}'s ${t.rate}% ${CA_PROVINCE_TAX[region!].label}, charged where you pick up.` }
      : { q: "Does Apple's Canadian price include tax?", a: `No. The 256GB iPhone Duo is ${money(c, duo)} before tax; GST, HST or provincial sales tax is added by the province of the store, from 5% in Alberta to 14.975% in Quebec.` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "Is there sales tax on an iPhone in Hong Kong?", a: `No. Hong Kong has no sales tax or VAT, so the 256GB iPhone Duo costs ${money(c, duo)} at pickup, exactly the apple.com price.` }
    : { q: `Does the apple.com price ${c.inName} include ${taxName(c)}?`, a: `Yes. ${money(c, duo)} for the 256GB iPhone Duo includes ${r}% ${taxName(c)}; nothing is added when you collect it in store.` };
}

/* ------------------------------------------------------------------ region / city pages */

export interface IntlPlaceInput {
  cc: CountryCode;
  kind: "state" | "city";
  /** "Ontario" or "Toronto". */
  name: string;
  /** The region (province, state…) the place is in, or is. */
  region: string;
  regionSlug: string;
  citySlug?: string;
  stores: Store[];
  cities?: number;
  stockNow: Record<ModelKey, number>;
  stock: Map<string, StoreStockSummary>;
  duo: PlaceStats;
  max: PlaceStats;
}

export function intlPlaceTitle(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeLabel(i.cc, i.name);
  return fitTitle([
    `Apple Stores in ${w}: Live iPhone Duo Stock at ${n === 2 ? "Both" : `All ${n}`}`,
    `Apple Stores in ${w}: Live iPhone Duo Stock`,
    `Apple Stores in ${w}: iPhone Stock Today`,
    `${w} Apple Stores: iPhone Stock`,
  ]);
}

/** The description's price clause. */
function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, about ${money(c, t.total)} with ${region} tax` : `, ${money(c, duo)} before tax`; }
  return `, ${money(c, duo)} ${c.taxNote}`;
}

export function intlPlaceDescription(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeLabel(i.cc, i.name);
  return fitTitle([
    `${n} Apple Stores in ${w}: ${i.stockNow.duo} have the iPhone Duo for pickup now, ${i.stockNow["18-pro-max"]} the 18 Pro Max. Live stock by store, restock times${priceBit(i.cc, i.region)}.`,
    `${n} Apple Stores in ${w}: ${i.stockNow.duo} with iPhone Duo pickup stock now, ${i.stockNow["18-pro-max"]} with the 18 Pro Max. Live by store, restock times.`,
  ], 155);
}

/** One sentence: how many stores, and how many list each model right now (the price has its own section). */
export function intlPlaceIntro(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? ` across ${plural(i.cities, "city", "cities")}` : "";
  return `**${plural(n, "Apple Store")}** in ${i.name}${cities}: **${i.stockNow.duo}** list an iPhone Duo for pickup now, **${i.stockNow["18-pro-max"]}** the 18 Pro Max, **${i.stockNow["18-pro"]}** the 18 Pro.`;
}

/** "Nov 2, 3:04 PM GMT" in the country's zone. */
export function whenIn(cc: CountryCode, iso: string | Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: COUNTRIES[cc].timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
}

function scarcest(i: IntlPlaceInput, model: ModelKey, k = 2): { label: string; stores: number }[] {
  const items = catalogFor(model, i.cc);
  const counts = new Map<string, number>(items.map((c) => [c.partNumber, 0]));
  for (const s of i.stores) for (const p of i.stock.get(s.storeNumber)?.perModel[model].parts ?? []) if (counts.has(p)) counts.set(p, (counts.get(p) ?? 0) + 1);
  const by = new Map(items.map((c) => [c.partNumber, c]));
  return [...counts.entries()].map(([p, n]) => ({ label: `${by.get(p)!.storage} ${by.get(p)!.color}`, stores: n })).sort((a, b) => a.stores - b.stores).slice(0, k);
}

function pairsPct(i: IntlPlaceInput, model: ModelKey): number {
  const total = i.stores.length * catalogFor(model, i.cc).length;
  const avail = i.stores.reduce((a, s) => a + (i.stock.get(s.storeNumber)?.perModel[model].available ?? 0), 0);
  return Math.round((100 * avail) / Math.max(1, total));
}

const duoStoresNow = (i: IntlPlaceInput) => i.stores.filter((s) => (i.stock.get(s.storeNumber)?.perModel.duo.available ?? 0) > 0);

/** The Duo section's one-sentence answer: which stores list one right now. */
function duoLead(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${have.length} of ${n} stores** list an iPhone Duo right now: ${listWords(have.map((s) => appleName(s)), 4)}.`;
  if (st.month > 0) return `**None of the ${n} stores** lists an iPhone Duo right now, but they have restocked it **${plural(st.month, "time")}** ${sinceWhenIntl()}.`;
  return `**None of the ${n} stores** lists an iPhone Duo right now, and none has logged a Duo restock ${sinceWhenIntl()}.`;
}

/** The Duo section's key points: the restock record, the last one, how long a listing lasted, and the alert. */
function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const n = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**Logged ${sinceWhenIntl()}:** ${plural(st.month, "Duo restock")} at stores here`);
  if (st.lastRestock && last) items.push(`**Last restock:** ${whenIn(i.cc, st.lastRestock.at)} at ${appleName(last)}`);
  if (st.medianMs != null) items.push(`**Typical listing:** a restocked Duo stayed listed about ${fmtDuration(st.medianMs)} (median)`);
  items.push(`**Fastest route:** [set an iPhone Duo alert in ${w}](${alert}) at the ${n <= 3 ? (n === 2 ? "two" : "three") : `${Math.min(n, 5)} closest`} stores you can reach`);
  items.push("**One alert** = one store × one exact configuration; the push arrives seconds after a store lists it");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**That can change in a minute:** the fastest way to get one is an alert, not refreshing apple.com." });
  blocks.push({ t: "ul", items });
  return blocks;
}

export function intlPlaceSections(i: IntlPlaceInput): KeywordSection[] {
  const n = i.stores.length;
  const w = i.name;
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    {
      id: "iphone-duo",
      h2: `iPhone Duo in ${w}: which stores have it now`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max in ${w}: stock by store`,
      lead: `**${i.stockNow["18-pro-max"]} of ${n} stores** list an iPhone 18 Pro Max, with **${pairsPct(i, "18-pro-max")}%** of the ${n * pm} store × configuration pairs here in stock.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Scarcest right now:** ${listWords(scarce.map((x) => `${x.label} (${x.stores} of ${n} stores)`))}`] : []),
        `**iPhone 18 Pro:** at ${i.stockNow["18-pro"]} of ${n} stores, ${pairsPct(i, "18-pro")}% of pairs in stock`,
        `**Logged ${sinceWhenIntl()}:** ${i.max.month ? plural(i.max.month, "18 Pro Max restock") : "no 18 Pro Max restock yet"}`,
        ...(i.max.medianMs != null ? [`**Typical listing:** a restocked Pro Max stayed listed about ${fmtDuration(i.max.medianMs)} (median)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

export function storesIndexTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const w = theName(COUNTRIES[cc]);
  return fitTitle([`Apple Stores in ${w}: Live iPhone Duo Stock at ${n === 2 ? "Both" : `All ${n}`}`, `Apple Stores in ${w}: Live iPhone Duo Stock`, `Apple Stores in ${COUNTRIES[cc].short}: Live iPhone Stock`], 70);
}

export function homeTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return `iPhone Stock Checker ${COUNTRIES[cc].short}: ${plural(n, "Apple Store")}, Checked Every 15s`;
}

export function homeH1(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const c = COUNTRIES[cc];
  return n === 1 ? `iPhone stock checker for the Apple Store ${c.inName}` : `iPhone stock checker for all ${n} Apple Stores ${c.inName}`;
}

/** "the 39 Apple Stores in the UK" / "the one Apple Store in Austria". */
export function allStoresPhrase(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return n === 1 ? `the one Apple Store ${COUNTRIES[cc].inName}` : `all ${n} Apple Stores ${COUNTRIES[cc].inName}`;
}

/** Where a country's stores are, in one sentence ("in 22 cities across 6 provinces"). */
export function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const n = storesOf(cc).length;
  if (n === 1) return `in ${cities[0].name}`;
  if (cities.length === 1) return `all in ${cities[0].name}`;
  if (!c.regionNoun || regions.length === 1) return `in ${plural(cities.length, "city", "cities")}`;
  return `in ${plural(cities.length, "city", "cities")} across ${regions.length} ${noun(c, regions.length !== 1)}`;
}

/** The model page's bound titles (seo.md §12): "{Model} in Stock {inCountry}: Live at All {n} Apple Stores". */
export function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const all = n === 1 ? "the Apple Store" : n === 2 ? "Both Apple Stores" : `All ${n} Apple Stores`;
  return {
    title: fitTitle([`${m.name} in Stock ${c.inName}: Live at ${all}`, `${m.name} in Stock ${c.inName}: Live`, `${m.name} Stock ${c.inName}`], 70),
    h2: [`${m.name} near me: the stores ${c.inName} that have it now`, priceSection(cc, theName(c), undefined, model).h2],
  };
}

/** The model page's Answer-First intro and description. */
export function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const r = priceRange(cc, model);
  const price = cc === "ca" ? `**${money(c, r.low)}** before tax` : `**${money(c, r.low)}**, ${c.taxNote}`;
  return `${inStock === 0 ? `**None** of the ${n === 1 ? "one Apple Store" : `${n} Apple Stores`} ${c.inName} lists the ${m.name} for pickup now` : `**${inStock} of ${n}** Apple Stores ${c.inName} list the ${m.name} for pickup now`} (checked **every 15 seconds**); prices from ${price}.`;
}

export function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const r = priceRange(cc, model);
  return fitTitle([
    `Is the ${m.name} in stock ${c.inName}? ${inStock} of ${n} Apple Stores have it for pickup now. Live by store and configuration, from ${money(c, r.low)}${cc === "ca" ? " before tax" : ""}, with restock times.`,
    `${m.name} ${c.inName}: ${inStock} of ${n} Apple Stores have it now. Live pickup stock by store and configuration, restock times and alerts.`,
  ], 155);
}

/** Every model's stock line for the country home's table. */
export function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, String(catalogFor(m.key, cc).length), String(storesNow[m.key] ?? 0), String(restocks[m.key] ?? 0)]);
}
