/**
 * Live numbers for hand-written pages. Prose carries tokens like {{duo.storesNow}}; they are filled from
 * the same cached reads the stock pages use, so an article never quotes a stale count.
 *
 * Model prefixes: duo · pro (iPhone 18 Pro) · pm (iPhone 18 Pro Max).
 * Fields: storesNow, storesTotal, pairsNow, pairsTotal, pairsPct, restocks, soldouts, medianStay,
 * lastRestock, topConfig, configsNow, configsTotal, priceFrom, priceTo, restockStores, and keyed fields:
 * cfg:<storage color> / color:<color> / storage:<size> (stores with it now), rcfg: / rcolor: / rstorage: (restocks logged).
 * Global: {{stores}}, {{trackingSince}}, {{trackingDays}}, {{asOf}}.
 */
import { cache } from "react";
import { MODELS, STORES, PART_INDEX, catalogFor, type ModelKey } from "../apple/catalog";
import { modelStock, placeStats } from "../stock/queries";
import { fmtDuration, fmtPrice } from "../seo/enrich";

/** First real (non-first-seen) event in the database: tracking of all 269 stores began on this day. */
export const TRACKING_SINCE = "2026-10-29";

export const PREFIX: Record<string, ModelKey> = { duo: "duo", pro: "18-pro", pm: "18-pro-max" };

export interface ModelFacts {
  key: ModelKey;
  unknown: boolean;
  storesNow: number;
  pairsNow: number;
  pairsTotal: number;
  restocks: number;
  soldouts: number;
  medianMs: number | null;
  lastRestockAt: string | null;
  topConfig: string | null;
  /** Stores with each configuration available now, keyed "512GB Black". */
  byConfig: Record<string, number>;
  /** Stores with at least one configuration of a color / a storage size now. */
  byColor: Record<string, number>;
  byStorage: Record<string, number>;
  /** Restocks logged per configuration, color and storage since tracking began. */
  restocksByConfig: Record<string, number>;
  restocksByColor: Record<string, number>;
  restocksByStorage: Record<string, number>;
  /** Stores with at least one restock logged. */
  restockStores: number;
  priceLow: number;
  priceHigh: number;
}

export interface Facts { at: string; models: Record<ModelKey, ModelFacts> }

async function modelFacts(key: ModelKey): Promise<ModelFacts> {
  const items = catalogFor(key);
  const prices = items.map((i) => i.price);
  const [rows, stats] = await Promise.all([modelStock(key), placeStats({ model: key })]);
  const available = rows.filter((r) => r.status === "available");
  const byConfig: Record<string, number> = Object.fromEntries(items.map((i) => [`${i.storage} ${i.color}`, 0]));
  for (const r of available) {
    const item = PART_INDEX.get(r.partNumber);
    if (item) byConfig[`${item.storage} ${item.color}`] = (byConfig[`${item.storage} ${item.color}`] ?? 0) + 1;
  }
  const top = stats.byPart[0] ? PART_INDEX.get(stats.byPart[0].partNumber) : undefined;
  const colorSets = new Map<string, Set<string>>();
  const storageSets = new Map<string, Set<string>>();
  for (const r of available) {
    const item = PART_INDEX.get(r.partNumber);
    if (!item) continue;
    if (!colorSets.has(item.color)) colorSets.set(item.color, new Set());
    if (!storageSets.has(item.storage)) storageSets.set(item.storage, new Set());
    colorSets.get(item.color)!.add(r.storeNumber);
    storageSets.get(item.storage)!.add(r.storeNumber);
  }
  const restocksByConfig: Record<string, number> = Object.fromEntries(items.map((i) => [`${i.storage} ${i.color}`, 0]));
  const restocksByColor: Record<string, number> = Object.fromEntries(items.map((i) => [i.color, 0]));
  const restocksByStorage: Record<string, number> = Object.fromEntries(items.map((i) => [i.storage, 0]));
  for (const b of stats.byPart) {
    const item = PART_INDEX.get(b.partNumber);
    if (!item) continue;
    restocksByConfig[`${item.storage} ${item.color}`] += b.restocks;
    restocksByColor[item.color] += b.restocks;
    restocksByStorage[item.storage] += b.restocks;
  }
  return {
    key,
    unknown: rows.length === 0 || Boolean(stats.unknown),
    storesNow: new Set(available.map((r) => r.storeNumber)).size,
    pairsNow: available.length,
    pairsTotal: rows.length || items.length * STORES.length,
    restocks: stats.month,
    soldouts: stats.soldouts,
    medianMs: stats.medianMs,
    lastRestockAt: stats.lastRestock?.at ?? null,
    topConfig: top ? `${top.storage} ${top.color}` : null,
    byConfig,
    byColor: Object.fromEntries(items.map((i) => [i.color, colorSets.get(i.color)?.size ?? 0])),
    byStorage: Object.fromEntries(items.map((i) => [i.storage, storageSets.get(i.storage)?.size ?? 0])),
    restocksByConfig,
    restocksByColor,
    restocksByStorage,
    restockStores: stats.restockStores ?? 0,
    priceLow: Math.min(...prices),
    priceHigh: Math.max(...prices),
  };
}

/** One read per request (React cache), three models in parallel. */
export const getFacts = cache(async (): Promise<Facts> => {
  const list = await Promise.all(MODELS.map((m) => modelFacts(m.key)));
  return { at: new Date().toISOString(), models: Object.fromEntries(list.map((f) => [f.key, f])) as Record<ModelKey, ModelFacts> };
});

const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const LONG_DATE = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });

function n(v: number, unknown: boolean): string {
  return unknown ? "—" : v.toLocaleString("en-US");
}

/** The value for one token, or null when the token is not known (left as-is so tests catch typos). */
export function tokenValue(token: string, facts: Facts): string | null {
  if (token === "stores") return String(STORES.length);
  if (token === "trackingSince") return LONG_DATE.format(new Date(`${TRACKING_SINCE}T12:00:00Z`));
  if (token === "trackingDays") return String(Math.max(1, Math.ceil((Date.parse(facts.at) - Date.parse(`${TRACKING_SINCE}T00:00:00Z`)) / 86400_000)));
  if (token === "asOf") return `${ET.format(new Date(facts.at))} ET`;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const key = PREFIX[token.slice(0, dot)];
  if (!key) return null;
  const f = facts.models[key];
  if (!f) return null;
  const field = token.slice(dot + 1);
  const keyed: Record<string, Record<string, number>> = { "cfg:": f.byConfig, "color:": f.byColor, "storage:": f.byStorage, "rcfg:": f.restocksByConfig, "rcolor:": f.restocksByColor, "rstorage:": f.restocksByStorage };
  for (const [prefix, table] of Object.entries(keyed)) {
    if (field.startsWith(prefix)) { const v = table[field.slice(prefix.length)]; return v == null ? null : n(v, f.unknown); }
  }
  switch (field) {
    case "storesNow": return n(f.storesNow, f.unknown);
    case "storesTotal": return String(STORES.length);
    case "pairsNow": return n(f.pairsNow, f.unknown);
    case "pairsTotal": return f.pairsTotal.toLocaleString("en-US");
    case "pairsPct": return f.unknown ? "—" : `${Math.round((100 * f.pairsNow) / Math.max(1, f.pairsTotal))}%`;
    case "restocks": return n(f.restocks, f.unknown);
    case "restockStores": return n(f.restockStores, f.unknown);
    case "soldouts": return n(f.soldouts, f.unknown);
    case "medianStay": return f.medianMs == null ? "too few to measure yet" : fmtDuration(f.medianMs);
    case "lastRestock": return f.lastRestockAt ? `${ET.format(new Date(f.lastRestockAt))} ET` : "none logged yet";
    case "topConfig": return f.topConfig ?? "none yet";
    case "configsNow": return n(Object.values(f.byConfig).filter((v) => v > 0).length, f.unknown);
    case "configsTotal": return String(Object.keys(f.byConfig).length);
    case "priceFrom": return fmtPrice(f.priceLow);
    case "priceTo": return fmtPrice(f.priceHigh);
    default: return null;
  }
}

export function fillTokens(text: string, facts: Facts): string {
  return text.replace(/\{\{([a-zA-Z.:0-9 ]+)\}\}/g, (all, t: string) => tokenValue(t.trim(), facts) ?? all);
}

/** Every token used in a string (for tests). */
export function tokensIn(text: string): string[] {
  return [...text.matchAll(/\{\{([a-zA-Z.:0-9 ]+)\}\}/g)].map((m) => m[1].trim());
}

/** For token-free copy that still renders through Inline (store pages): only the global tokens work. */
export function emptyFacts(): Facts {
  return { at: new Date().toISOString(), models: {} as Record<ModelKey, ModelFacts> };
}
