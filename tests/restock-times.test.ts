import { describe, expect, it } from "vitest";
import { partNumbersFor, storesOf, storeTimeZone } from "@/lib/apple/catalog";
import { busiestWindow, dayRange, hourShare, rangeLabel, restockTimesFrom, selloutFrom, trackingSince, type SlotRow } from "@/lib/content/restockTimes";
import { localHourDay } from "@/lib/content/siteFacts";

/** An instant that reads as `hour`:00 local on `date` in the store's zone (searched, so DST never bites). */
function localInstant(tz: string, date: string, hour: number): string {
  let t = Date.parse(`${date}T${String(hour).padStart(2, "0")}:00:00Z`) - 14 * 3600_000;
  for (let i = 0; i < 29; i++, t += 3600_000) {
    const l = localHourDay(new Date(t).toISOString(), tz);
    if (l.date === date && l.hour === hour) return new Date(t).toISOString();
  }
  throw new Error(`no instant for ${date} ${hour} in ${tz}`);
}

describe("iPhone Duo restock times", () => {
  const us = storesOf("us");
  const parts = partNumbersFor("duo", [], [], "us");
  // Two stores in different zones and states; every count below is in each store's own local time.
  const ny = us.find((s) => s.state === "New York")!;
  const ca = us.find((s) => s.state === "California")!;
  const since = trackingSince("us");
  const d1 = dayRange(since, since)[0];
  const d2 = dayRange(since, "2026-12-31")[1];
  const now = new Date(`${d2}T20:00:00Z`);
  const row = (store: typeof ny, date: string, hour: number, n = 1, part = parts[0]): SlotRow => {
    const at = localInstant(storeTimeZone(store), date, hour);
    return { storeNumber: store.storeNumber, partNumber: part, slot: at, n, last: at };
  };

  it("lists every calendar day in a range", () => {
    expect(dayRange("2026-10-29", "2026-11-02")).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(dayRange("2026-11-02", "2026-11-01")).toEqual([]);
  });

  it("buckets restocks into each store's local hour, day, region and configuration", () => {
    const rows = [row(ny, d1, 9, 3), row(ny, d1, 10, 1, parts[1]), row(ca, d1, 9, 2), row(ca, d2, 14, 1)];
    const t = restockTimesFrom("us", rows, [], [], now);
    expect(t.n).toBe(7);
    expect(t.stores).toBe(2);
    expect(t.byHour[9]).toBe(5);
    expect(t.byHour[10]).toBe(1);
    expect(t.byHour[14]).toBe(1);
    expect(t.days).toBe(2);
    expect(t.spanDays).toBe(2);
    // Zero-filled from the first tracked day to today, in order.
    expect(t.daily.map((d) => d.date)).toEqual(dayRange(since, localHourDay(now.toISOString(), "America/New_York").date));
    expect(t.daily[0]).toMatchObject({ date: d1, restocks: 6, stores: 2, peakHour: 9, ours: true });
    expect(t.daily[1]).toMatchObject({ date: d2, restocks: 1, stores: 1, peakHour: 14 });
    expect(t.today?.date).toBe(localHourDay(now.toISOString(), "America/New_York").date);
    const nyRegion = t.byRegion.find((r) => r.name === "New York")!;
    expect(nyRegion).toMatchObject({ restocks: 4, stores: 1, lastStore: ny.storeNumber });
    expect(t.byRegion[0].name).toBe("New York");
    expect(t.byRegion.find((r) => r.name === "Texas")?.restocks).toBe(0);
    expect(t.byPart[0]).toMatchObject({ partNumber: parts[0], restocks: 6 });
    expect(t.byPart.find((p) => p.partNumber === parts[1])?.restocks).toBe(1);
    expect(t.byPart.length).toBe(parts.length);
    expect(t.topStores[0]).toMatchObject({ storeNumber: ny.storeNumber, restocks: 4, days: 1 });
    expect(t.latest?.storeNumber).toBe(ca.storeNumber);
  });

  it("states an hour only from 5 restocks on 3 days, a weekday only over 14 days", () => {
    const two = restockTimesFrom("us", [row(ny, d1, 9, 5), row(ny, d2, 9, 5)], [], [], now);
    expect(two.peakHour).toBeNull();
    const days = dayRange(since, "2026-12-31");
    const three = restockTimesFrom("us", [row(ny, days[0], 9, 2), row(ny, days[1], 9, 2), row(ny, days[2], 11, 1)], [], [], new Date(`${days[2]}T23:00:00Z`));
    expect(three.peakHour).toBe(9);
    expect(three.peakWeekday).toBeNull();
    const fortnight = restockTimesFrom("us", [row(ny, days[0], 9, 2), row(ny, days[7], 9, 2), row(ny, days[13], 11, 1)], [], [], new Date(`${days[13]}T23:00:00Z`));
    expect(fortnight.peakWeekday).not.toBeNull();
  });

  it("ranks the half hours in which the most stores restocked at once", () => {
    const at = localInstant("America/New_York", d1, 9);
    const others = us.filter((s) => s.storeNumber !== ny.storeNumber && s.storeNumber !== ca.storeNumber).slice(0, 2);
    const rows: SlotRow[] = [ny, ca, ...others].map((s) => ({ storeNumber: s.storeNumber, partNumber: parts[0], slot: at, n: 2, last: at }));
    rows.push(row(ny, d2, 15));
    const t = restockTimesFrom("us", rows, [], [], now);
    expect(t.drops[0]).toMatchObject({ at, stores: 4, restocks: 8 });
    expect(t.drops[1].stores).toBe(1);
  });

  it("keeps other trackers' reports to the days before our tracking, as their own series", () => {
    const before = dayRange("2026-10-20", since).filter((d) => d < since);
    const reports = [
      { storeNumber: ny.storeNumber, slot: localInstant(storeTimeZone(ny), "2026-10-27", 9), n: 3 },
      { storeNumber: ca.storeNumber, slot: localInstant(storeTimeZone(ca), "2026-10-27", 10), n: 1 },
      { storeNumber: ny.storeNumber, slot: localInstant(storeTimeZone(ny), "2026-10-22", 9), n: 1 }, // before launch: dropped
      { storeNumber: ny.storeNumber, slot: localInstant(storeTimeZone(ny), since, 9), n: 9 }, // our own period: dropped
    ];
    const t = restockTimesFrom("us", [row(ny, d1, 9)], [], reports, now);
    expect(before.length).toBeGreaterThan(0);
    expect(t.reports).toEqual([{ date: "2026-10-27", weekday: 2, restocks: 4, stores: 2, peakHour: 9, ours: false }]);
    expect(t.n).toBe(1);
  });

  it("summarises sell-outs from 10 lifetimes up", () => {
    expect(selloutFrom([30, 40, 50])).toBeNull();
    const s = selloutFrom([20, 30, 45, 60, 75, 90, 110, 130, 600, 3000])!;
    expect(s.n).toBe(10);
    expect(s.medianSec).toBe(83);
    expect(s.fastestSec).toBe(20);
    expect(s.within2min).toBeCloseTo(0.7);
    expect(s.within20min).toBeCloseTo(0.9);
  });

  it("labels hour windows the way a reader says them", () => {
    expect(rangeLabel(9, 11)).toBe("9–11 AM");
    expect(rangeLabel(11, 13)).toBe("11 AM–1 PM");
    expect(rangeLabel(12, 14)).toBe("noon–2 PM");
    expect(rangeLabel(23, 24)).toBe("11 PM–midnight");
    expect(rangeLabel(0, 1)).toBe("midnight–1 AM");
  });

  it("finds the share of a window and the busiest two hours", () => {
    const byHour = Array(24).fill(0);
    byHour[9] = 40; byHour[10] = 30; byHour[11] = 10; byHour[14] = 20;
    expect(hourShare(byHour, 9, 11)).toBeCloseTo(0.7);
    expect(busiestWindow(byHour)).toEqual({ from: 9, to: 11, share: 0.7 });
    expect(hourShare(Array(24).fill(0), 9, 11)).toBe(0);
  });
});

describe("one place's restock times (a state or a city)", async () => {
  const { restockTimesPath } = await import("@/lib/content/restockTimes");
  const { STORES, hasStatePage, storePath } = await import("@/lib/apple/catalog");
  const us = storesOf("us");
  const parts = partNumbersFor("duo", [], [], "us");
  const la = us.filter((s) => s.state === "California" && s.city === "Los Angeles");
  const sf = us.filter((s) => s.state === "California" && s.city === "San Francisco");
  const ca = us.filter((s) => s.state === "California");
  const ny = us.find((s) => s.state === "New York")!;
  const since = trackingSince("us");
  const d1 = dayRange(since, since)[0];
  const now = new Date(`${d1}T23:00:00Z`);
  const at = (store: typeof ny, hour: number) => localInstant(storeTimeZone(store), d1, hour);
  const row = (store: typeof ny, hour: number, n = 1): SlotRow => ({ storeNumber: store.storeNumber, partNumber: parts[0], slot: at(store, hour), n, last: at(store, hour) });

  it("counts only the place's stores, lists its cities and every one of its stores", () => {
    const rows = [row(la[0], 9, 3), row(la[1], 10, 1), row(sf[0], 9, 2), row(ny, 9, 7)];
    const state = restockTimesFrom("us", rows, [], [], now, { stores: ca });
    expect(state.n).toBe(6); // New York's 7 are outside the scope
    expect(state.storesTotal).toBe(ca.length);
    expect(state.byRegion).toEqual([expect.objectContaining({ name: "California", restocks: 6, stores: 3, storesTotal: ca.length })]);
    expect(state.byCity[0]).toMatchObject({ name: "Los Angeles", state: "California", restocks: 4, stores: 2, storesTotal: la.length, path: "/iphone-duo-restock-times/california/los-angeles" });
    expect(state.byCity.find((c) => c.name === "San Francisco")).toMatchObject({ restocks: 2, path: "/iphone-duo-restock-times/california/san-francisco" });
    // A one-store city of the state links to its store, not to a page that does not exist.
    const oneStore = state.byCity.find((c) => c.storesTotal === 1);
    if (oneStore) expect(oneStore.path).toMatch(/^\/stores\/california\//);
    expect(state.topStores.length).toBe(3); // every store with a restock, not a top-12 cut
    const city = restockTimesFrom("us", rows, [], [], now, { stores: la });
    expect(city.n).toBe(4);
    expect(city.byCity).toEqual([expect.objectContaining({ name: "Los Angeles", restocks: 4 })]);
  });

  it("knows which places have a page of their own", () => {
    expect(restockTimesPath("California")).toBe("/iphone-duo-restock-times/california");
    expect(restockTimesPath("California", "Los Angeles")).toBe("/iphone-duo-restock-times/california/los-angeles");
    expect(restockTimesPath("Hawaii")).toBe("/iphone-duo-restock-times/hawaii/honolulu");
    const delaware = STORES.find((s) => s.state === "Delaware")!;
    expect(hasStatePage("Delaware")).toBe(false);
    expect(restockTimesPath("Delaware")).toBe(storePath(delaware));
    const oneStoreCity = STORES.find((s) => STORES.filter((x) => x.state === s.state && x.city === s.city).length === 1)!;
    expect(restockTimesPath(oneStoreCity.state, oneStoreCity.city)).toBe(storePath(oneStoreCity));
    expect(restockTimesPath("Ontario", undefined, "ca")).toBe("/ca/iphone-duo-restock-times");
  });
});
