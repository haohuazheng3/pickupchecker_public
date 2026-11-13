import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";

vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
const { FailoverPool, isWriteSql, nextWriter } = await import("@/lib/db");
type Probe = Parameters<typeof nextWriter>[0][number];

const probe = (o: Partial<Probe>): Probe => ({ name: "primary", ok: true, ms: 20, recovery: false, host: "linode-1", owner: "linode-1", epoch: 1, ...o });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A fake database: answers the failover probe after `delay` ms and refuses writes while it is a replica. */
function fakeDb(o: { recovery: boolean; host: string; owner: string; epoch?: number; delay?: number }) {
  const state = { delay: 0, epoch: 1, ...o };
  const ran: string[] = [];
  const pool = {
    async query(q: unknown) {
      const text = typeof q === "string" ? q : (q as { text: string }).text;
      if (text.includes("pg_is_in_recovery")) {
        await sleep(state.delay);
        return { rows: [{ recovery: state.recovery, host: state.host, cluster: { primary: state.owner, epoch: state.epoch } }] };
      }
      ran.push(text);
      if (state.recovery && isWriteSql(text.replace(/^select write_fn\(\)/, "insert"))) {
        throw Object.assign(new Error("cannot execute INSERT in a read-only transaction"), { code: "25006" });
      }
      return { rows: [] };
    },
    async connect() {
      ran.push("connect");
      return {};
    },
  };
  return { state, ran, pool: pool as unknown as Pool };
}

function cluster() {
  const primary = fakeDb({ recovery: false, host: "linode-1", owner: "linode-1" });
  const standby = fakeDb({ recovery: true, host: "linode-4", owner: "linode-1" });
  const router = new FailoverPool([{ name: "primary", pool: primary.pool }, { name: "standby", pool: standby.pool }], { probeMs: 20, writerProbeMs: 300 });
  return { primary, standby, router };
}

const INSERT = { text: 'insert into "users" ("id") values ($1) on conflict do nothing' };

describe("a slow primary: reads may move to the replica, writes never do", () => {
  it("keeps writes on the primary after it misses the probe (the 11-12 waves)", async () => {
    const { primary, standby, router } = cluster();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await router.query("select 1");
    expect(primary.ran).toEqual(["select 1"]);

    primary.state.delay = 60; // slower than the 20 ms probe: the read choice moves to the replica
    await router.recheck();
    await router.query({ text: "select * from stores" });
    await router.query(INSERT);
    expect(standby.ran).toEqual(["select * from stores"]);
    expect(primary.ran).toEqual(["select 1", INSERT.text]);
    expect(await router.status()).toMatchObject({ using: "standby", writable: false });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("writes stay on the primary"));
  });

  it("a fresh instance that starts during a slow spell waits for the primary instead of failing the write", async () => {
    const { primary, standby, router } = cluster();
    primary.state.delay = 60; // misses the 20 ms probe, answers the 300 ms writer probe
    await router.query(INSERT);
    await router.query("select 2");
    expect(primary.ran).toEqual([INSERT.text]);
    expect(standby.ran).toEqual(["select 2"]);
  });

  it("transactions (connect) go where writes go", async () => {
    const { primary, standby, router } = cluster();
    primary.state.delay = 60;
    await router.connect();
    expect(primary.ran).toEqual(["connect"]);
    expect(standby.ran).toEqual([]);
  });

  it("a write that looked like a read is retried on the primary after the replica refuses it", async () => {
    const { primary, standby, router } = cluster();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await router.query("select 1");
    primary.state.delay = 60;
    await router.recheck();
    await router.query("select write_fn()");
    expect(standby.ran).toEqual(["select write_fn()"]);
    expect(primary.ran).toEqual(["select 1", "select write_fn()"]);
  });

  it("follows a promoted standby for writes too", async () => {
    const { primary, standby, router } = cluster();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await router.query(INSERT);
    primary.state.delay = 60;
    Object.assign(standby.state, { recovery: false, owner: "linode-4", epoch: 2 });
    await router.recheck();
    await router.query(INSERT);
    expect(standby.ran).toEqual([INSERT.text]);
  });
});

describe("nextWriter", () => {
  const replica = probe({ name: "standby", recovery: true, host: "linode-4" });
  it("is the read choice whenever that is writable", () => {
    expect(nextWriter([probe({}), replica], { index: 0, writable: true }, null)).toBe(0);
    expect(nextWriter([probe({}), replica], { index: 1, writable: true }, 0)).toBe(1);
  });
  it("keeps the last primary while it is only slow or unreachable", () => {
    const slow = probe({ ok: false, recovery: null, host: null, owner: null, epoch: -1, error: "no answer in 2000 ms" });
    expect(nextWriter([slow, replica], { index: 1, writable: false }, 0)).toBe(0);
  });
  it("drops it once it answers as a replica or fenced, and knows none on a cold start", () => {
    expect(nextWriter([probe({ recovery: true }), replica], { index: 1, writable: false }, 0)).toBeNull();
    expect(nextWriter([probe({ owner: "linode-4" }), replica], { index: 0, writable: false }, 0)).toBeNull();
    expect(nextWriter([probe({ ok: false }), replica], { index: 1, writable: false }, null)).toBeNull();
  });
});

describe("isWriteSql", () => {
  it("treats only plain reads as reads", () => {
    for (const q of ["select 1", "  SELECT * from stores", "(select 1) union (select 2)", "-- c\nselect 1", "/* x */ select 1", "values (1)", "explain select 1",
      "with a as (select 1) select * from a", "select status from watches where note = 'insert into'"]) expect(isWriteSql(q), q).toBe(false);
  });
  it("sends everything else to the primary", () => {
    for (const q of ['insert into "users" values (1)', "update watches set active = false", "delete from x", "set statement_timeout = 0", "create table t (a int)",
      "with d as (delete from x returning *) select * from d", "with u as (update watches w set active = true returning 1) select 1", "select * from x for update",
      "select nextval('s')", "select pg_advisory_lock(1)", ""]) expect(isWriteSql(q), q).toBe(true);
  });
});
