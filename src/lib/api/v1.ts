/**
 * The public, read-only JSON API (/api/v1, documented at /iphone-duo-stock-api). Free, attribution asked for, no key.
 * Every answer is cached at the CDN for 30 s (one database read for everyone asking the same thing), CORS-open, and
 * rate-limited per IP as a backstop against loops that bypass the cache with changing query strings.
 */
import { NextResponse } from "next/server";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { MODELS, type ModelKey } from "@/lib/apple/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { SPEED } from "@/lib/plans";

export const SITE = "https://pickupchecker.com";
export const DOCS = `${SITE}/iphone-duo-stock-api`;
/** Requests per minute per IP that reach the function (the CDN answers repeats). */
export const RATE_PER_MIN = 60;
export const CACHE_SEC = 30;

export const ATTRIBUTION = {
  source: "PickupChecker",
  url: SITE,
  docs: DOCS,
  license: "Free to use with attribution: link to pickupchecker.com (or the store/country page) wherever the data is shown.",
  method: `Apple Store pickup availability as apple.com publishes it, checked ${SPEED.checkSec} s apart at every store (${SPEED.fastSec} s at stores with paid alerts); a change counts only after two consistent observations.`,
};

export const HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": `public, s-maxage=${CACHE_SEC}, stale-while-revalidate=${CACHE_SEC * 2}`,
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "x-content-type-options": "nosniff",
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, { status, headers: { ...HEADERS, ...extra } });
}

export function error(status: number, message: string, hint?: string): NextResponse {
  return json({ error: { status, message, ...(hint ? { hint } : {}) }, docs: DOCS }, status, { "cache-control": "no-store" });
}

export function options(): NextResponse {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}

/** "jp" → the country, or null; "gb" is accepted for the UK. */
export function countryOf(seg: string): CountryCode | null {
  const s = seg.toLowerCase() === "gb" ? "uk" : seg.toLowerCase();
  return s in COUNTRIES ? (s as CountryCode) : null;
}

/** "duo" | "iphone-duo" | "18-pro" | "iphone-18-pro-max" → the model key, or null. */
export function modelOf(v: string | null): ModelKey | null {
  if (!v) return "duo";
  const s = v.toLowerCase().replace(/^iphone-/, "");
  const m = MODELS.find((x) => x.key === s || x.slug === `iphone-${s}` || x.slug === v.toLowerCase());
  return (m?.key as ModelKey | undefined) ?? null;
}

/** Colour and storage filters as the catalogue spells them ("night-sky" → "Night Sky", "512gb" → "512GB"). */
export const normStorage = (v: string | null) => (v ? v.toUpperCase().replace(/\s+/g, "") : undefined);
export const normColor = (v: string | null) => (v ? v.replace(/[-_]+/g, " ").trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : undefined);

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  return (xf ? xf.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();
}

/** False when this IP has exceeded RATE_PER_MIN function hits in the last minute. */
export async function allowed(req: Request): Promise<boolean> {
  try {
    return await rateLimit(`v1:${clientIp(req)}`, RATE_PER_MIN, 60_000);
  } catch {
    return true; // the database said nothing: never fail a public read on the limiter
  }
}

export const tooMany = () => json({ error: { status: 429, message: `More than ${RATE_PER_MIN} requests a minute from this address; responses are cached ${CACHE_SEC} s, so poll no faster than that.` }, docs: DOCS }, 429, { "cache-control": "no-store", "retry-after": "30" });

export const meta = (cc: CountryCode, extra: Record<string, unknown> = {}) => ({
  generated_at: new Date().toISOString(),
  country: { code: cc, name: COUNTRIES[cc].name, currency: COUNTRIES[cc].currency },
  cache_seconds: CACHE_SEC,
  ...extra,
  attribution: ATTRIBUTION,
});
