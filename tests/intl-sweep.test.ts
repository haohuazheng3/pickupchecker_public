import { describe, expect, it, vi, beforeEach } from "vitest";
import { INTL_COVERAGE } from "@/lib/apple/catalog";

/* The sweep engine in mode "intl", with the database and Apple faked (same fakes as tests/fallback.test.ts).
 * These cases use the store-by-store shape (`anchors: {}`), which the round still uses for stores no anchor returns;
 * the anchor shape is covered in tests/intl-coverage.test.ts. */
const inserted: { table: string; rows: unknown }[] = [];
vi.mock("@/lib/db", () => {
  const chain = { onConflictDoNothing: async () => undefined, then: (r: (v: unknown) => void) => r(undefined) };
  return {
    schema: { sweeps: { id: "sweeps.id" }, pollLog: "poll_log" },
    db: () => ({
      insert: (table: unknown) => ({ values: (rows: unknown) => { inserted.push({ table: typeof table === "string" ? table : "sweeps", rows }); return chain; } }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    }),
  };
});
/** Pending observations the next ingest reports (a first "available" triggers the instant confirm). */
const nextPending: { storeNumber: string; partNumber: string; status: string }[][] = [];
vi.mock("@/lib/stock/ingest", () => ({ ingestStores: async () => ({ transitions: [], eventIds: [], held: 0, pending: nextPending.shift() ?? [], refuted: [] }) }));
vi.mock("@/lib/stock/notify", () => ({ notifyRestocks: async () => ({ matched: 0, sent: 0, failed: 0, skipped: 0 }) }));
const errors: string[] = [];
vi.mock("@/lib/errors", () => ({ recordError: async (_s: string, m: string) => { errors.push(m); }, errorMessage: (e: unknown) => String(e) }));
const confirmCalls: Record<string, unknown>[] = [];
vi.mock("@/lib/stock/fastlane", async (orig) => ({
  ...(await orig<typeof import("@/lib/stock/fastlane")>()),
  confirmPendingRestocks: async (_p: unknown, o: Record<string, unknown>) => { confirmCalls.push(o); return { rows: [], confirmed: 0, refuted: 0, requests: 0 }; },
}));

const body = (store: string) => JSON.stringify({ head: { status: "200" }, body: { stores: [{ storeNumber: store, storeName: "x", city: "c", state: "", partsAvailability: {} }] } });

describe("runSweep — the other countries' per-store round", () => {
  beforeEach(() => { inserted.length = 0; errors.length = 0; confirmCalls.length = 0; nextPending.length = 0; });

  it("asks each store on its own country's endpoint, retries a failure, and logs only failures", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const tasks = buildIntlTasks(["uk"], { anchors: {} }).slice(0, 4); // two stores × two batches
    const stores = [...new Set(tasks.map((t) => t.store!))];
    const urls: string[] = [];
    let failedOnce = false, n = 0;
    const egress = {
      name: "test",
      async acquire() {
        const id = ++n;
        return {
          label: `id${id}`, release() {},
          fetch: async (url: string) => {
            urls.push(url);
            const store = new URL(url).searchParams.get("store")!;
            if (store === stores[1] && !failedOnce) { failedOnce = true; return { status: 503, text: async () => "" }; }
            return { status: 200, text: async () => body(store) };
          },
        };
      },
    };
    const r = await runSweep({ egress, tasks, concurrency: 2, mode: "intl", host: "test", known: new Set(stores), logOk: false, timeoutMs: 6000 });
    expect(r.requests).toBe(5);
    expect(r.failures).toBe(1);
    expect(r.recovered).toBe(1);
    expect(r.unresolved).toBe(0);
    expect(r.storesCovered).toBe(2);
    for (const u of urls) {
      const x = new URL(u);
      expect(x.pathname).toBe("/uk/shop/retail/pickup-message");
      expect(x.searchParams.get("cppart")).toBe("UNLOCKED/GB");
      expect(x.searchParams.has("location")).toBe(false);
    }
    const logged = inserted.filter((i) => i.table === "poll_log").flatMap((i) => i.rows as { ok: boolean; country?: string; anchor: string }[]);
    expect(logged).toHaveLength(1);
    expect(logged[0]).toMatchObject({ ok: false, country: "uk", anchor: `uk:${stores[1]}` });
    // One sweeps row for the round.
    expect(inserted.filter((i) => i.table === "sweeps")).toHaveLength(1);
    expect((inserted.find((i) => i.table === "sweeps")!.rows as { mode: string }).mode).toBe("intl");
  });

  it("the US sweep still logs every request, without a country", async () => {
    const { runSweep, buildTasks } = await import("@/lib/stock/sweep");
    const tasks = buildTasks().slice(0, 2);
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async (url: string) => { expect(new URL(url).pathname).toBe("/shop/retail/pickup-message"); return { status: 200, text: async () => body("R085") }; } }; } };
    await runSweep({ egress, tasks, concurrency: 1, mode: "full", host: "test" });
    const logged = inserted.filter((i) => i.table === "poll_log").flatMap((i) => i.rows as Record<string, unknown>[]);
    expect(logged).toHaveLength(2);
    for (const row of logged) expect("country" in row).toBe(false);
  });

  it("a one-store answer without that store is a failure: logged, retried, counted per country", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const tasks = buildIntlTasks(["ca"], { anchors: {} }).slice(0, 6); // three stores × two batches
    const stores = [...new Set(tasks.map((t) => t.store!))];
    let missing = 0;
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async (url: string) => {
      const store = new URL(url).searchParams.get("store")!;
      // The first store answers without itself (an empty list, as Apple does for a closed store), every time.
      if (store === stores[0]) { missing++; return { status: 200, text: async () => JSON.stringify({ head: { status: "200" }, body: { stores: [] } }) }; }
      return { status: 200, text: async () => body(store) };
    } }; } };
    const r = await runSweep({ egress, tasks, concurrency: 1, mode: "intl", host: "test", known: new Set(stores), logOk: false, timeoutMs: 6000 });
    expect(missing).toBe(4); // two batches, each retried once
    expect(r.failures).toBe(4);
    expect(r.unresolved).toBe(2);
    expect(r.storesCovered).toBe(2);
    expect(r.byCountry).toEqual({ ca: { tasks: 6, failed: 2, unresolved: 2, throttled: 0 } });
    const logged = inserted.filter((i) => i.table === "poll_log").flatMap((i) => i.rows as { ok: boolean; error: string; anchor: string }[]);
    expect(logged).toHaveLength(4);
    for (const row of logged) expect(row).toMatchObject({ ok: false, error: "store missing from response", anchor: `ca:${stores[0]}` });
  });

  it("Apple's \"no store associated with this search\" is an answer, not a failure: not retried, logged or counted", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const all = buildIntlTasks(["au"], { anchors: {} });
    const tasks = all.filter((t) => t.store === "R384" || t.store === all[0].store); // Chermside + one more, two batches each
    const other = all[0].store!;
    const asked: string[] = [];
    // What Apple answered for store=R384 on 2026-11-02: HTTP 200, an empty list, and its own message.
    const noStore = JSON.stringify({ head: { status: "200" }, body: { stores: [], errorMessage: "There is no store associated with this search. Please try another search value." } });
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async (url: string) => {
      const store = new URL(url).searchParams.get("store")!;
      asked.push(store);
      return { status: 200, text: async () => (store === "R384" ? noStore : body(store)) };
    } }; } };
    const r = await runSweep({ egress, tasks, concurrency: 1, mode: "intl", host: "test", known: new Set(["R384", other]), logOk: false, timeoutMs: 6000 });
    expect(asked.filter((x) => x === "R384")).toHaveLength(2); // its two batches, no retry pass
    expect(r.failures).toBe(0);
    expect(r.unresolved).toBe(0);
    expect(r.byCountry).toEqual({ au: { tasks: 4, failed: 0, unresolved: 0, throttled: 0 } });
    expect(r.pickup).toEqual({ notOffered: { R384: { country: "au", message: "There is no store associated with this search. Please try another search value." } }, answered: [other] });
    expect(inserted.filter((i) => i.table === "poll_log")).toHaveLength(0);
    expect(errors).toEqual([]);
  });

  it("a country whose round mostly failed is not retried (an outage), the others are; one error per message per round", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const tasks = [...buildIntlTasks(["sg"], { anchors: {} }), ...buildIntlTasks(["hk"], { anchors: {} })]; // SG 3 stores, HK 6 stores
    const sg = new Set(buildIntlTasks(["sg"], { anchors: {} }).map((t) => t.store!));
    const hk = buildIntlTasks(["hk"], { anchors: {} }).map((t) => t.store!);
    let hkFailedOnce = false;
    const asked: string[] = [];
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async (url: string) => {
      const store = new URL(url).searchParams.get("store")!;
      asked.push(store);
      if (sg.has(store)) throw new Error("ECONNREFUSED");
      if (store === hk[0] && !hkFailedOnce) { hkFailedOnce = true; return { status: 503, text: async () => "" }; }
      return { status: 200, text: async () => body(store) };
    } }; } };
    const r = await runSweep({ egress, tasks, concurrency: 3, mode: "intl", host: "test", known: new Set([...sg, ...hk]), logOk: false, timeoutMs: 6000 });
    expect(r.byCountry!.sg).toEqual({ tasks: 6, failed: 6, unresolved: 6, throttled: 0 });
    expect(r.byCountry!.hk).toEqual({ tasks: 12, failed: 1, unresolved: 0, throttled: 0 });
    expect(asked.filter((x) => sg.has(x))).toHaveLength(6); // no retry pass for SG
    expect(r.recovered).toBe(1);
    // Six refused connections, one error group write for the round.
    expect(errors.filter((e) => /ECONNREFUSED/.test(e))).toHaveLength(1);
  });

  it("the instant confirm of other countries uses the round's timeout and a shared bound; the US passes neither", async () => {
    const { runSweep, buildIntlTasks, buildTasks } = await import("@/lib/stock/sweep");
    const tasks = buildIntlTasks(["uk"], { anchors: {} }).slice(0, 1);
    const store = tasks[0].store!;
    nextPending.push([{ storeNumber: store, partNumber: tasks[0].parts[0], status: "available" }]);
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async () => ({ status: 200, text: async () => body(store) }) }; } };
    await runSweep({ egress, tasks, concurrency: 1, mode: "intl", host: "test", known: new Set([store]), logOk: false, timeoutMs: 6000 });
    expect(confirmCalls).toHaveLength(1);
    expect(confirmCalls[0].timeoutMs).toBe(6000);
    expect(typeof confirmCalls[0].gate).toBe("function");
    nextPending.push([{ storeNumber: "R085", partNumber: "X", status: "available" }]);
    const usEgress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async () => ({ status: 200, text: async () => body("R085") }) }; } };
    await runSweep({ egress: usEgress, tasks: buildTasks().slice(0, 1), concurrency: 1, mode: "full", host: "test" });
    expect(confirmCalls).toHaveLength(2);
    expect(confirmCalls[1].timeoutMs).toBeUndefined();
    expect(confirmCalls[1].gate).toBeUndefined();
  });

  it("anchor mode: writes only known stores, reports anchorCovered from location answers and failedLocations", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const plan = INTL_COVERAGE.hk!; // one anchor, six stores
    const tasks = buildIntlTasks(["hk"]);
    expect(tasks.filter((t) => !t.store)).toHaveLength(2);
    const stores = plan[0].covers;
    const known = new Set(stores);
    const asked: string[] = [];
    let n = 0;
    const egress = { name: "t", async acquire() { return { label: "t", release() {}, fetch: async (url: string) => {
      const u = new URL(url); asked.push(u.search);
      expect(u.pathname).toBe("/hk/shop/retail/pickup-message");
      expect(u.searchParams.get("location")).toBe(plan[0].location);
      // The second batch fails; with one of two tasks failed the country is at the "outage" share, so no retry pass.
      // The first answers with the six stores plus a stranger (not known: never written, never counted).
      if (u.searchParams.get("parts.0") === tasks[1].parts[0]) { n++; return { status: 503, text: async () => "" }; }
      return { status: 200, text: async () => JSON.stringify({ head: { status: "200" }, body: { stores: [...stores, "R999"].map((s) => ({ storeNumber: s, storeName: s, city: "", state: "", partsAvailability: {} })) } }) };
    } }; } };
    const r = await runSweep({ egress, tasks, concurrency: 2, mode: "intl", host: "test", known, logOk: false, timeoutMs: 6000 });
    expect(n).toBe(1);
    expect(r.anchorCovered).toEqual([...stores].sort());
    expect(r.storesCovered).toBe(stores.length);
    expect(r.failedLocations).toEqual([plan[0].location]);
    expect(r.byCountry).toEqual({ hk: { tasks: 2, failed: 1, unresolved: 1, throttled: 0 } });
    expect(r.pickup).toBeUndefined();
  });
});
