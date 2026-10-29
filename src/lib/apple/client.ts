/**
 * Apple retail pickup availability client.
 *
 * Endpoint (verified 2026-10-28, docs/research.md):
 *   GET https://www.apple.com/shop/retail/pickup-message
 *       ?pl=true&mts.0=regular&cppart=UNLOCKED/US&parts.0=<part>&parts.1=…&location=<zip>
 *   • ≤ 20 parts per call (more are silently dropped) • returns the 12 nearest stores
 *   • throttled per source IP: ~30–45 calls then HTTP 541 for ~30 minutes
 */
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

export function buildPickupUrl(parts: string[], location: string): string {
  if (parts.length === 0) throw new Error("no parts");
  if (parts.length > MAX_PARTS_PER_CALL) throw new Error(`max ${MAX_PARTS_PER_CALL} parts per call`);
  const u = new URL(APPLE_PICKUP_URL);
  u.searchParams.set("pl", "true");
  u.searchParams.set("mts.0", "regular");
  u.searchParams.set("cppart", "UNLOCKED/US");
  parts.forEach((p, i) => u.searchParams.set(`parts.${i}`, p));
  u.searchParams.set("location", location);
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
): Promise<PickupResponse> {
  const url = buildPickupUrl(parts, location);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: APPLE_HEADERS, signal: ac.signal });
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
