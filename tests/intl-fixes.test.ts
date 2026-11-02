import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import * as world from "@/lib/apple/catalog";
import * as us from "@/lib/apple/catalog-us";
import { ALL_CODES, COUNTRIES, INTL_CODES, countryFromPrefix, formatPrice, isCountryCode, type CountryCode } from "@/lib/apple/countries";
import { buildPickupUrl } from "@/lib/apple/client";
import { intlWatchStep, INTL_RUNS, type IntlWatchState } from "@/lib/stock/fallback";
import { nextCountryBackoff } from "@/lib/stock/sweep";
import { gate } from "@/lib/stock/fastlane";

/* ------------------------------------------------------------------ the browser never gets the other countries */

const SRC = path.resolve("src");
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) sourceFiles(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
}
/** Runtime imports of a module (type-only imports are erased and do not count). */
function runtimeImports(file: string): string[] {
  const s = readFileSync(file, "utf8");
  const out: string[] = [];
  const re = /(?:^|\n)\s*(?:import|export)\s+(type\s+)?([^;]*?)\s+from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|(?:^|\n)\s*import\s+["']([^"']+)["']/g;
  for (let m: RegExpExecArray | null; (m = re.exec(s)); ) {
    if (m[1]) continue;
    const clause = m[2]?.trim();
    if (clause && /^\{[^}]*\}$/.test(clause) && clause.slice(1, -1).split(",").map((x) => x.trim()).filter(Boolean).every((x) => x.startsWith("type "))) continue;
    out.push(m[3] ?? m[4] ?? m[5]);
  }
  return out;
}

describe("client bundles hold the US catalogue only", () => {
  it("no module a client component can reach imports catalog.ts or the other countries' data", () => {
    const files = sourceFiles(SRC);
    const isClient = (f: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(readFileSync(f, "utf8"));
    const via = new Map<string, string | null>();
    const queue: [string, string | null][] = files.filter(isClient).map((f) => [f, null]);
    expect(queue.length).toBeGreaterThan(10);
    while (queue.length) {
      const [f, from] = queue.shift()!;
      if (via.has(f)) continue;
      via.set(f, from);
      for (const spec of runtimeImports(f)) { const r = resolveImport(f, spec); if (r && !via.has(r)) queue.push([r, f]); }
    }
    const chain = (f: string) => { const c: string[] = []; for (let x: string | null | undefined = f; x; x = via.get(x)) c.push(path.relative(SRC, x)); return c.join(" ← "); };
    for (const banned of ["lib/apple/catalog.ts", "lib/apple/data.ts"]) {
      const abs = path.join(SRC, banned);
      expect(via.has(abs) ? chain(abs) : null, `${banned} is in the client graph`).toBeNull();
    }
    // The US view is what they use instead.
    expect(via.has(path.join(SRC, "lib/apple/catalog-us.ts"))).toBe(true);
  });

  it("catalog-us.ts answers every US question exactly as catalog.ts does", () => {
    expect(us.STORES).toBe(world.STORES);
    expect(us.CATALOG).toBe(world.CATALOG);
    expect(us.ALL_PART_NUMBERS).toBe(world.ALL_PART_NUMBERS);
    expect(us.STORE_INDEX.size).toBe(269);
    expect(us.PART_INDEX.size).toBe(40);
    for (const s of us.STORES) {
      expect(us.STORE_INDEX.get(s.storeNumber)).toBe(world.STORE_INDEX.get(s.storeNumber));
      expect(us.storePath(s)).toBe(world.storePath(s));
      expect(us.cityPath(s.state, s.city)).toBe(world.cityPath(s.state, s.city));
      expect(us.statePath(s.state)).toBe(world.statePath(s.state));
      expect(us.hasStatePage(s.state)).toBe(world.hasStatePage(s.state));
      expect(us.isOneStoreCity(s.state, s.city)).toBe(world.isOneStoreCity(s.state, s.city));
      expect(us.storeTimeZone(s)).toBe(world.storeTimeZone(s));
      expect(us.storeInCountry(s.storeNumber)).toBe(s);
    }
    for (const c of us.CATALOG) expect(us.PART_INDEX.get(c.partNumber)).toBe(world.PART_INDEX.get(c.partNumber));
    expect(us.statesWithStores()).toEqual(world.statesWithStores());
    expect(us.citiesWithStores()).toEqual(world.citiesWithStores());
    for (const m of us.MODELS) {
      expect(us.catalogFor(m.key)).toEqual(world.catalogFor(m.key));
      expect(us.storagesFor(m.key)).toEqual(world.storagesFor(m.key));
      expect(us.colorsFor(m.key)).toEqual(world.colorsFor(m.key));
      expect(us.partNumbersFor(m.key)).toEqual(world.partNumbersFor(m.key));
    }
    expect(us.placeTarget("us", "texas")).toEqual(world.placeTarget("us", "texas"));
    // …and nothing else: a foreign id stays unknown in the browser, as it was before other countries existed.
    expect(us.storesOf("uk")).toEqual([]);
    expect(us.STORE_INDEX.has(world.storesOf("uk")[0].storeNumber)).toBe(false);
  });
});

/* ------------------------------------------------------------------ country codes from the outside world */

describe("country codes", () => {
  it("only own keys are countries (no prototype names)", () => {
    for (const k of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", ""]) {
      expect(isCountryCode(k)).toBe(false);
      expect(countryFromPrefix(k)).toBeUndefined();
      expect(world.catalogOf(k as CountryCode)).toEqual([]);
      expect(world.storesOf(k as CountryCode)).toEqual([]);
      expect(world.partNumbersFor("duo", [], [], k as CountryCode)).toEqual([]);
      expect(world.placeTarget(k as CountryCode)).toBeNull();
      expect(() => buildPickupUrl(["X"], "", { country: k as CountryCode })).toThrow(/unknown country/);
    }
    for (const cc of ALL_CODES) expect(isCountryCode(cc)).toBe(true);
    expect(countryFromPrefix("us")).toBeUndefined();
    expect(countryFromPrefix("uk")).toBe(COUNTRIES.uk);
  });

  it("GET /api/stock: a prototype name is a 400, an empty country is the US (as before the parameter)", async () => {
    const { GET } = await import("@/app/api/stock/route");
    const bad = await GET(new Request("http://x/api/stock?model=duo&country=constructor"));
    expect(bad.status).toBe(400);
    expect((await GET(new Request("http://x/api/stock?model=duo&country=__proto__"))).status).toBe(400);
    const empty = await GET(new Request("http://x/api/stock?model=duo&country="));
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual({ model: "duo", rows: [] });
    const uk = await GET(new Request("http://x/api/stock?model=duo&country=UK"));
    expect(await uk.json()).toEqual({ model: "duo", country: "uk", rows: [] });
  });
});

/* ------------------------------------------------------------------ prices, zones */

describe("prices and time zones", () => {
  it("no country writes a thousands separator an English reader takes for a decimal point", () => {
    for (const cc of ALL_CODES) {
      const s = formatPrice(COUNTRIES[cc], 1449);
      expect(s, cc).not.toMatch(/1\.449/);
      expect(s, cc).toMatch(/1[,\s\u00a0\u202f'’]?449/);
    }
    expect(formatPrice(COUNTRIES.at, 1449)).toBe("€1,449");
    expect(formatPrice(COUNTRIES.de, 1449)).toBe("€1,449");
  });

  it("every zone that can reach SQL is a canonical IANA name (Ubuntu 24.04 Postgres has no Canada/Eastern)", () => {
    for (const cc of INTL_CODES) for (const s of world.storesOf(cc)) {
      const tz = world.storeTimeZone(s);
      expect(tz, s.storeNumber).toMatch(/^(America|Europe|Asia|Australia|Pacific|Africa)\//);
      expect(() => new Intl.DateTimeFormat("en-US", { timeZone: tz })).not.toThrow();
      expect(s.timeZone).toBe(tz);
    }
    expect(world.canonicalTimeZone("Canada/Pacific")).toBe("America/Vancouver");
  });

  it("a store outside the US never falls into the US state table", () => {
    // Perth's region code is "WA", which is Washington in the US table.
    const perth = world.storesOf("au").find((s) => s.regionCode === "WA")!;
    const { timeZone: _drop, ...bare } = perth;
    void _drop;
    expect(world.storeTimeZone(bare)).toBe(COUNTRIES.au.timeZone);
    expect(world.storeTimeZone({ ...bare, timeZone: "Canada/Eastern", country: "ca" })).toBe("America/Toronto");
    // US stores exactly as before.
    expect(world.storeTimeZone(world.STORES.find((s) => s.stateCode === "WA" || s.state === "Washington")!)).toBe("America/Los_Angeles");
  });

  it("itemFor prices a shared part in the store's own country", () => {
    const zd = world.catalogOf("at")[0];
    expect(zd.partNumber).toMatch(/ZD\/A$/);
    expect(world.itemFor(zd.partNumber, "at")).toBe(zd);
    expect(world.itemFor(zd.partNumber, "at")!.price).toBe(world.priceFor(zd.partNumber, "at"));
    expect(world.itemFor(zd.partNumber, "de")!.price).toBe(world.priceFor(zd.partNumber, "de"));
    const sg = world.catalogOf("sg")[0];
    expect(world.itemFor(sg.partNumber, "sg")!.currency).toBe("SGD");
    expect(world.PART_INDEX.get(sg.partNumber)!.currency).toBe("AUD"); // why PART_INDEX alone is not enough
    // A US part: the very object PART_INDEX holds.
    const usPart = world.CATALOG[0].partNumber;
    expect(world.itemFor(usPart, "us")).toBe(world.PART_INDEX.get(usPart));
  });
});

/* ------------------------------------------------------------------ poller and watchdog rules */

describe("the other countries' watchdog mail", () => {
  const t = new Date("2026-11-02T12:00:00Z");
  const run = (st: IntlWatchState, judged: boolean, blind: string[]) => intlWatchStep(st, judged, blind, t);

  it("mails after INTL_RUNS judged blind runs in a row, once, and once more when it clears", () => {
    let st: IntlWatchState = { runs: 0, mailed: false };
    const mails: (string | null)[] = [];
    for (let i = 0; i < INTL_RUNS + 2; i++) { const s = run(st, true, ["uk"]); mails.push(s.mail); st = s.next; }
    expect(mails).toEqual([null, null, "blind", null, null]);
    const r = run(st, true, []);
    expect(r.mail).toBe("recovered");
    expect(r.next).toEqual({ runs: 0, mailed: false, since: null, countries: [] });
  });

  it("a run that is not judged breaks the streak (scattered blind runs never add up to a mail)", () => {
    let st: IntlWatchState = { runs: 0, mailed: false };
    for (let i = 0; i < 10; i++) {
      const a = run(st, true, ["uk"]); expect(a.mail).toBeNull(); st = a.next;
      const b = run(st, false, []); expect(b.mail).toBeNull(); expect(b.next.runs).toBe(0); expect(b.write).toBe(true); st = b.next;
    }
    // Nothing to write while nothing changes.
    expect(run({ runs: 0, mailed: false }, false, []).write).toBe(false);
    // An outstanding mail stays outstanding across unjudged runs.
    expect(run({ runs: 3, mailed: true, since: "x", countries: ["uk"] }, false, []).next).toMatchObject({ runs: 0, mailed: true, countries: ["uk"] });
  });
});

describe("per-country backoff of the per-store round", () => {
  it("rests a country whose round mostly failed, doubling to 16 minutes; a good round clears it", () => {
    const now = 1_000_000;
    expect(nextCountryBackoff(undefined, { tasks: 78, failed: 38 }, now)).toBeNull();
    let b = nextCountryBackoff(undefined, { tasks: 78, failed: 39 }, now)!;
    expect(b).toEqual({ level: 1, until: now + 60_000 });
    const waits = [60_000];
    for (let i = 0; i < 8; i++) { b = nextCountryBackoff(b, { tasks: 2, failed: 2 }, now)!; waits.push(b.until - now); }
    expect(waits).toEqual([60_000, 120_000, 240_000, 480_000, 960_000, 960_000, 960_000, 960_000, 960_000]);
    expect(nextCountryBackoff(b, { tasks: 2, failed: 0 }, now)).toBeNull();
    expect(nextCountryBackoff(undefined, { tasks: 0, failed: 0 }, now)).toBeNull();
  });

  it("the confirm gate never lets more than its bound run at once", async () => {
    const g = gate(3);
    let active = 0, peak = 0;
    const job = () => g(async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 5)); active--; return 1; });
    const results = await Promise.all(Array.from({ length: 20 }, job));
    expect(results.reduce((a, b) => a + b, 0)).toBe(20);
    expect(peak).toBe(3);
    // A failing run frees its slot too.
    await expect(g(async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(await Promise.all(Array.from({ length: 5 }, job))).toHaveLength(5);
  });
});
