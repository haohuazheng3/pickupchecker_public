import { describe, expect, it, vi, beforeEach } from "vitest";
import { BAD_RUNS, PARTIAL_CLEAR_RUNS, PARTIAL_RUNS, RECOVER_RUNS, REMIND_MS, US_IDLE, laneDiagnosis, orderTasks, pairKey, pollerVerdict, usWatchStep, type Freshness, type LaneFailures, type PollerState, type UsWatchState } from "@/lib/stock/fallback";
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

/* ---------------- the US watchdog's mails: one per episode ---------------- */

describe("usWatchStep — one mail when it starts, one when it is over", () => {
  const t0 = Date.UTC(2026, 10, 6, 1, 0);
  const t = (min: number) => new Date(t0 + min * 60_000);
  /** Feeds a sequence of verdicts, one a minute; returns the mails and the final state. */
  const play = (start: UsWatchState, states: PollerState[], from = 0) => {
    const mails: (string | null)[] = [];
    let st = start;
    states.forEach((s, i) => { const r = usWatchStep(st, s, t(from + i)); mails.push(r.mail); st = r.next; });
    return { mails, st };
  };

  it("a one-minute blind blip mails nothing at all, and closes quietly", () => {
    const { mails, st } = play(US_IDLE, ["blind", ...Array<PollerState>(RECOVER_RUNS).fill("ok")]);
    expect(mails.every((m) => m === null)).toBe(true);
    expect(st.down).toBe(false);
    // …but the episode was open while it lasted (the admin board shows it)
    expect(usWatchStep(US_IDLE, "blind", t(0)).next).toMatchObject({ down: true, kind: "blind", badRuns: 1, since: t(0).toISOString() });
  });

  it("the 2026-11-06 evening: the share crossing 50 % eleven times in two hours is one blind mail and one recovery mail", () => {
    const states: PollerState[] = [];
    for (let i = 0; i < 11; i++) states.push("blind", "blind", "ok", "ok", "partial", "blind", "ok", "ok", "ok", "ok");
    states.push(...Array<PollerState>(RECOVER_RUNS).fill("ok"));
    const { mails, st } = play(US_IDLE, states);
    expect(mails.filter(Boolean)).toEqual(["blind", "recovered"]);
    expect(mails.indexOf("blind")).toBe(BAD_RUNS - 1);
    expect(st).toEqual({ down: false, partialRuns: 0, partialMailed: false, partialOkRuns: 0 });
    // the recovery mail knows how often it wobbled: every "ok → blind" return inside the episode
    const before = play(US_IDLE, states.slice(0, -RECOVER_RUNS)).st;
    expect(before.relapses).toBe(21);
    expect(before.since).toBe(t(0).toISOString());
  });

  it("silent mails after BAD_RUNS minutes too (the fill-in has run since the first), then a reminder every 3 h", () => {
    const first = play(US_IDLE, Array<PollerState>(BAD_RUNS).fill("silent"));
    expect(first.mails).toEqual([...Array(BAD_RUNS - 1).fill(null), "silent"]);
    const quiet = usWatchStep(first.st, "silent", t(BAD_RUNS));
    expect(quiet.mail).toBeNull();
    const later = usWatchStep(quiet.next, "silent", new Date(t(BAD_RUNS - 1).getTime() + REMIND_MS + 60_000));
    expect(later.mail).toBe("remind");
  });

  it("blind escalating to silent after its mail says so once; silent easing to blind says nothing", () => {
    const blind = play(US_IDLE, Array<PollerState>(BAD_RUNS).fill("blind")).st;
    const esc = usWatchStep(blind, "silent", t(BAD_RUNS));
    expect(esc.mail).toBe("silent");
    expect(usWatchStep(esc.next, "silent", t(BAD_RUNS + 1)).mail).toBeNull();
    expect(usWatchStep(esc.next, "blind", t(BAD_RUNS + 1)).mail).toBeNull();
  });

  it("partial: a mail after PARTIAL_RUNS minutes, none while it flaps, one once it has been clear for PARTIAL_CLEAR_RUNS", () => {
    const states: PollerState[] = [...Array<PollerState>(PARTIAL_RUNS).fill("partial"), "ok", "partial", "ok", "partial", "partial", ...Array<PollerState>(PARTIAL_CLEAR_RUNS).fill("ok")];
    const { mails, st } = play(US_IDLE, states);
    expect(mails.filter(Boolean)).toEqual(["partial", "partial-cleared"]);
    expect(mails.indexOf("partial")).toBe(PARTIAL_RUNS - 1);
    expect(st.partialMailed).toBe(false);
    // two partial minutes and then fine: no mail
    expect(play(US_IDLE, ["partial", "partial", "ok"]).mails.every((m) => m === null)).toBe(true);
  });

  it("while a blind episode is open the partial picture is not judged (its stale stores are the episode's symptom)", () => {
    const open = play(US_IDLE, ["blind", "blind"]).st;
    const { mails, st } = play(open, Array<PollerState>(RECOVER_RUNS - 1).fill("partial"), 2);
    expect(mails.every((m) => m === null)).toBe(true);
    expect(st.down).toBe(true);
    expect(st.partialRuns ?? 0).toBe(0);
  });
});

describe("laneDiagnosis — whose fault a blind minute is", () => {
  const base: LaneFailures = { minutes: 5, sweep: { requests: 1000, failed: 0, timedOut: 0, throttled: 0 }, fast: { requests: 10_000, failed: 0 }, intlFailed: 1 };
  it("timeouts on every lane and abroad: Apple is slow for everyone", () => {
    const d = laneDiagnosis({ ...base, sweep: { requests: 1000, failed: 550, timedOut: 540, throttled: 0 }, fast: { requests: 10_000, failed: 1200 }, intlFailed: 140 });
    expect(d).toContain("55% of 1000 requests failed (54% timed out, 0 × 541)");
    expect(d).toContain("slow for everyone");
  });
  it("only the big answers time out: Apple is slow on those", () => {
    expect(laneDiagnosis({ ...base, sweep: { requests: 1000, failed: 400, timedOut: 390, throttled: 0 } })).toContain("Only the big nearby-stores answers");
  });
  it("541s: throttled", () => {
    expect(laneDiagnosis({ ...base, sweep: { requests: 1000, failed: 600, timedOut: 10, throttled: 590 } })).toContain("throttling");
  });
  it("anything else: this host", () => {
    expect(laneDiagnosis({ ...base, sweep: { requests: 1000, failed: 600, timedOut: 10, throttled: 0 } })).toContain("this host only");
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
