import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db";
import { PART_INDEX, STORE_INDEX, catalogOf, countryOfStore, modelKeyFor, partNumbersFor, storesOf, type ModelKey } from "@/lib/apple/catalog";
import type { CountryCode } from "@/lib/apple/countries";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US } from "@/lib/content/siteFacts";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { recordError, errorMessage } from "@/lib/errors";
import {
  MIN_SAMPLE, WINDOW_DAYS, anchorFor, configCandidates, configKey, nearestStores, pairKey, parseSelection, pickupWindows,
  type Config, type Interval, type WindowsResponse,
} from "@/lib/stock/windows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Requests per minute per IP (the editor debounces; a person changing picks sends a few a minute). */
const RATE_PER_MIN = 30;
const MAX_BODY = 4096;
const METHOD = "Counted from PickupChecker's confirmed restocks on Apple's pickup page (a change counts after two matching checks): a pickup window runs from a restock until its sell-out, or until the last check that still saw it listed; windows that overlap across the selection count once. Past observations only, not a forecast or a chance of buying.";

const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
const fail = (status: number, error: string, detail?: string) => NextResponse.json({ error, ...(detail ? { detail } : {}) }, { status, headers });

/**
 * Windows per (store, part) over the last WINDOW_DAYS: [store, part, startMs, endMs]. A restock's end is the next
 * event of the pair (its sell-out), else the last check that saw it listed (still listed: ≈ now). Cached 5 minutes
 * per normalized selection (sorted stores × sorted parts); no person's data is in the key or the result.
 */
const windowRows = unstable_cache(
  async (stores: string[], parts: string[]): Promise<[string, string, number, number][]> => {
    const inList = (v: string[]) => sql.join(v.map((x) => sql`${x}`), sql`, `);
    const r = await db().execute(sql`
      select e.store_number, e.part_number,
             (extract(epoch from e.at) * 1000)::float8 as s,
             (extract(epoch from coalesce(e.next_at, greatest(e.at, st.last_available_at))) * 1000)::float8 as e
      from (
        select store_number, part_number, kind, at, lead(at) over w as next_at
        from availability_events
        where not first_seen and at > now() - make_interval(days => ${WINDOW_DAYS})
          and store_number in (${inList(stores)}) and part_number in (${inList(parts)})
        window w as (partition by store_number, part_number order by at)
      ) e
      left join store_sku_status st on st.store_number = e.store_number and st.part_number = e.part_number
      where e.kind = 'restock'`);
    return (r.rows as { store_number: string; part_number: string; s: number; e: number }[]).map((x) => [x.store_number, x.part_number, Number(x.s), Number(x.e)]);
  },
  ["pickup-windows-v1"],
  { revalidate: 300 },
);

const configOf = (part: string): Config | null => {
  const i = PART_INDEX.get(part);
  return i ? { model: modelKeyFor(i.model), storage: i.storage, color: i.color } : null;
};

/**
 * POST /api/windows {parts, stores, lat?, lng?} — for configurations (part numbers, any country) × stores, the past
 * WINDOW_DAYS' pickup windows and which single change would have added the most: another colour or storage of a
 * chosen configuration at the chosen stores, or one of the nearest unchosen stores with every chosen configuration.
 * Free and anonymous; rate-limited per IP; the location only measures distances and is neither stored nor returned.
 */
export async function POST(req: Request) {
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY) return fail(413, "too_large");
  let body: unknown;
  try { body = JSON.parse(text); } catch { return fail(400, "bad_body"); }
  const sel = parseSelection(body, (p) => PART_INDEX.has(p), (s) => STORE_INDEX.has(s));
  if ("error" in sel) return fail(400, sel.error, sel.detail);
  try {
    if (!(await rateLimit(`windows:${clientIp(req)}`, RATE_PER_MIN, 60_000))) return fail(429, "rate_limited");
  } catch {
    /* the limiter's database said nothing: never fail a public read on it */
  }

  const configs = [...new Map(sel.parts.map(configOf).filter((c): c is Config => c !== null).map((c) => [configKey(c), c])).values()];
  const chosen = sel.stores.map((n) => STORE_INDEX.get(n)!);
  const cc: CountryCode = chosen[0].country;
  const models = [...new Set(configs.map((c) => c.model as ModelKey))];
  // The selection's country decides what can be added: its catalogue for the chosen models, its nearest stores.
  const offered = catalogOf(cc).map((c) => ({ model: modelKeyFor(c.model), storage: c.storage, color: c.color })).filter((c) => models.includes(c.model));
  const anchor = anchorFor(chosen, sel.here);
  const near = anchor ? nearestStores(anchor, storesOf(cc), new Set(sel.stores)) : [];
  const candidates = [...configCandidates(configs, offered), ...near];

  const allStores = [...new Set([...sel.stores, ...near.map((n) => n.store)])].sort();
  const countries = [...new Set(allStores.map((n) => countryOfStore(n)).filter((c): c is CountryCode => Boolean(c)))];
  const parts = [...new Set(countries.flatMap((c) => models.flatMap((m) => partNumbersFor(m, [], [], c))))].sort();

  const now = Date.now();
  const tracked = Math.min(...countries.map((c) => Date.parse(`${c === "us" ? TRACKING_SINCE_US : TRACKING_SINCE_INTL}T00:00:00Z`)));
  const from = Math.max(now - WINDOW_DAYS * 86_400_000, Number.isFinite(tracked) ? tracked : 0);

  let rows: [string, string, number, number][] = [];
  if (hasDatabase() && parts.length) {
    try {
      rows = await windowRows(allStores, parts);
    } catch (e) {
      await recordError("web", `pickup windows: ${errorMessage(e)}`).catch(() => undefined);
      return fail(503, "unavailable");
    }
  }
  const byPair = new Map<string, Interval[]>();
  for (const [store, part, s, e] of rows) {
    const c = configOf(part);
    if (!c) continue;
    const k = pairKey(store, configKey(c));
    const list = byPair.get(k) ?? [];
    list.push([s, Math.max(s, e)]);
    byPair.set(k, list);
  }
  const r = pickupWindows({ byPair, configs, stores: sel.stores, candidates, from, to: now });
  const partIn = (c: Config) => catalogOf(cc).find((x) => modelKeyFor(x.model) === c.model && x.storage === c.storage && x.color === c.color)?.partNumber ?? null;

  const out: WindowsResponse = {
    generatedAt: new Date(now).toISOString(),
    window: { from: new Date(r.from).toISOString(), to: new Date(r.to).toISOString(), days: r.days },
    selection: r.selection,
    sample: r.sample,
    minSample: MIN_SAMPLE,
    tooFew: r.tooFew,
    gains: r.gains.map((g) => {
      const base = { windows: g.windows, listedMin: g.listedMin, alerts: g.alerts };
      const c = g.candidate;
      if (c.kind === "store") {
        const s = STORE_INDEX.get(c.store)!;
        return { ...base, kind: "store" as const, storeNumber: s.storeNumber, store: s.name, city: s.city, country: s.country, distanceMi: c.distanceMi, distanceFrom: anchor?.from ?? "store" };
      }
      return { ...base, kind: c.kind, model: c.config.model, storage: c.config.storage, color: c.config.color, part: partIn(c.config) };
    }),
    method: METHOD,
  };
  return NextResponse.json(out, { headers });
}
