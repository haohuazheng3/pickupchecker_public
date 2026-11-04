import { describe, expect, it } from "vitest";
import { isBusyError, poolConfig, waitOutBusy } from "@/lib/db";

describe("database pool config", () => {
  it("talks plain to a database on loopback (the poller)", () => {
    for (const url of ["postgres://u:p@127.0.0.1:5432/db", "postgres://u:p@localhost/db", "postgres://u:p@[::1]:5432/db"]) {
      const c = poolConfig(url, {});
      expect(c.ssl).toBe(false);
      expect(c.max).toBe(8);
      expect(c.statement_timeout).toBe(30_000);
    }
  });

  it("verifies anything else against the pinned CA, with escaped newlines unfolded", () => {
    const c = poolConfig("postgres://u:p@203.0.113.7:5432/db", { DATABASE_CA: "-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----" });
    expect(c.ssl).toEqual({ ca: "-----BEGIN CERTIFICATE-----\nabc\n-----END CERTIFICATE-----", rejectUnauthorized: true });
    expect(c.max).toBe(2);
    expect(c.statement_timeout).toBe(15_000);
  });

  it("fails closed without a CA: still verified, never plain", () => {
    const c = poolConfig("postgres://u:p@203.0.113.7:5432/db", {});
    expect(c.ssl).toEqual({ ca: undefined, rejectUnauthorized: true });
  });

  it("takes a pool size from the environment", () => {
    expect(poolConfig("postgres://u:p@203.0.113.7/db", { DATABASE_POOL_MAX: "5" }).max).toBe(5);
  });
});

describe("out of connection slots (53300) is waited out", () => {
  const busy = Object.assign(new Error('remaining connection slots are reserved for roles with privileges of the "pg_use_reserved_connections" role'), { code: "53300" });

  it("recognises the refusal, and only it", () => {
    expect(isBusyError(busy)).toBe(true);
    expect(isBusyError(new Error("sorry, too many clients already"))).toBe(true);
    expect(isBusyError({ code: "23505", message: "duplicate key" })).toBe(false);
  });

  it("retries after each backoff step, then succeeds", async () => {
    const waits: number[] = [];
    let n = 0;
    const out = await waitOutBusy(async () => { if (n++ < 2) throw busy; return "rows"; }, [1, 2, 3], async (ms) => { waits.push(ms); });
    expect(out).toBe("rows");
    expect(waits).toEqual([1, 2]);
  });

  it("gives up after the last step, and never retries another error", async () => {
    await expect(waitOutBusy(async () => { throw busy; }, [1, 2], async () => {})).rejects.toBe(busy);
    let n = 0;
    await expect(waitOutBusy(async () => { n++; throw new Error("syntax error"); }, [1, 2], async () => {})).rejects.toThrow("syntax error");
    expect(n).toBe(1);
  });
});
