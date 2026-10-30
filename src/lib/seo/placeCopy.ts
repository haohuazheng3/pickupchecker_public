/**
 * Titles, Answer-First intros and keyword sections for the state and city pages (seo.md §10).
 * These are the location tool pages people land on from "apple store {place}" and "iphone duo {place}":
 * every sentence is built from the live stock, the restock log and the 2026 sales-tax table, so each
 * page says something only that place's data can say.
 */
import { PART_INDEX, STATE_CODES, STORES, catalogFor, appleName, statesWithStores, citiesWithStores, type ModelKey, type Store } from "../apple/catalog";
import type { PlaceStats, StoreStockSummary } from "../stock/queries";
import { SALES_TAX, withTax } from "@/content/sales-tax";
import { neighborStates } from "./links";
import { fitTitle, fmtDuration, fmtPrice, listWords, plural, alertHref } from "./enrich";
import type { Block, Faq } from "../content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";

export interface PlaceCopyInput {
  kind: "state" | "city";
  /** "New Jersey" or "Chicago". */
  name: string;
  state: string;
  stateSlug: string;
  citySlug?: string;
  stores: Store[];
  cities?: number;
  stockNow: Record<ModelKey, number>;
  stock: Map<string, StoreStockSummary>;
  duo: PlaceStats;
  max: PlaceStats;
}

/** "since tracking began on October 29" while the 30-day window still reaches back to the start, else "in the last 30 days". */
export function sinceWhen(now = Date.now()): string {
  return now - Date.parse("2026-10-29T00:00:00Z") < 30 * 86400_000 ? "since tracking began on October 29" : "in the last 30 days";
}

const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Two place names collide with another page's search (DataForSEO, seo.md §10): people looking for New York
 * City type "apple store nyc" (6,600 a month), while the New York state page answers "apple stores in new
 * york" (390); Washington State is "apple stores in washington state" (320), D.C. is "apple store dc"
 * (12,100). The titles and the prose name these places the way their own searches do.
 */
const SAID: Record<string, { title: string; prose: string }> = {
  "city:New York|New York": { title: "NYC", prose: "New York City" },
  "state:Washington": { title: "Washington State", prose: "Washington State" },
};
const said = (i: PlaceCopyInput) => SAID[i.kind === "city" ? `city:${i.name}|${i.state}` : `state:${i.name}`];

/** The place as titles and descriptions name it. */
function where(i: PlaceCopyInput): string {
  return said(i)?.title ?? (i.kind === "city" ? `${i.name}, ${STATE_CODES[i.state] ?? i.state}` : i.name);
}

/** The place as sentences name it. */
export function placeName(i: PlaceCopyInput): string {
  return said(i)?.prose ?? i.name;
}

export function placeTitle(i: PlaceCopyInput): string {
  const n = i.stores.length;
  const w = where(i);
  return fitTitle([
    `Apple Stores in ${w}: Live iPhone Duo Stock at ${n === 2 ? "Both" : `All ${n}`}`,
    `Apple Stores in ${w}: Live iPhone Duo Stock`,
    `Apple Stores in ${placeName(i)}: Live iPhone Duo Stock`,
    `Apple Stores in ${placeName(i)}: iPhone Stock Today`,
    `${placeName(i)} Apple Stores: iPhone Stock`,
  ]);
}

export function placeDescription(i: PlaceCopyInput): string {
  const n = i.stores.length;
  const tax = SALES_TAX[i.state];
  const taxBit = tax ? (tax.combined === 0 ? `, and no sales tax` : `, plus the price with ${i.state} sales tax`) : "";
  return fitTitle([
    `${n} Apple Stores in ${where(i)}: ${i.stockNow.duo} have the iPhone Duo for pickup now, ${i.stockNow["18-pro-max"]} the 18 Pro Max. Live stock by store, restock times${taxBit}.`,
    `${n} Apple Stores in ${placeName(i)}: ${i.stockNow.duo} with iPhone Duo pickup stock now, ${i.stockNow["18-pro-max"]} with the 18 Pro Max. Live by store, restock times.`,
  ], 155);
}

function taxSentence(state: string): string {
  const t = SALES_TAX[state];
  if (!t) return "";
  if (t.combined === 0) return `${state} has no sales tax, so a 256GB iPhone Duo costs $1,999 out the door.`;
  return `With ${state}'s average ${t.combined}% sales tax, a 256GB iPhone Duo comes to about ${money(withTax(1999, state)!.total)}.`;
}

export function placeIntro(i: PlaceCopyInput): string {
  const n = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? ` in ${plural(i.cities, "city", "cities")}` : "";
  return `${placeName(i)} has **${n} Apple Stores**${cities}. Right now **${i.stockNow.duo} of them** list an iPhone Duo for pickup, **${i.stockNow["18-pro-max"]}** the iPhone 18 Pro Max and **${i.stockNow["18-pro"]}** the iPhone 18 Pro. ${taxSentence(i.state)}`;
}

/** Configurations of a model that the fewest stores here have right now (ties broken by catalog order). */
function scarcest(i: PlaceCopyInput, model: ModelKey, k = 2): { label: string; stores: number }[] {
  const counts = new Map<string, number>(catalogFor(model).map((c) => [c.partNumber, 0]));
  for (const s of i.stores) for (const p of i.stock.get(s.storeNumber)?.perModel[model].parts ?? []) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([p, n]) => ({ label: `${PART_INDEX.get(p)!.storage} ${PART_INDEX.get(p)!.color}`, stores: n })).sort((a, b) => a.stores - b.stores).slice(0, k);
}

function pairsPct(i: PlaceCopyInput, model: ModelKey): number {
  const total = i.stores.length * catalogFor(model).length;
  const avail = i.stores.reduce((a, s) => a + (i.stock.get(s.storeNumber)?.perModel[model].available ?? 0), 0);
  return Math.round((100 * avail) / Math.max(1, total));
}

function duoLead(i: PlaceCopyInput): string {
  const n = i.stores.length;
  const have = i.stores.filter((s) => (i.stock.get(s.storeNumber)?.perModel.duo.available ?? 0) > 0);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const lastBit = st.lastRestock && last ? `, most recently on ${ET.format(new Date(st.lastRestock.at))} ET at ${appleName(last)}` : "";
  const stay = st.medianMs != null ? ` A restocked Duo stayed listed about ${fmtDuration(st.medianMs)} at the median.` : "";
  if (have.length > 0) {
    return `${have.length} of ${n} stores list an iPhone Duo right now: ${listWords(have.map((s) => appleName(s)), 4)}. Stores here have logged ${plural(st.month, "Duo restock")} ${sinceWhen()}${lastBit}.${stay}`;
  }
  if (st.month > 0) return `None of the ${n} stores lists an iPhone Duo right now, but they have restocked it ${plural(st.month, "time")} ${sinceWhen()}${lastBit}.${stay}`;
  return `None of the ${n} stores lists an iPhone Duo right now, and none has logged a Duo restock ${sinceWhen()}. That can change in a minute: Duo restocks land in bursts across the country.`;
}

export function placeSections(i: PlaceCopyInput): KeywordSection[] {
  const n = i.stores.length;
  const w = placeName(i);
  const t = SALES_TAX[i.state];
  const alert = alertHref({ model: "duo", state: i.stateSlug, city: i.kind === "city" ? i.citySlug : undefined });
  const scarce = scarcest(i, "18-pro-max");
  const sections: KeywordSection[] = [
    {
      id: "iphone-duo",
      h2: `iPhone Duo in ${w}: which stores have it now`,
      lead: duoLead(i),
      blocks: [
        { t: "p", text: `The fastest way to get one here is an alert at the ${n <= 3 ? (n === 2 ? "two" : "three") : `${Math.min(n, 5)} closest`} stores you can reach: [set an iPhone Duo alert in ${w}](${alert}). Each store × exact configuration is one alert, and the push arrives seconds after a store lists it.` },
      ],
    },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max in ${w}: stock by store`,
      lead: `${i.stockNow["18-pro-max"]} of ${n} stores list at least one iPhone 18 Pro Max configuration, and ${pairsPct(i, "18-pro-max")}% of the ${n * 16} store × configuration pairs here are in stock.${scarce.length ? ` The scarcest right now: ${listWords(scarce.map((x) => `${x.label} (${x.stores} of ${n} stores)`))}.` : ""}`,
      blocks: [
        { t: "p", text: `The iPhone 18 Pro is at ${i.stockNow["18-pro"]} of ${n} stores, with ${pairsPct(i, "18-pro")}% of pairs in stock. ${sinceWhen().replace(/^./, (c) => c.toUpperCase())}, stores here have logged ${plural(i.max.month, "18 Pro Max restock")}${i.max.medianMs != null ? `, and a restocked Pro Max stayed listed about ${fmtDuration(i.max.medianMs)}` : ""}. The table above shows every store and model at a glance.` },
      ],
    },
  ];
  if (t) {
    const nb = neighborStates(i.state).map((s) => ({ name: s.name, t: SALES_TAX[s.name] })).filter((x) => x.t && x.t.combined > 0).sort((a, b) => b.t!.combined - a.t!.combined)[0];
    const rows: [string, number][] = [["iPhone Duo 256GB", 1999], ["iPhone Duo 1TB", 2599], ["iPhone 18 Pro Max 256GB", 1299], ["iPhone 18 Pro Max 1TB", 1899], ["iPhone 18 Pro 256GB", 1199]];
    const table: Block = {
      t: "table",
      head: ["iPhone", "apple.com price", t.combined === 0 ? `In ${i.state}` : `With ${t.combined}% tax`],
      rows: rows.map(([label, price]) => [label, money(price), money(withTax(price, i.state)!.total)]),
      caption: `${i.state} price with the state's average combined sales tax (${t.combined}%)`,
      source: "[Tax Foundation, rates as of January 1, 2026](https://taxfoundation.org/data/all/state/sales-tax-rates/); prices from apple.com",
    };
    sections.push({
      id: "price-with-tax",
      h2: `iPhone Duo price in ${w} with sales tax`,
      lead: t.combined === 0
        ? `${i.state} has no state or local sales tax, so you pay the apple.com price and nothing more: $1,999 for a 256GB iPhone Duo.${nb ? ` In ${nb.name} the same phone comes to about ${money(withTax(1999, nb.name)!.total)}, which is why people cross the state line to buy here.` : ""}`
        : `${i.state} charges ${t.state}% state sales tax and local taxes average ${t.avgLocal}%, so most buyers pay about ${t.combined}%: a 256GB iPhone Duo comes to about ${money(withTax(1999, i.state)!.total)}. For in-store pickup, tax is charged where the store is.${i.kind === "city" ? ` Rates inside ${w} can be higher than the state average.` : ""}`,
      blocks: [table],
    });
  }
  return sections;
}

/** The tax question for the FAQ (null when the state is not in the table). */
export function taxFaq(i: PlaceCopyInput): Faq | null {
  const t = SALES_TAX[i.state];
  if (!t) return null;
  return {
    q: `How much is the iPhone Duo with tax in ${placeName(i)}?`,
    a: t.combined === 0
      ? `$1,999 for the 256GB: ${i.state} has no sales tax, so the apple.com price is what you pay at pickup.`
      : `About ${money(withTax(1999, i.state)!.total)} for the 256GB and ${money(withTax(2599, i.state)!.total)} for the 1TB, using ${i.state}'s average combined rate of ${t.combined}% (local rates vary).`,
  };
}

/**
 * The /stores hub's own questions, computed from the store list and the tax table (nothing typed in):
 * how many stores and where most of them are, and which Apple Store states charge no sales tax.
 */
export function hubFaq(): { count: Faq; taxFree: Faq } {
  const states = statesWithStores();
  const cities = citiesWithStores();
  const top = [...states].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 3);
  const free = states.filter((s) => SALES_TAX[s.name]?.combined === 0).map((s) => s.name);
  const highest = states.filter((s) => SALES_TAX[s.name]).sort((a, b) => SALES_TAX[b.name].combined - SALES_TAX[a.name].combined)[0];
  const cheapest = catalogFor("duo").reduce((a, b) => (b.price < a.price ? b : a));
  const taxed = withTax(cheapest.price, highest.name)!;
  return {
    count: { q: "How many Apple Stores are there in the US?", a: `${STORES.length}, in ${cities.length} cities across ${states.length - 1} states and Washington, D.C. ${top[0].name} has the most (${top[0].count}), then ${top[1].name} (${top[1].count}) and ${top[2].name} (${top[2].count}).` },
    taxFree: { q: "Which states with an Apple Store charge no sales tax?", a: `${listWords(free)}. There an iPhone Duo ${cheapest.storage} costs its ${fmtPrice(cheapest.price)} list price at pickup; in ${highest.name}, the highest average combined rate of any Apple Store state (${taxed.rate}%), the same phone comes to about ${fmtPrice(taxed.total)}.` },
  };
}
