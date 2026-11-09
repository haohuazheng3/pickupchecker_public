import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@vercel/functions", () => ({ attachDatabasePool: () => undefined }));
const { selloutsByState, STATE_MIN } = await import("@/lib/content/selloutStates");
type Row = import("@/lib/stock/sellouts").SelloutRow;

const t0 = Date.UTC(2026, 10, 2, 15, 0, 0);
let id = 0;
/** One restock at a store: `high` seconds listed (null = still listed), `minutesAgo` before t0 + 1 day. */
const row = (store: string, high: number | null, minutes = 0): Row => ({
  id: ++id, at: new Date(t0 + minutes * 60_000), storeNumber: store, partNumber: "P", lowSec: high == null ? null : Math.max(0, high - 15), highSec: high, exact: true, listedSec: high == null ? 30 : null,
});
const STATE: Record<string, string> = { CA1: "California", CA2: "California", NY1: "New York", TX1: "Texas", WA1: "Washington" };
const stateOf = (n: string) => STATE[n];

describe("selloutsByState — the sell-out page's by-state distribution", () => {
  it("ranks states with at least STATE_MIN timed listings by n, with median and shares gone within 30 s / 2 min", () => {
    expect(STATE_MIN).toBe(10);
    const rows: Row[] = [
      // California: 12 timed listings over two stores (20 s × 4, 60 s × 4, 200 s × 4) and one still listed.
      ...[20, 20, 20, 20].map((s, i) => row("CA1", s, i)),
      ...[60, 60, 60, 60, 200, 200, 200, 200].map((s, i) => row("CA2", s, 10 + i)),
      row("CA1", null, 30),
      // New York: exactly 10 (all within 30 s).
      ...Array.from({ length: 10 }, (_, i) => row("NY1", 25, 40 + i)),
      // Texas: 3, thin. Washington: 3, thin (ties by name). Unknown store: ignored.
      ...[100, 100, 100].map((s, i) => row("TX1", s, -60 - i)),
      ...[10, 10, 10].map((s, i) => row("WA1", s, 60 + i)),
      row("ZZ9", 5, 70),
    ];
    const d = selloutsByState(rows, stateOf);
    expect(d.rows.map((r) => r.state)).toEqual(["California", "New York"]);
    expect(d.rows[0]).toEqual({ state: "California", n: 12, medianSec: 60, within30: 4 / 12, within120: 8 / 12 });
    expect(d.rows[1]).toEqual({ state: "New York", n: 10, medianSec: 25, within30: 1, within120: 1 });
    expect(d.thin).toEqual([{ state: "Texas", n: 3 }, { state: "Washington", n: 3 }]);
    // The national row is every timed listing with a known state (still-listed and unknown stores left out).
    expect(d.all.n).toBe(28);
    expect(d.all.within30).toBeCloseTo((4 + 10 + 3) / 28);
    // "Since": the oldest timed listing (Texas, 62 minutes before t0), not the still-listed one.
    expect(d.from).toBe(new Date(t0 - 62 * 60_000).toISOString());
  });

  it("takes a lower threshold when asked, and is empty without timed rows", () => {
    const rows = [row("TX1", 40), row("TX1", 50), row("WA1", null)];
    expect(selloutsByState(rows, stateOf, 2).rows).toEqual([{ state: "Texas", n: 2, medianSec: 45, within30: 0, within120: 1 }]);
    const none = selloutsByState([row("WA1", null)], stateOf);
    expect(none).toEqual({ rows: [], thin: [], all: { n: 0, medianSec: null, within30: 0, within120: 0 }, from: null });
  });

  it("accepts rows whose times came back from the cache as ISO strings", () => {
    const r = { ...row("NY1", 30), at: new Date(t0).toISOString() as unknown as Date };
    expect(selloutsByState([r], stateOf, 1).from).toBe(new Date(t0).toISOString());
  });
});
