import { describe, expect, it, vi, beforeEach } from "vitest";
import { orderTasks, pairKey, pollerVerdict, type Freshness } from "@/lib/stock/fallback";
import type { SweepTask } from "@/lib/stock/sweep";

const fresh = (o: Partial<Freshness> = {}): Freshness => ({ pairs: 100, freshPairs: 100, stores: 10, staleStores: [], oldestSec: 12, ...o });

describe("pollerVerdict — judged by the data, not only the heartbeat", () => {
  it("ok when the heartbeat is recent and everything was checked", () => {
    expect(pollerVerdict(10_000, fresh()).state).toBe("ok");
  });
  it("silent (and Vercel fills in) when the heartbeat is old or missing", () => {
    for (const age of [80_000, Infinity]) {
      const v = pollerVerdict(age, fresh());
      expect(v.state).toBe("silent");
      expect(v.fill).toBe(true);
    }
  });
  it("silent a minute sooner when the heartbeat is late and the data has gone stale too", () => {
    // Seen in the 2026-10-31 drill: poller stopped, heartbeat 71 s old, nothing fresh — that is gone, not blind.
    expect(pollerVerdict(71_000, fresh({ freshPairs: 0 })).state).toBe("silent");
    // …but a late heartbeat with fresh data is just a slow round.
    expect(pollerVerdict(71_000, fresh()).state).toBe("ok");
    // …and the poller's own spare mode (beats every ~40 s, data stale) stays "blind": Vercel keeps out.
    expect(pollerVerdict(42_000, fresh({ freshPairs: 10 })).state).toBe("blind");
  });
  it("blind when the poller beats but under half the pairs are fresh — no Vercel fill-in", () => {
    const v = pollerVerdict(5_000, fresh({ freshPairs: 30 }));
    expect(v.state).toBe("blind");
    expect(v.fill).toBe(false);
    expect(v.summary).toContain("30%");
  });
  it("partial names the stores that went unchecked", () => {
    const v = pollerVerdict(5_000, fresh({ freshPairs: 95, staleStores: ["R001", "R002"] }));
    expect(v.state).toBe("partial");
    expect(v.summary).toContain("R001, R002");
  });
  it("no freshness data (the query failed) falls back to the heartbeat alone", () => {
    expect(pollerVerdict(5_000, null).state).toBe("ok");
  });
});

const task = (location: string, covers: string[], parts: string[], batchIndex = 0): SweepTask => ({ anchor: { anchorStore: covers[0], anchorName: location, location, covers }, batchIndex, parts });

describe("orderTasks — where the serverless fallback spends its few requests", () => {
  const A = task("10001", ["R1", "R2"], ["P1", "P2"]);
  const B = task("94103", ["R3"], ["P1", "P2"]);
  const C = task("60601", ["R4"], ["P1", "P2"]);
  it("stale watched pairs come first, stalest first", () => {
    const ages: Record<string, number> = { "R1|P1": 300, "R3|P2": 900, "R4|P1": 5000 };
    const watched = new Set([pairKey("R1", "P1"), pairKey("R3", "P2")]);
    const order = orderTasks([A, B, C], watched, (s, p) => ages[`${s}|${p}`] ?? 10);
    expect(order.map((t) => t.anchor.location)).toEqual(["94103", "10001", "60601"]);
  });
  it("a watched pair checked a moment ago doesn't starve the stale rest of the country", () => {
    const ages: Record<string, number> = { "R1|P1": 20, "R4|P2": 3000 };
    const order = orderTasks([A, B, C], new Set([pairKey("R1", "P1")]), (s, p) => ages[`${s}|${p}`] ?? 10);
    expect(order[0].anchor.location).toBe("60601");
  });
  it("without alerts it is simply oldest first, ties in plan order", () => {
    const order = orderTasks([A, B, C], new Set(), () => 50);
    expect(order.map((t) => t.anchor.location)).toEqual(["10001", "94103", "60601"]);
  });
});

/* ---------------- the sweep engine itself, with the database and Apple faked ---------------- */

const inserted: { table: string; rows: unknown }[] = [];
vi.mock("@/lib/db", () => {
  const chain = { onConflictDoNothing: async () => undefined, then: (r: (v: unknown) => void) => r(undefined) };
  return {
    schema: { sweeps: { id: "sweeps.id" }, pollLog: "poll_log" },
    db: () => ({
      insert: (table: unknown) => ({ values: (rows: unknown) => { inserted.push({ table: String(table), rows }); return chain; } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    }),
  };
});
vi.mock("@/lib/stock/ingest", () => ({ ingestStores: async () => ({ transitions: [], eventIds: [], held: 0 }) }));
vi.mock("@/lib/stock/notify", () => ({ notifyRestocks: async () => ({ matched: 0, sent: 0, failed: 0, skipped: 0 }) }));
vi.mock("@/lib/errors", () => ({ recordError: async () => undefined, errorMessage: (e: unknown) => String(e) }));

const okBody = (store: string) => JSON.stringify({ head: { status: "200" }, body: { stores: [{ storeNumber: store, storeName: "x", city: "c", state: "s", storedistance: 1, partsAvailability: {} }] } });

describe("runSweep — a failed request is retried once in the same sweep", () => {
  beforeEach(() => { inserted.length = 0; });
  const tasks = [task("10001", ["R1"], ["P1"]), task("94103", ["R2"], ["P1"]), task("60601", ["R3"], ["P1"])];

  it("retries the one that failed through a fresh identity, and it lands", async () => {
    const { runSweep } = await import("@/lib/stock/sweep");
    const calls: string[] = [];
    let identities = 0;
    const egress = {
      name: "test",
      async acquire() {
        const id = ++identities;
        return {
          label: `id${id}`, release() {},
          fetch: async (url: string) => {
            const loc = new URL(url).searchParams.get("location")!;
            calls.push(`${loc}@id${id}`);
            // 94103 fails the first time only.
            if (loc === "94103" && calls.filter((c) => c.startsWith("94103")).length === 1) return { status: 541, text: async () => "" };
            return { status: 200, text: async () => okBody(loc === "10001" ? "R006" : loc === "94103" ? "R080" : "R184") };
          },
        };
      },
    };
    const r = await runSweep({ egress, tasks, concurrency: 1, mode: "full", host: "test" });
    expect(r.requests).toBe(4);
    expect(r.failures).toBe(1);
    expect(r.recovered).toBe(1);
    expect(r.unresolved).toBe(0);
    expect(r.storesCovered).toBe(3);
    // the retry used a new identity, after the first pass
    expect(calls.at(-1)).toBe("94103@id4");
  });

  it("does not retry when most of the sweep failed (an outage, not a blip)", async () => {
    const { runSweep } = await import("@/lib/stock/sweep");
    let n = 0;
    const egress = { name: "dead", async acquire() { return { label: `x${++n}`, release() {}, fetch: async () => ({ status: 541, text: async () => "" }) }; } };
    const r = await runSweep({ egress, tasks, concurrency: 2, mode: "full", host: "test" });
    expect(r.requests).toBe(3);
    expect(r.recovered).toBe(0);
    expect(r.unresolved).toBe(3);
  });

  it("can be told not to retry (single-identity egress)", async () => {
    const { runSweep } = await import("@/lib/stock/sweep");
    let first = true;
    const egress = { name: "one", async acquire() { return { label: "one", release() {}, fetch: async (url: string) => {
      const loc = new URL(url).searchParams.get("location")!;
      if (loc === "60601" && first) { first = false; return { status: 500, text: async () => "" }; }
      return { status: 200, text: async () => okBody("R1") };
    } }; } };
    const r = await runSweep({ egress, tasks, concurrency: 1, mode: "degraded", host: "test", retryFailed: false });
    expect(r.requests).toBe(3);
    expect(r.unresolved).toBe(1);
  });
});

describe("shouldRetry", async () => {
  const { shouldRetry } = await import("@/lib/stock/sweep");
  it("retries a minority of failures when the first pass was quick", () => {
    expect(shouldRetry(3, 84, 12_000)).toBe(true);
    expect(shouldRetry(0, 84, 12_000)).toBe(false);
    expect(shouldRetry(60, 84, 12_000)).toBe(false);
    expect(shouldRetry(3, 84, 45_000)).toBe(false);
  });
});
