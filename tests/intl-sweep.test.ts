import { describe, expect, it, vi, beforeEach } from "vitest";

/* The sweep engine in mode "intl", with the database and Apple faked (same fakes as tests/fallback.test.ts). */
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
    const tasks = buildIntlTasks(["uk"]).slice(0, 4); // two stores × two batches
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
    const tasks = buildIntlTasks(["ca"]).slice(0, 6); // three stores × two batches
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

  it("a country whose round mostly failed is not retried (an outage), the others are; one error per message per round", async () => {
    const { runSweep, buildIntlTasks } = await import("@/lib/stock/sweep");
    const tasks = [...buildIntlTasks(["sg"]), ...buildIntlTasks(["hk"])]; // SG 3 stores, HK 6 stores
    const sg = new Set(buildIntlTasks(["sg"]).map((t) => t.store!));
    const hk = buildIntlTasks(["hk"]).map((t) => t.store!);
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
    const tasks = buildIntlTasks(["uk"]).slice(0, 1);
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
});
