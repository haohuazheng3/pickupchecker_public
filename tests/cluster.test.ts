import { describe, expect, it, vi } from "vitest";

vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
const { chooseTarget, isFailoverError } = await import("@/lib/db");
const { PROMOTE_AFTER, duties, dutyLabel, promoteStep } = await import("@/lib/stock/cluster");
type Probe = Parameters<typeof chooseTarget>[0][number];

const probe = (o: Partial<Probe>): Probe => ({ name: "primary", ok: true, ms: 20, recovery: false, host: "linode-1", owner: "linode-1", epoch: 1, ...o });
const now = new Date("2026-11-02T18:00:00Z");
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

describe("chooseTarget — every query goes to the cluster's primary", () => {
  it("the primary while the standby is its replica", () => {
    expect(chooseTarget([probe({}), probe({ name: "standby", recovery: true, host: "linode-2" })])).toEqual({ index: 0, writable: true });
  });
  it("the promoted standby once it has the higher epoch, even with the old primary back", () => {
    const old = probe({});
    const promoted = probe({ name: "standby", host: "linode-2", owner: "linode-2", epoch: 2 });
    expect(chooseTarget([old, promoted])).toEqual({ index: 1, writable: true });
  });
  it("never an old primary that knows it was replaced, even when it is the only one answering", () => {
    const fenced = probe({ owner: "linode-2", epoch: 2 });
    expect(chooseTarget([fenced, probe({ name: "standby", ok: false, recovery: null, host: null, owner: null, epoch: -1 })])).toEqual({ index: 0, writable: false });
  });
  it("the replica, read-only, while the primary is down and nothing has been promoted yet", () => {
    expect(chooseTarget([probe({ ok: false, recovery: null, epoch: -1 }), probe({ name: "standby", recovery: true, host: "linode-2" })])).toEqual({ index: 1, writable: false });
  });
  it("null when nothing answers", () => {
    expect(chooseTarget([probe({ ok: false }), probe({ name: "standby", ok: false })])).toBeNull();
  });
  it("retries on connection-level errors only", () => {
    expect(isFailoverError({ code: "ECONNREFUSED" })).toBe(true);
    expect(isFailoverError({ code: "25006", message: "cannot execute UPDATE in a read-only transaction" })).toBe(true);
    expect(isFailoverError(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(isFailoverError({ code: "23505", message: "duplicate key value violates unique constraint" })).toBe(false);
  });
});

describe("duties — who polls what", () => {
  const base = { me: "linode-1", role: "primary" as const, cluster: { primary: "linode-1", epoch: 1 }, alive: [], now, intlConfigured: true, writable: true };
  it("the primary alone polls everything", () => {
    expect(dutyLabel(duties(base))).toBe("us+intl");
  });
  it("the primary hands the other countries to a standby that reports running them, and takes them back when it stops", () => {
    const standby = { host: "linode-2", role: "standby" as const, duties: "intl", at: ago(10) };
    expect(dutyLabel(duties({ ...base, alive: [standby] }))).toBe("us");
    expect(dutyLabel(duties({ ...base, alive: [{ ...standby, at: ago(120) }] }))).toBe("us+intl");
  });
  it("the standby polls the other countries, never the US", () => {
    expect(dutyLabel(duties({ ...base, me: "linode-2", role: "standby" }))).toBe("intl");
    expect(dutyLabel(duties({ ...base, me: "linode-2", role: "standby", intlConfigured: false }))).toBe("none");
  });
  it("the promoted standby polls everything", () => {
    expect(dutyLabel(duties({ ...base, me: "linode-2", role: "standby", cluster: { primary: "linode-2", epoch: 2 } }))).toBe("us+intl");
  });
  it("an old primary that finds another host named primary is fenced", () => {
    const d = duties({ ...base, cluster: { primary: "linode-2", epoch: 2 } });
    expect(d).toMatchObject({ us: false, intl: false, fenced: true });
  });
  it("nothing without a writable database", () => {
    expect(dutyLabel(duties({ ...base, writable: false }))).toBe("none");
  });
  it("an intl worker polls the other countries only, and never the US even when the primary is gone", () => {
    const intl = { ...base, me: "linode-2", role: "intl" as const };
    expect(dutyLabel(duties(intl))).toBe("intl");
    expect(dutyLabel(duties({ ...intl, cluster: { primary: "linode-4", epoch: 2 } }))).toBe("intl");
    expect(dutyLabel(duties({ ...intl, intlConfigured: false }))).toBe("none");
    expect(dutyLabel(duties({ ...intl, writable: false }))).toBe("none");
  });
  it("2026-11-10 layout: linode-3 US, linode-2 intl, linode-4 a standby without egress — the primary only holds the database", () => {
    const alive = [
      { host: "linode-3", role: "worker" as const, duties: "us", at: ago(5) },
      { host: "linode-2", role: "intl" as const, duties: "intl", at: ago(5) },
      { host: "linode-4", role: "standby" as const, duties: "none", at: ago(5) },
    ];
    expect(dutyLabel(duties({ ...base, alive }))).toBe("none");
    expect(dutyLabel(duties({ ...base, me: "linode-4", role: "standby", intlConfigured: false, alive }))).toBe("none");
    // linode-4 promoted: the workers keep their lanes, it holds the database
    expect(dutyLabel(duties({ ...base, me: "linode-4", role: "standby", intlConfigured: false, alive, cluster: { primary: "linode-4", epoch: 2 } }))).toBe("none");
  });
});

describe("duties — the US worker takes the US without two hosts ever writing one store", () => {
  const primary = { me: "linode-1", role: "primary" as const, cluster: { primary: "linode-1", epoch: 1 }, now, intlConfigured: true, writable: true };
  const standby = { host: "linode-2", role: "standby" as const, duties: "intl", at: ago(5) };
  const worker = { host: "linode-3", role: "worker" as const, duties: "none", at: ago(5) };
  const wk = { me: "linode-3", role: "worker" as const, cluster: { primary: "linode-1", epoch: 1 }, now, intlConfigured: false, writable: true };
  it("the primary hands the US to a worker that reports in, and takes it back when the worker goes quiet", () => {
    expect(dutyLabel(duties({ ...primary, alive: [standby, worker] }))).toBe("none");
    expect(dutyLabel(duties({ ...primary, alive: [standby, { ...worker, at: ago(120) }] }))).toBe("us");
    expect(dutyLabel(duties({ ...primary, alive: [{ ...worker, at: ago(120) }] }))).toBe("us+intl");
  });
  it("the worker waits while another host still reports the US, then starts", () => {
    const p = { host: "linode-1", role: "primary" as const, duties: "us", at: ago(5) };
    expect(duties({ ...wk, alive: [p, standby] })).toMatchObject({ us: false, intl: false });
    expect(duties({ ...wk, alive: [{ ...p, duties: "none" }, standby] })).toMatchObject({ us: true, intl: false });
    // A primary that died mid-round: its stale record no longer holds the worker back.
    expect(duties({ ...wk, alive: [{ ...p, at: ago(120) }] })).toMatchObject({ us: true });
  });
  it("a promoted standby hands the US to the worker too, and the worker keeps it", () => {
    const promoted = { ...primary, me: "linode-2", role: "standby" as const, cluster: { primary: "linode-2", epoch: 2 } };
    expect(dutyLabel(duties({ ...promoted, alive: [worker] }))).toBe("intl");
    expect(duties({ ...wk, cluster: { primary: "linode-2", epoch: 2 }, alive: [{ host: "linode-2", role: "standby" as const, duties: "intl", at: ago(5) }] })).toMatchObject({ us: true });
  });
  it("the worker never polls without a writable database", () => {
    expect(dutyLabel(duties({ ...wk, alive: [], writable: false }))).toBe("none");
  });
  it("workerVerdict: ok while it reports, down when stale, none without one", async () => {
    const { workerVerdict } = await import("@/lib/stock/cluster");
    expect(workerVerdict([standby, worker], now).state).toBe("ok");
    expect(workerVerdict([{ ...worker, at: ago(90) }], now).state).toBe("down");
    expect(workerVerdict([standby], now).state).toBe("none");
  });
});

describe("promoteStep — a takeover needs a minute of agreement from two vantage points", () => {
  it("promotes after PROMOTE_AFTER checks the primary is unreachable from here and from the site", () => {
    let st = { misses: 0 };
    for (let i = 1; i < PROMOTE_AFTER; i++) {
      const s = promoteStep(st, false, false);
      expect(s.promote).toBe(false);
      st = s.next;
    }
    expect(promoteStep(st, false, false).promote).toBe(true);
  });
  it("never on its own view: the site saying the primary is fine, or not answering, resets the count", () => {
    expect(promoteStep({ misses: 5 }, false, true)).toMatchObject({ promote: false, next: { misses: 0 } });
    expect(promoteStep({ misses: 5 }, false, null)).toMatchObject({ promote: false, next: { misses: 0 } });
  });
  it("one good answer from the primary resets the count", () => {
    expect(promoteStep({ misses: 5 }, true, null)).toMatchObject({ promote: false, next: { misses: 0 } });
  });
});

describe("standbyVerdict — the owner hears about a broken standby", async () => {
  const { standbyVerdict } = await import("@/lib/stock/cluster");
  const sb = { host: "linode-2", role: "standby" as const, duties: "intl", at: ago(10), replica: { status: "streaming", lagSec: 0.4 } };
  it("ok while it reports and streams", () => {
    expect(standbyVerdict([sb], now).state).toBe("ok");
  });
  it("none without a standby", () => {
    expect(standbyVerdict([{ ...sb, role: "primary" }], now).state).toBe("none");
  });
  it("down when its record is stale", () => {
    expect(standbyVerdict([{ ...sb, at: ago(90) }], now).state).toBe("down");
  });
  it("lagging when the replica stops streaming or falls behind", () => {
    expect(standbyVerdict([{ ...sb, replica: { status: "waiting", lagSec: 1 } }], now).state).toBe("lagging");
    expect(standbyVerdict([{ ...sb, replica: { status: "streaming", lagSec: 120 } }], now).state).toBe("lagging");
  });
});
