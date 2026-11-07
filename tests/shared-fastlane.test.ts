import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { partNumbersForStore } from "@/lib/apple/catalog";
import { createSharedFastlaneFeed, mergeFastTargets, sharedFastlanePoolConfig, sharedFastlaneTarget, targetsForDuties, type SharedFastTarget } from "@/lib/stock/fastlane";

const us = "R085", ca = "R207";
const usPart = partNumbersForStore(us, "duo", ["256GB"], ["Night Sky"])[0];
const caPart = partNumbersForStore(ca, "duo", ["256GB"], ["Night Sky"])[0];
const native = () => new Map([[us, [usPart]]]);
const shared = [{ store_number: ca, part_number: caPart }, { store_number: us, part_number: usPart }];
const feeds: ReturnType<typeof createSharedFastlaneFeed>[] = [];
function feed(read: () => Promise<SharedFastTarget[]>, report = vi.fn()) {
  const result = createSharedFastlaneFeed(read, report); feeds.push(result); return result;
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-07T00:00:00Z")); });
afterEach(() => { for (const f of feeds.splice(0)) f.dispose(); vi.useRealTimers(); });

describe("shared fast lane — optional demand cannot stall or erase native demand", () => {
  it("returns native targets while the source is pending, then unions into the next round without duplicate requests", async () => {
    let resolve!: (rows: SharedFastTarget[]) => void;
    const read = vi.fn(() => new Promise<SharedFastTarget[]>((r) => { resolve = r; }));
    const f = feed(read), input = native(), result = f.merge(input);
    expect([...result]).toEqual([...input]);
    expect(read).toHaveBeenCalledTimes(1);
    const inFlightRound = targetsForDuties(result, { us: true, intl: true });
    resolve([...shared, shared[0]]); await vi.advanceTimersByTimeAsync(0);
    expect([...inFlightRound]).toEqual([...input]);
    expect(result.get(us)).toEqual([usPart]); expect(result.get(ca)).toEqual([caPart]);
    expect([...targetsForDuties(result, { us: true, intl: false }).keys()]).toEqual([us]);
    expect([...targetsForDuties(result, { us: false, intl: true }).keys()]).toEqual([ca]);
    expect([...input]).toEqual([...native()]);
  });

  it("keeps the latest native reload when a slow shared read completes, with at most one read in flight", async () => {
    let resolve!: (rows: SharedFastTarget[]) => void;
    const read = vi.fn(() => new Promise<SharedFastTarget[]>((r) => { resolve = r; }));
    const f = feed(read); const result = f.merge(native());
    await vi.advanceTimersByTimeAsync(60_000);
    const updated = new Map([["R083", [usPart]]]);
    expect(f.merge(updated)).toBe(result); expect(read).toHaveBeenCalledTimes(1);
    resolve([shared[0]]); await vi.advanceTimersByTimeAsync(0);
    expect(result.has(us)).toBe(false); expect(result.get("R083")).toEqual([usPart]); expect(result.get(ca)).toEqual([caPart]);
  });

  it("a failing source does not reject the local reload and retained demand expires without another reload", async () => {
    const report = vi.fn();
    const read = vi.fn<() => Promise<SharedFastTarget[]>>().mockResolvedValueOnce(shared).mockRejectedValue(new Error("private upstream detail"));
    const f = feed(read, report), result = f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000); expect(f.merge(native())).toBe(result); await vi.advanceTimersByTimeAsync(0);
    expect(result.has(ca)).toBe(true); expect(report).toHaveBeenCalledWith("unavailable", 2, 2);
    await vi.advanceTimersByTimeAsync(59_999); expect(result.has(ca)).toBe(true);
    await vi.advanceTimersByTimeAsync(1); expect([...result]).toEqual([...native()]);
    expect(report.mock.calls.flat().join(" ")).not.toContain("private upstream detail");
  });

  it("a successful empty result immediately removes canceled shared demand while preserving native pairs", async () => {
    const read = vi.fn<() => Promise<SharedFastTarget[]>>().mockResolvedValueOnce(shared).mockResolvedValue([]);
    const f = feed(read), result = f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000); f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    expect([...result]).toEqual([...native()]);
  });

  it.each([
    { rows: [{ store_number: "R999", part_number: usPart }] },
    { rows: [{ store_number: ca, part_number: usPart }] },
    { rows: [{ store_number: us, part_number: "unrecognized" }] },
  ])("rejects an invalid source snapshot rather than polling untrusted store/parts", async ({ rows }) => {
    const report = vi.fn(), f = feed(async () => rows, report), result = f.merge(native());
    await vi.advanceTimersByTimeAsync(0);
    expect([...result]).toEqual([...native()]); expect(report).toHaveBeenCalledWith("unavailable", 0, 0);
  });

  it("recovers independently after an error, without waiting on or changing the native coverage algorithm", async () => {
    const report = vi.fn();
    const read = vi.fn<() => Promise<SharedFastTarget[]>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(shared);
    const f = feed(read, report), result = f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    expect([...result]).toEqual([...native()]);
    await vi.advanceTimersByTimeAsync(60_000); f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    expect(result.get(ca)).toEqual([caPart]); expect(report).toHaveBeenCalledWith("recovered", 2, 2);
  });

  it("diagnostic failures never escape into the native lane", async () => {
    const f = feed(async () => shared, vi.fn(() => { throw new Error("logger unavailable"); }));
    const result = f.merge(native()); await vi.advanceTimersByTimeAsync(0);
    expect(result.get(ca)).toEqual([caPart]);
    expect(mergeFastTargets(native(), result).get(us)).toEqual([usPart]);
  });
});

describe("shared reader scope and TLS", () => {
  const url = "postgresql://shelfspring_fastlane_reader:fixture@172.232.3.151:5432/pickupchecker";
  const env = { FASTLANE_SHARED_DATABASE_URL: url, FASTLANE_SHARED_DATABASE_CA: "fixture-ca" };
  it("pg retains explicit certificate verification, one connection and read-only transaction defaults", () => {
    const config = sharedFastlanePoolConfig(env);
    const parsed = (new Client(config) as unknown as { connectionParameters: { ssl: unknown; options: string } }).connectionParameters;
    expect(parsed.ssl).toEqual({ ca: "fixture-ca", rejectUnauthorized: true });
    expect(parsed.options).toContain("default_transaction_read_only=on");
    expect(config.max).toBe(1);
  });
  it.each(["?sslmode=disable", "?host=other.example", "?options=-c%20default_transaction_read_only=off", "#fragment"])("rejects URL overrides %s before creating a connection", (suffix) => {
    expect(() => sharedFastlanePoolConfig({ ...env, FASTLANE_SHARED_DATABASE_URL: url + suffix })).toThrow();
  });
  it.each([
    url.replace("shelfspring_fastlane_reader", "poller"),
    url.replace("172.232.3.151", "172.238.169.250"),
    url.replace("/pickupchecker", "/other_database"),
    url.replace(":5432", ":6432"),
  ])("rejects a non-dedicated role or unapproved host/database", (value) => {
    expect(() => sharedFastlanePoolConfig({ ...env, FASTLANE_SHARED_DATABASE_URL: value })).toThrow();
  });
  it("requires CA remotely; the local dedicated reader does not require a remote certificate", () => {
    expect(() => sharedFastlanePoolConfig({ FASTLANE_SHARED_DATABASE_URL: url })).toThrow();
    expect(sharedFastlanePoolConfig({ FASTLANE_SHARED_DATABASE_URL: url.replace("172.232.3.151", "127.0.0.1") }).ssl).toBe(false);
  });
});

describe("shared reader follows the original fenced cluster choice", () => {
  const probe = (name: "primary" | "standby", host: string, owner: string, epoch: number, recovery = false) => ({ name, host, owner, epoch, recovery, ok: true, ms: 1 });
  it("moves to the promoted standby and never independently reselects the returned old primary", () => {
    const probes = [probe("primary", "linode-1", "linode-2", 2), probe("standby", "linode-2", "linode-2", 2)];
    expect(sharedFastlaneTarget({ probes, using: "standby", writable: true })).toBe("standby");
    expect(() => sharedFastlaneTarget({ probes, using: "primary", writable: true })).toThrow();
  });
  it("does not use a read-only replica or missing authority even if it answers", () => {
    expect(() => sharedFastlaneTarget(null)).toThrow();
    expect(() => sharedFastlaneTarget({ probes: [probe("standby", "linode-2", "linode-1", 1, true)], using: "standby", writable: false })).toThrow();
    expect(() => sharedFastlaneTarget({ probes: [probe("primary", "linode-1", "", 0)], using: "primary", writable: true })).toThrow();
  });
});
