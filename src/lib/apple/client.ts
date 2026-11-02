/**
 * Apple retail pickup availability client.
 *
 * Endpoint (verified 2026-10-28, docs/research.md):
 *   GET https://www.apple.com/shop/retail/pickup-message
 *       ?pl=true&mts.0=regular&cppart=UNLOCKED/US&parts.0=<part>&parts.1=…&location=<zip>
 *   • ≤ 20 parts per call (more are silently dropped) • returns the 12 nearest stores
 *   • throttled per source IP: ~30–45 calls then HTTP 541 for ~30 minutes
 * Every other country has the same endpoint under its shop path (https://www.apple.com/uk/shop/retail/
 * pickup-message, …/ch-de/…, …/be-fr/…) with its own part numbers and cppart=UNLOCKED/<ISO>; same JSON
 * (docs/i18n.md §0, probed 2026-11-02). The country is a trailing argument that defaults to the US, and a US
 * request is byte-for-byte what it always was. This module stays free of the catalogue: callers know the
 * country of the store they ask about (catalog.ts countryOfStore).
 */
import { COUNTRIES, ALL_CODES, pickupEndpoint, type CountryCode } from "./countries";

export const APPLE_PICKUP_URL = "https://www.apple.com/shop/retail/pickup-message";
export const MAX_PARTS_PER_CALL = 20;

export interface PickupPartStatus {
  partNumber: string;
  available: boolean;
  quote: string | null; // "Available Today" | "Currently unavailable" | …
  pickupDisplay: string | null; // "available" | "unavailable" | "ineligible"
}

export interface PickupStoreResult {
  storeNumber: string;
  storeName: string;
  city: string;
  state: string;
  distanceMiles: number | null;
  parts: PickupPartStatus[];
}

export interface PickupResponse {
  ok: boolean;
  httpStatus: number;
  location: string;
  stores: PickupStoreResult[];
  bytes: number;
  error?: string;
}

/**
 * `location` (a ZIP) returns the 12 nearest stores; `store` (an R-number) returns that one store only —
 * the fast lane and the instant confirm use it: ~7 KB instead of ~200 KB, ~0.3 s instead of ~1.8 s.
 * `country` picks the endpoint and cppart (default the US; the US URL never changes).
 */
export function buildPickupUrl(parts: string[], location: string, opts: { store?: string; country?: CountryCode } = {}): string {
  if (parts.length === 0) throw new Error("no parts");
  if (parts.length > MAX_PARTS_PER_CALL) throw new Error(`max ${MAX_PARTS_PER_CALL} parts per call`);
  const cc = opts.country ?? "us";
  const c = Object.hasOwn(COUNTRIES, cc) ? COUNTRIES[cc] : undefined;
  if (!c) throw new Error(`unknown country ${opts.country}`);
  const u = new URL(c.cc === "us" ? APPLE_PICKUP_URL : pickupEndpoint(c));
  u.searchParams.set("pl", "true");
  u.searchParams.set("mts.0", "regular");
  u.searchParams.set("cppart", c.cppart);
  parts.forEach((p, i) => u.searchParams.set(`parts.${i}`, p));
  if (opts.store) u.searchParams.set("store", opts.store);
  else u.searchParams.set("location", location);
  return u.toString();
}

export const APPLE_HEADERS: Record<string, string> = {
  accept: "application/json, text/javascript, */*; q=0.01",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  referer: "https://www.apple.com/shop/buy-iphone/iphone-18-pro",
  "x-requested-with": "XMLHttpRequest",
};

const HEADERS_BY_COUNTRY = new Map<CountryCode, Record<string, string>>();
/**
 * Request headers for a country: the US set as it always was; elsewhere the referer is that country's buy
 * page and English is asked for first (Apple still answers pickupSearchQuote in the local language).
 */
export function appleHeaders(country: CountryCode = "us"): Record<string, string> {
  if (country === "us") return APPLE_HEADERS;
  let h = HEADERS_BY_COUNTRY.get(country);
  if (!h) {
    const c = COUNTRIES[country];
    // The referer names the same store path as the endpoint (shopPath; not the HK English buyPath of links).
    h = { ...APPLE_HEADERS, "accept-language": `${c.hreflang},en;q=0.9`, referer: `https://www.apple.com/${c.shopPath}/shop/buy-iphone/iphone-18-pro` };
    HEADERS_BY_COUNTRY.set(country, h);
  }
  return h;
}

/** The country whose endpoint a pickup URL asks ("/uk/shop/retail/pickup-message" → "uk"); "us" when unknown. */
export function pickupCountryOf(url: string): CountryCode {
  const path = new URL(url).pathname.replace(/\/shop\/retail\/pickup-message\/?$/, "").replace(/^\//, "");
  return (path && ALL_CODES.find((cc) => COUNTRIES[cc].shopPath === path)) || "us";
}

/** Parse Apple's JSON body. Throws on a shape we do not recognise (schema drift ⇒ loud error, never "unavailable"). */
export function parsePickupBody(json: unknown, httpStatus: number, bytes: number): PickupResponse {
  const root = json as { head?: { status?: string }; body?: Record<string, unknown> };
  const body = root?.body;
  if (!body || typeof body !== "object") throw new Error("pickup-message: missing body");
  const location = String(body.location ?? "");
  const rawStores = body.stores;
  if (!Array.isArray(rawStores)) {
    // Apple answers with an empty store list for unknown zips: treat as "no stores", not an error.
    if (rawStores === undefined || rawStores === null) return { ok: true, httpStatus, location, stores: [], bytes };
    throw new Error("pickup-message: stores is not an array");
  }
  const stores: PickupStoreResult[] = rawStores.map((s) => {
    const st = s as Record<string, unknown>;
    const pa = (st.partsAvailability ?? {}) as Record<string, Record<string, unknown>>;
    const parts: PickupPartStatus[] = Object.entries(pa).map(([partNumber, p]) => {
      const pickupDisplay = typeof p.pickupDisplay === "string" ? p.pickupDisplay : null;
      const quote = typeof p.pickupSearchQuote === "string" ? p.pickupSearchQuote : null;
      return { partNumber, pickupDisplay, quote, available: pickupDisplay === "available" };
    });
    const storeNumber = String(st.storeNumber ?? "");
    if (!storeNumber) throw new Error("pickup-message: store without storeNumber");
    const dist = typeof st.storedistance === "number" ? st.storedistance : null;
    return {
      storeNumber,
      storeName: String(st.storeName ?? ""),
      city: String(st.city ?? ""),
      state: String(st.state ?? ""),
      distanceMiles: dist,
      parts,
    };
  });
  return { ok: true, httpStatus, location, stores, bytes };
}

export interface FetchLike {
  (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }): Promise<{
    status: number;
    text(): Promise<string>;
  }>;
}

/** Fetch + parse through any fetch implementation (undici with a bound local address, Vercel fetch, …). */
export async function fetchPickup(
  parts: string[],
  location: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  timeoutMs = 15000,
  country: CountryCode = "us",
): Promise<PickupResponse> {
  return fetchParsed(buildPickupUrl(parts, location, country === "us" ? {} : { country }), location, fetchImpl, timeoutMs, appleHeaders(country));
}

/** One store only (`store=R###`): the small, fast call behind the fast lane, the instant confirm and the per-store sweep of other countries. */
export async function fetchPickupAtStore(
  parts: string[],
  storeNumber: string,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
  timeoutMs = 4500,
  country: CountryCode = "us",
): Promise<PickupResponse> {
  return fetchParsed(buildPickupUrl(parts, "", { store: storeNumber, country }), storeNumber, fetchImpl, timeoutMs, appleHeaders(country));
}

async function fetchParsed(url: string, location: string, fetchImpl: FetchLike, timeoutMs: number, headers: Record<string, string> = APPLE_HEADERS): Promise<PickupResponse> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers, signal: ac.signal });
    const text = await res.text();
    const bytes = text.length;
    if (res.status !== 200) {
      return { ok: false, httpStatus: res.status, location, stores: [], bytes, error: `http ${res.status}` };
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, httpStatus: res.status, location, stores: [], bytes, error: "non-json body" };
    }
    return parsePickupBody(json, res.status, bytes);
  } finally {
    clearTimeout(t);
  }
}

/** Split a part list into ≤20-part batches, stable order. */
export function batchParts(parts: string[], size = MAX_PARTS_PER_CALL): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < parts.length; i += size) out.push(parts.slice(i, i + size));
  return out;
}
