import { describe, it, expect } from "vitest";
import { decide, withStoreLocks, CONFIRM, type StatusRow, type Decision } from "@/lib/stock/ingest";

const t0 = new Date("2026-10-30T00:00:00Z");
const at = (sec: number) => new Date(t0.getTime() + sec * 1000);
const row = (p: Partial<StatusRow> = {}): StatusRow => ({ status: "available", quote: "Available Today", pendingStatus: null, pendingSince: null, pendingSeen: 0, ...p });
const rowAfter = (d: Decision): StatusRow => ({ status: d.status, quote: d.quote, pendingStatus: d.pendingStatus, pendingSince: d.pendingSince, pendingSeen: d.pendingSeen });
const avail = { available: true, quote: "Available Today" };
const gone = { available: false, quote: "Currently unavailable" };

describe("decide — one response never flips a status on its own", () => {
  it("takes a first sighting at once and flags restocks as firstSeen", () => {
    const d = decide(undefined, avail, t0);
    expect(d.status).toBe("available");
    expect(d.commit).toEqual({ kind: "restock", firstSeen: true, since: t0 });
    expect(d.held).toBe(false);
    const u = decide(undefined, gone, t0);
    expect(u.status).toBe("unavailable");
    expect(u.commit).toBeNull();
    const fromUnknown = decide(row({ status: "unknown", quote: null }), avail, t0);
    expect(fromUnknown.commit?.firstSeen).toBe(true);
  });

  it("an agreeing observation refreshes the quote and cancels any pending change", () => {
    const d = decide(row({ pendingStatus: "unavailable", pendingSince: at(-30), pendingSeen: 3 }), { available: true, quote: "Available Tomorrow" }, t0);
    expect(d).toMatchObject({ status: "available", quote: "Available Tomorrow", pendingStatus: null, pendingSince: null, pendingSeen: 0, commit: null, held: false });
  });

  it("holds a lone 'unavailable' and only sells out after two observations over two minutes", () => {
    const first = decide(row(), gone, t0);
    expect(first).toMatchObject({ status: "available", quote: "Available Today", pendingStatus: "unavailable", pendingSince: t0, pendingSeen: 1, commit: null, held: true });
    const second = decide(rowAfter(first), gone, at(20));
    expect(second).toMatchObject({ status: "available", pendingSeen: 2, pendingSince: t0, held: true, commit: null });
    const early = decide(rowAfter(second), gone, at(100));
    expect(early.status).toBe("available");
    const late = decide(rowAfter(early), gone, at(CONFIRM.soldout.minMs / 1000));
    expect(late.status).toBe("unavailable");
    expect(late.quote).toBe("Currently unavailable");
    expect(late.commit).toEqual({ kind: "soldout", firstSeen: false, since: t0 });
    expect(late.pendingStatus).toBeNull();
  });

  it("the 21:46 blip — unavailable, then available 8 s later — leaves no trace", () => {
    const blip = decide(row(), gone, t0);
    const back = decide(rowAfter(blip), avail, at(8));
    expect(back).toMatchObject({ status: "available", pendingStatus: null, pendingSeen: 0, commit: null, held: false });
  });

  it("confirms a restock with the second agreeing response, seconds later", () => {
    const soldOut = row({ status: "unavailable", quote: "Currently unavailable" });
    const first = decide(soldOut, avail, t0);
    expect(first).toMatchObject({ status: "unavailable", quote: "Currently unavailable", pendingStatus: "available", pendingSeen: 1, held: true, commit: null });
    const second = decide(rowAfter(first), avail, at(3));
    expect(second.status).toBe("available");
    expect(second.quote).toBe("Available Today");
    expect(second.commit).toEqual({ kind: "restock", firstSeen: false, since: t0 });
  });

  it("drops a lone 'available' when the next response disagrees", () => {
    const soldOut = row({ status: "unavailable", quote: "Currently unavailable" });
    const first = decide(soldOut, avail, t0);
    const contradicted = decide(rowAfter(first), gone, at(5));
    expect(contradicted).toMatchObject({ status: "unavailable", pendingStatus: null, pendingSeen: 0, commit: null, held: false });
  });

  it("a change in the other direction restarts the count", () => {
    const first = decide(row({ status: "unavailable", quote: "Currently unavailable", pendingStatus: "available", pendingSince: at(-10), pendingSeen: 1 }), gone, t0);
    expect(first).toMatchObject({ status: "unavailable", pendingStatus: null, held: false });
  });
});

describe("withStoreLocks", () => {
  it("serialises work that shares a store and lets disjoint work overlap", async () => {
    const log: string[] = [];
    const job = (name: string, keys: string[], ms: number) =>
      withStoreLocks(keys, async () => {
        log.push(`${name}:start`);
        await new Promise((r) => setTimeout(r, ms));
        log.push(`${name}:end`);
        return name;
      });
    const results = await Promise.all([job("a", ["R2", "R1"], 40), job("b", ["R3", "R2"], 10), job("c", ["R9"], 5)]);
    expect(results).toEqual(["a", "b", "c"]);
    const idx = (s: string) => log.indexOf(s);
    // a and b share R2: whichever got it first ran to the end before the other started
    expect(idx("a:end") < idx("b:start") || idx("b:end") < idx("a:start")).toBe(true);
    // c shares nothing: it ran alongside and finished before either of them
    expect(idx("c:end")).toBeLessThan(idx("a:end"));
    expect(idx("c:end")).toBeLessThan(idx("b:end"));
  });

  it("releases its locks when the work throws", async () => {
    await expect(withStoreLocks(["R1"], async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    const again = await withStoreLocks(["R1"], async () => "free");
    expect(again).toBe("free");
  });
});
