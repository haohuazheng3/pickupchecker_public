import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: () => ({}), schema: {} }));
const { CAPACITY_IDLE, CLEAR_RUNS, LAG_RUNS, REARM_RUNS, REMIND_MS, capacityReasons, capacityStep } = await import("@/lib/stock/capacity");

const base = { fastStores: 39, rounds: [{ host: "linode-1", mode: "full", p50Sec: 12.3, count: 40 }, { host: "linode-1", mode: "intl", p50Sec: 13.4, count: 40 }], cadence: { full: 15, intl: 15 }, watchedLagP90Sec: 4.7, fastCadenceSec: 5 };
const t = (min: number) => new Date(Date.UTC(2026, 10, 2, 16, min));

describe("capacityReasons — what is over the line", () => {
  it("nothing on today's numbers (39 fast-lane stores, rounds 12–13 s, lag under 5 s)", () => {
    expect(capacityReasons(base)).toEqual({ reasons: [], lagHigh: false });
  });
  it("the fast lane reaching 80 stores", () => {
    expect(capacityReasons({ ...base, fastStores: 80 }).reasons.map((r) => r.key)).toEqual(["fast-stores"]);
  });
  it("a round mode whose median is within a second of its cadence, per host", () => {
    const r = capacityReasons({ ...base, rounds: [...base.rounds, { host: "linode-2", mode: "intl", p50Sec: 14.2, count: 30 }] });
    expect(r.reasons.map((x) => x.key)).toEqual(["round:linode-2:intl"]);
    expect(r.reasons[0].text).toContain("other-country round");
  });
  it("ignores a window with too few rounds (just restarted)", () => {
    expect(capacityReasons({ ...base, rounds: [{ host: "linode-1", mode: "full", p50Sec: 25, count: 3 }] }).reasons).toEqual([]);
  });
  it("flags the paid-alert lag only as a candidate", () => {
    expect(capacityReasons({ ...base, watchedLagP90Sec: 9 })).toEqual({ reasons: [], lagHigh: true });
  });
});

describe("capacityStep — one mail per episode", () => {
  const fast = [{ key: "fast-stores", text: "80 stores" }];
  it("mails once when it starts, not again the next minute", () => {
    const a = capacityStep(CAPACITY_IDLE, t(0), fast, false, 4, 5);
    expect(a.mail).toBe("warn");
    const b = capacityStep(a.next, t(1), fast, false, 4, 5);
    expect(b.mail).toBeNull();
  });
  it("mails again when a new reason joins, and reminds after a day", () => {
    const a = capacityStep(CAPACITY_IDLE, t(0), fast, false, 4, 5).next;
    const round = { key: "round:linode-1:full", text: "slow" };
    expect(capacityStep(a, t(5), [...fast, round], false, 4, 5).mail).toBe("warn");
    expect(capacityStep(a, new Date(t(0).getTime() + REMIND_MS + 60_000), fast, false, 4, 5).mail).toBe("remind");
  });
  it("a reason that rests and returns within REARM_RUNS runs is the same reason (2026-11-06: 13 mails from flapping rounds)", () => {
    const round = { key: "round:linode-3:full", text: "slow" };
    let st = capacityStep(CAPACITY_IDLE, t(0), fast, false, 4, 5).next;
    const joined = capacityStep(st, t(1), [...fast, round], false, 4, 5);
    expect(joined.mail).toBe("warn");
    st = joined.next;
    for (let i = 2; i < 2 + REARM_RUNS - 1; i++) {
      const s = capacityStep(st, t(i), fast, false, 4, 5);
      expect(s.mail).toBeNull();
      expect(s.next.reasons).toEqual(["fast-stores", "round:linode-3:full"]);
      st = s.next;
    }
    // back before the hour is up: no mail
    const back = capacityStep(st, t(70), [...fast, round], false, 4, 5);
    expect(back.mail).toBeNull();
    st = back.next;
    expect(st.quiet).toEqual({});
    // rests a full hour, then returns: a new reason again
    for (let i = 0; i < REARM_RUNS; i++) st = capacityStep(st, t(80 + i), fast, false, 4, 5).next;
    expect(st.reasons).toEqual(["fast-stores"]);
    expect(capacityStep(st, t(200), [...fast, round], false, 4, 5).mail).toBe("warn");
  });
  it("needs the lag several runs in a row", () => {
    let st = CAPACITY_IDLE;
    for (let i = 0; i < LAG_RUNS - 1; i++) {
      const s = capacityStep(st, t(i), [], true, 9, 5);
      expect(s.mail).toBeNull();
      st = s.next;
    }
    const last = capacityStep(st, t(LAG_RUNS), [], true, 9, 5);
    expect(last.mail).toBe("warn");
    expect(last.active[0].text).toContain("9.0 s");
    // one good minute resets the streak
    expect(capacityStep({ ...st }, t(9), [], false, 4, 5).next.lagRuns).toBe(0);
  });
  it("clears only after CLEAR_RUNS quiet runs, with one mail", () => {
    let st = capacityStep(CAPACITY_IDLE, t(0), fast, false, 4, 5).next;
    for (let i = 1; i < CLEAR_RUNS; i++) {
      const s = capacityStep(st, t(i), [], false, 4, 5);
      expect(s.mail).toBeNull();
      st = s.next;
    }
    const done = capacityStep(st, t(CLEAR_RUNS), [], false, 4, 5);
    expect(done.mail).toBe("clear");
    expect(done.next.mailed).toBe(false);
    // a relapse during the quiet minutes is the same episode: no new mail
    const relapse = capacityStep({ ...st }, t(20), fast, false, 4, 5);
    expect(relapse.mail).toBeNull();
    expect(relapse.next.clearRuns).toBe(0);
  });
});
