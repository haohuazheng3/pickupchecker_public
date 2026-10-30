import { describe, expect, it } from "vitest";
import { poolConfig } from "@/lib/db";

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
    expect(c.max).toBe(3);
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
