import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import {
  MAX_PARTS, MAX_STORES, MIN_SAMPLE, anchorFor, configCandidates, configKey, nearestStores, pairKey, parseSelection, pickupWindows, unionOf,
  type Candidate, type Config, type Interval, type WindowsResponse,
} from "@/lib/stock/windows";
import { STORES, partNumbersFor } from "@/lib/apple/catalog";
import { CDICTS } from "@/lib/i18n/cdict/all";
import { DICTS } from "@/lib/i18n/dict/all";
import { PLANS } from "@/lib/plans";

const S = 1000;
const A: Config = { model: "duo", storage: "512GB", color: "Night Sky" };
const B: Config = { model: "duo", storage: "512GB", color: "Star White" };
const C: Config = { model: "duo", storage: "1TB", color: "Night Sky" };

describe("pickup windows — merging", () => {
  it("merges overlapping and touching intervals, counts the rest apart", () => {
    expect(unionOf([])).toEqual({ windows: 0, listedMs: 0 });
    expect(unionOf([[0, 60 * S], [30 * S, 120 * S], [1000 * S, 1060 * S]])).toEqual({ windows: 2, listedMs: 180 * S });
    // Touching (one ends as the next starts): one window.
    expect(unionOf([[0, 10], [10, 20]])).toEqual({ windows: 1, listedMs: 20 });
    // Order does not matter; a window inside another adds nothing.
    expect(unionOf([[50, 60], [0, 100], [20, 30]])).toEqual({ windows: 1, listedMs: 100 });
  });
});

describe("pickup windows — candidates", () => {
  const offered: Config[] = [A, B, { ...A, color: "Sage" }, C, { ...B, storage: "1TB" }, { model: "duo", storage: "256GB", color: "Night Sky" }, { model: "18-pro", storage: "512GB", color: "Silver" }];
  it("offers other colours first, then other storages, each once, never one already chosen or another model's", () => {
    const c = configCandidates([A], offered);
    expect(c.map((x) => `${x.kind}:${configKey(x.config)}`)).toEqual([
      "color:duo|512GB|Star White", "color:duo|512GB|Sage", "storage:duo|1TB|Night Sky", "storage:duo|256GB|Night Sky",
    ]);
    // With Star White chosen too, it is no longer a candidate, and its own other storage joins.
    const d = configCandidates([A, B], offered);
    expect(d.some((x) => configKey(x.config) === configKey(B))).toBe(false);
    expect(d.filter((x) => x.kind === "storage").map((x) => configKey(x.config))).toContain("duo|1TB|Star White");
    expect(new Set(d.map((x) => configKey(x.config))).size).toBe(d.length);
  });
  const stores = [
    { storeNumber: "R1", lat: 40.0, lng: -74.0 },
    { storeNumber: "R2", lat: 40.1, lng: -74.0 },
    { storeNumber: "R3", lat: 40.3, lng: -74.0 },
    { storeNumber: "R4", lat: 41.0, lng: -74.0 },
  ];
  it("measures from the device when it is near a chosen store, else from the first chosen store", () => {
    expect(anchorFor([stores[0]], { lat: 40.05, lng: -74 })).toMatchObject({ from: "you", lat: 40.05 });
    expect(anchorFor([stores[0]], { lat: 51.5, lng: -0.1 })).toMatchObject({ from: "store", lat: 40.0 });
    expect(anchorFor([stores[1]], null)).toMatchObject({ from: "store", lat: 40.1 });
    expect(anchorFor([], null)).toBeNull();
  });
  it("lists the nearest unchosen stores, nearest first, with straight-line miles", () => {
    const n = nearestStores({ lat: 40, lng: -74 }, stores, new Set(["R1"]), 2);
    expect(n.map((x) => x.store)).toEqual(["R2", "R3"]);
    expect(n[0].distanceMi).toBeCloseTo(6.9, 0);
  });
});

describe("pickup windows — gains", () => {
  const byPair = new Map<string, Interval[]>([
    [pairKey("R1", configKey(A)), [[0, 60 * S], [1000 * S, 1060 * S]]],
    [pairKey("R2", configKey(A)), [[30 * S, 120 * S]]], // overlaps R1's first window: counted once
    [pairKey("R1", configKey(B)), [[5000 * S, 5060 * S]]],
    [pairKey("R2", configKey(B)), [[1030 * S, 1100 * S]]], // inside R1's second window's reach: longer, not new
    [pairKey("R1", configKey(C)), [[7000 * S, 7060 * S], [8000 * S, 8060 * S], [9000 * S, 9060 * S]]],
    [pairKey("R3", configKey(A)), [[0, 10 * S]]],
  ]);
  const candidates: Candidate[] = [
    { kind: "store", store: "R3", distanceMi: 3.2 },
    { kind: "color", config: B },
    { kind: "storage", config: C },
  ];
  const r = pickupWindows({ byPair, configs: [A], stores: ["R1", "R2"], candidates, from: 0, to: 10_000 * S });

  it("counts the selection's windows once across stores, with their listed time", () => {
    expect(r.selection).toEqual({ configs: 1, stores: 2, alerts: 2, windows: 2, listedMin: 3 });
  });
  it("ranks every candidate by windows gained, then listed time", () => {
    expect(r.gains.map((g) => [g.candidate.kind, g.windows, g.listedMin, g.alerts])).toEqual([
      ["storage", 3, 3, 2],
      ["color", 1, 2, 2],
      ["store", 0, 0, 1],
    ]);
  });
  it("flags a comparison under the sample threshold", () => {
    expect(r.sample).toBe(6);
    expect(r.tooFew).toBe(6 < MIN_SAMPLE);
    expect(pickupWindows({ byPair, configs: [A], stores: ["R1", "R2"], candidates, from: 0, to: 10_000 * S, minSample: 10 }).tooFew).toBe(true);
  });
  it("only counts what falls in the window", () => {
    const late = pickupWindows({ byPair, configs: [A], stores: ["R1", "R2"], candidates: [], from: 500 * S, to: 10_000 * S });
    expect(late.selection.windows).toBe(1);
    expect(late.days).toBeCloseTo(0.1, 1);
  });
});

describe("pickup windows — request checks", () => {
  const part = (p: string) => p.startsWith("M");
  const store = (s: string) => /^R\d+$/.test(s);
  it("rejects malformed, empty, oversized and unknown selections", () => {
    expect(parseSelection(null, part, store)).toEqual({ error: "bad_body" });
    expect(parseSelection({ parts: "M1", stores: ["R1"] }, part, store)).toEqual({ error: "bad_body" });
    expect(parseSelection({ parts: [], stores: ["R1"] }, part, store)).toEqual({ error: "empty" });
    expect(parseSelection({ parts: Array.from({ length: MAX_PARTS + 1 }, (_, i) => `M${i}`), stores: ["R1"] }, part, store)).toMatchObject({ error: "too_many" });
    expect(parseSelection({ parts: ["M1"], stores: Array.from({ length: MAX_STORES + 1 }, (_, i) => `R${i}`) }, part, store)).toMatchObject({ error: "too_many" });
    expect(parseSelection({ parts: ["X1"], stores: ["R1"] }, part, store)).toEqual({ error: "unknown_part", detail: "X1" });
    expect(parseSelection({ parts: ["M1"], stores: ["Q1"] }, part, store)).toEqual({ error: "unknown_store", detail: "Q1" });
    expect(parseSelection({ parts: ["M1"], stores: ["R1"], lat: 91, lng: 0 }, part, store)).toEqual({ error: "bad_location" });
  });
  it("de-duplicates and rounds the location to about a kilometre", () => {
    expect(parseSelection({ parts: ["M1", "M1"], stores: ["R1"], lat: 40.712776, lng: -74.005974 }, part, store)).toEqual({ parts: ["M1"], stores: ["R1"], here: { lat: 40.71, lng: -74.01 } });
  });
});

describe("POST /api/windows (no database)", () => {
  beforeAll(() => { delete process.env.DATABASE_URL; });
  const post = async (body: unknown) => {
    const { POST } = await import("@/app/api/windows/route");
    return POST(new Request("https://pickupchecker.com/api/windows", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));
  };
  it("answers a valid selection with candidates, an honest method and no location echoed", async () => {
    const parts = partNumbersFor("duo", ["512GB"], [], "us").slice(0, 1);
    const res = await post({ parts, stores: [STORES[0].storeNumber], lat: STORES[0].lat, lng: STORES[0].lng });
    expect(res.status).toBe(200);
    const j = (await res.json()) as WindowsResponse;
    expect(j.selection).toMatchObject({ configs: 1, stores: 1, alerts: 1, windows: 0 });
    expect(j.tooFew).toBe(true);
    expect(j.gains.filter((g) => g.kind === "store")).toHaveLength(5);
    expect(j.gains.some((g) => g.kind === "color")).toBe(true);
    expect(j.method).toMatch(/not a forecast or a chance of buying/);
    expect(JSON.stringify(j)).not.toContain(String(STORES[0].lat));
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  it("refuses bad input", async () => {
    expect((await post("{")).status).toBe(400);
    expect((await post({ parts: ["NOPE"], stores: ["R001"] })).status).toBe(400);
    expect((await post("x".repeat(5000))).status).toBe(413);
  });
});

describe("pickup windows and pricing copy", () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  it("every language has the tool's strings with the English placeholders", () => {
    const en = CDICTS.en.alerts.windows;
    for (const [lang, c] of Object.entries(CDICTS)) {
      const w = c.alerts.windows;
      for (const k of Object.keys(en) as (keyof typeof en)[]) {
        const a = en[k], b = w[k];
        if (typeof a === "string") expect(placeholders(b as string), `${lang}.${k}`).toEqual(placeholders(a));
        else expect(typeof b, `${lang}.${k}`).toBe("object");
      }
    }
  });
  it("never words past windows as odds", () => {
    for (const c of Object.values(CDICTS)) expect(JSON.stringify(c.alerts.windows)).not.toMatch(/\b(odds|likely|easiest|doubles?)\b/i);
  });
  it("pricing states planned and measured figures, never a 'fastest' claim, and the table follows PLANS", () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      const p = d.account.pricing;
      expect(p.speedAnswer({ p50: "5.0 s", p95: "5.4 s" }), lang).toContain("5.4 s");
      expect(p.push({ p50: "1.9 s", p90: "5.3 s", n: "3,085" }), lang).toContain("3,085");
      const table = p.tableAnswer({ limit: PLANS.plus.limit, price: PLANS.plus.priceUsd }, { limit: PLANS.pro.limit, price: PLANS.pro.priceUsd }, { limit: PLANS.max.limit, price: PLANS.max.priceUsd });
      for (const k of ["plus", "pro", "max"] as const) expect(table, `${lang} ${k}`).toContain(`$${PLANS[k].priceUsd}`);
      expect(p.skip.length, lang).toBe(4);
      expect(p.report, lang).toContain("(/service-report)");
      expect(Object.keys(p), lang).not.toContain("fastest");
    }
    expect(JSON.stringify(DICTS.en.account.pricing)).not.toMatch(/fastest/i);
  });
});
