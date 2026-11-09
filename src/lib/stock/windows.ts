/**
 * "What adds the most pickup windows?" — the alert editor's decision tool (POST /api/windows), pure part.
 *
 * Answer engines told us (2026-11-09) that a stock tracker turns observed stock into buying odds far too easily
 * ("easiest to get", "doubles your chances"). This tool deliberately counts the past only: for the configurations ×
 * stores someone has picked, how many times over the last 30 days Apple's pickup page listed any of them, and which
 * single change (another colour, another storage, one more nearby store) would have added the most of those times.
 *
 *  • A pickup window is one restock (sold out → listed, confirmed by two matching checks) until its sell-out, or, if
 *    it is still listed, until the last check that saw it listed (≈ now).
 *  • Windows are merged across the selection: two stores (or two colours) listed at the same moment are one window
 *    for someone who would take either — overlapping or touching intervals count once, and their listed time once.
 *  • The gain of a change = windows (and listed minutes) of the selection with the change − without it. Adding an
 *    interval can bridge two windows into one, so a gain can be 0 while the listed minutes grow.
 *  • Under MIN_SAMPLE windows in the selection plus every candidate, the comparison is flagged as too small.
 *
 * Nothing here reads the database or a data file (catalog-core is code only), so tests run it directly and the
 * editor may import its types and limits without pulling the store catalogue into the browser.
 */
import { distanceMiles } from "../apple/catalog-core";

/** Most configurations and stores one request may name (the editor holds at most 50 alerts). */
export const MAX_PARTS = 16;
export const MAX_STORES = 30;
/** Window the tool looks back over. */
export const WINDOW_DAYS = 30;
/** Nearest unselected stores offered as candidates. */
export const NEAREST = 5;
/** Below this many windows (selection + every candidate) the ranking is noise: say so instead. */
export const MIN_SAMPLE = 5;
/** A device location farther than this from every chosen store is not where the person shops: measure from a store. */
export const HERE_MAX_MI = 250;

/** [start, end] in epoch ms. */
export type Interval = readonly [number, number];
export interface Config { model: string; storage: string; color: string }
export const configKey = (c: Config) => `${c.model}|${c.storage}|${c.color}`;
export const pairKey = (store: string, cfgKey: string) => `${store}#${cfgKey}`;

export interface Union { windows: number; listedMs: number }

/** Pure: overlapping or touching intervals merged — how many separate windows, and their total length. */
export function unionOf(intervals: readonly Interval[]): Union {
  if (intervals.length === 0) return { windows: 0, listedMs: 0 };
  const v = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let windows = 0, listedMs = 0;
  let [s, e] = v[0];
  for (let i = 1; i < v.length; i++) {
    const [a, b] = v[i];
    if (a <= e) { if (b > e) e = b; continue; }
    windows++; listedMs += e - s;
    s = a; e = b;
  }
  windows++; listedMs += e - s;
  return { windows, listedMs };
}

export type ConfigCandidate = { kind: "color" | "storage"; config: Config };
export type StoreCandidate = { kind: "store"; store: string; distanceMi: number };
export type Candidate = ConfigCandidate | StoreCandidate;

/**
 * Pure: the configuration changes worth comparing — every other colour of a chosen configuration (same model and
 * storage), then every other storage of it (same model and colour), each once, none already chosen. `offered` is the
 * catalogue of the selection's country for the chosen models.
 */
export function configCandidates(selected: readonly Config[], offered: readonly Config[]): ConfigCandidate[] {
  const have = new Set(selected.map(configKey));
  const out = new Map<string, ConfigCandidate>();
  const add = (kind: ConfigCandidate["kind"], c: Config) => {
    const k = configKey(c);
    if (!have.has(k) && !out.has(k)) out.set(k, { kind, config: { model: c.model, storage: c.storage, color: c.color } });
  };
  for (const c of selected) for (const o of offered) if (o.model === c.model && o.storage === c.storage && o.color !== c.color) add("color", o);
  for (const c of selected) for (const o of offered) if (o.model === c.model && o.color === c.color && o.storage !== c.storage) add("storage", o);
  return [...out.values()];
}

export interface Point { lat: number; lng: number }
export interface PlacedStore extends Point { storeNumber: string }

/**
 * Pure: where distances are measured from — the person's device location when it is within HERE_MAX_MI of a chosen
 * store (someone browsing from abroad shops near their stores, not near themselves), else the first chosen store.
 */
export function anchorFor(chosen: readonly PlacedStore[], here?: Point | null): (Point & { from: "you" | "store" }) | null {
  if (here && chosen.some((s) => distanceMiles(here.lat, here.lng, s.lat, s.lng) <= HERE_MAX_MI)) return { lat: here.lat, lng: here.lng, from: "you" };
  return chosen[0] ? { lat: chosen[0].lat, lng: chosen[0].lng, from: "store" } : null;
}

/** Pure: the `n` stores of `pool` nearest the anchor that are not chosen yet, nearest first (straight-line miles, 0.1). */
export function nearestStores(anchor: Point, pool: readonly PlacedStore[], chosen: ReadonlySet<string>, n = NEAREST): StoreCandidate[] {
  return pool
    .filter((s) => !chosen.has(s.storeNumber))
    .map((s) => ({ kind: "store" as const, store: s.storeNumber, distanceMi: Math.round(distanceMiles(anchor.lat, anchor.lng, s.lat, s.lng) * 10) / 10 }))
    .sort((a, b) => a.distanceMi - b.distanceMi || a.store.localeCompare(b.store))
    .slice(0, n);
}

export interface Gain { candidate: Candidate; windows: number; listedMin: number; /** Alerts the change adds (stores for a configuration, configurations for a store). */ alerts: number }

export interface WindowsResult {
  from: number;
  to: number;
  days: number;
  selection: { configs: number; stores: number; alerts: number; windows: number; listedMin: number };
  /** Windows in the selection plus every candidate: the size of the comparison. */
  sample: number;
  tooFew: boolean;
  /** Every candidate, most windows gained first (then most listed time, then colour → storage → store, then nearest). */
  gains: Gain[];
}

const KIND_ORDER: Record<Candidate["kind"], number> = { color: 0, storage: 1, store: 2 };

/**
 * Pure: the selection's windows and the gain of each candidate. `byPair` holds each (store, configuration)'s windows
 * as pairKey(store, configKey(config)) → intervals; intervals are clipped to [from, to].
 */
export function pickupWindows(input: {
  byPair: ReadonlyMap<string, readonly Interval[]>;
  configs: readonly Config[];
  stores: readonly string[];
  candidates: readonly Candidate[];
  from: number;
  to: number;
  minSample?: number;
}): WindowsResult {
  const { byPair, configs, stores, candidates, from, to } = input;
  const clip = (iv: Interval): Interval | null => {
    const s = Math.max(iv[0], from), e = Math.min(iv[1], to);
    return s <= to && e >= s ? [s, e] : null;
  };
  const cfgKeys = configs.map(configKey);
  const of = (ss: readonly string[], ks: readonly string[]): Interval[] => {
    const out: Interval[] = [];
    for (const s of ss) for (const k of ks) for (const iv of byPair.get(pairKey(s, k)) ?? []) { const c = clip(iv); if (c) out.push(c); }
    return out;
  };
  const baseIv = of(stores, cfgKeys);
  const base = unionOf(baseIv);
  const extra = (c: Candidate) => (c.kind === "store" ? of([c.store], cfgKeys) : of(stores, [configKey(c.config)]));
  const all: Interval[] = [...baseIv];
  const gains = candidates.map((c): Gain => {
    const more = extra(c);
    all.push(...more);
    const u = unionOf([...baseIv, ...more]);
    return { candidate: c, windows: u.windows - base.windows, listedMin: Math.round((u.listedMs - base.listedMs) / 60_000), alerts: c.kind === "store" ? configs.length : stores.length };
  });
  gains.sort((a, b) => b.windows - a.windows || b.listedMin - a.listedMin || KIND_ORDER[a.candidate.kind] - KIND_ORDER[b.candidate.kind]
    || (a.candidate.kind === "store" && b.candidate.kind === "store" ? a.candidate.distanceMi - b.candidate.distanceMi : 0));
  const sample = unionOf(all).windows;
  return {
    from, to, days: Math.round(((to - from) / 86_400_000) * 10) / 10,
    selection: { configs: configs.length, stores: stores.length, alerts: configs.length * stores.length, windows: base.windows, listedMin: Math.round(base.listedMs / 60_000) },
    sample,
    tooFew: sample < (input.minSample ?? MIN_SAMPLE),
    gains,
  };
}

/** What POST /api/windows answers (JSON). Times are ISO; distances straight-line miles (the editor words them by road). */
export interface WindowsResponse {
  generatedAt: string;
  window: { from: string; to: string; days: number };
  selection: WindowsResult["selection"];
  sample: number;
  minSample: number;
  tooFew: boolean;
  gains: ({ windows: number; listedMin: number; alerts: number } & (
    | { kind: "color" | "storage"; model: string; storage: string; color: string; part: string | null }
    | { kind: "store"; storeNumber: string; store: string; city: string; country: string; distanceMi: number; distanceFrom: "you" | "store" }
  ))[];
  method: string;
}

export type Selection = { parts: string[]; stores: string[]; here: Point | null };
export type SelectionError = { error: "bad_body" | "empty" | "too_many" | "unknown_part" | "unknown_store" | "bad_location"; detail?: string };

/**
 * Pure: the request body checked against the catalogue (`knownPart`, `knownStore`), de-duplicated, capped
 * (≤ MAX_PARTS part numbers, ≤ MAX_STORES stores) and the location rounded to ~1 km (it is never stored or echoed).
 */
export function parseSelection(body: unknown, knownPart: (p: string) => boolean, knownStore: (s: string) => boolean): Selection | SelectionError {
  if (!body || typeof body !== "object") return { error: "bad_body" };
  const b = body as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string" && x.length > 0 && x.length <= 32) ? [...new Set(v as string[])] : null);
  const parts = list(b.parts), stores = list(b.stores);
  if (!parts || !stores) return { error: "bad_body" };
  if (parts.length === 0 || stores.length === 0) return { error: "empty" };
  if (parts.length > MAX_PARTS || stores.length > MAX_STORES) return { error: "too_many", detail: `at most ${MAX_PARTS} parts and ${MAX_STORES} stores` };
  const badPart = parts.find((p) => !knownPart(p));
  if (badPart) return { error: "unknown_part", detail: badPart };
  const badStore = stores.find((s) => !knownStore(s));
  if (badStore) return { error: "unknown_store", detail: badStore };
  let here: Point | null = null;
  if (b.lat != null || b.lng != null) {
    const lat = b.lat, lng = b.lng;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: "bad_location" };
    here = { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
  }
  return { parts, stores, here };
}
