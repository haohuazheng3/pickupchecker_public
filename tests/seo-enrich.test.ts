import { describe, it, expect } from "vitest";
import {
  normalizeHours, compressHours, hoursGroups, todayLabel, zoneClock, openingHoursSpec, fmtClock,
  nearestOutsideState, nearestInState, nearestTo, centroid,
  narrative, faq, explainer, fmtDuration, listWords, telHref, directionsUrl, alertHref, plural, peakOf,
  fitTitle, stateTitle, cityTitle, storeTitle, modelTitle, storeJsonLd, itemListJsonLd, productJsonLd, faqJsonLd,
} from "@/lib/seo/enrich";
import { STORES, STORE_INDEX, STATE_CODES, statesWithStores, citiesWithStores, stateCodeOf, MODELS, type ModelKey } from "@/lib/apple/catalog";

const zeroStats = { day: 0, week: 0, month: 0, soldouts: 0, medianMs: null, days: 30 };
const someStats = { day: 2, week: 9, month: 31, soldouts: 28, medianMs: 2 * 3600_000 + 15 * 60_000, days: 30 };
const zeroStock = { duo: 0, "18-pro": 0, "18-pro-max": 0 } as Record<ModelKey, number>;

describe("opening hours", () => {
  it("normalises the two-block shape (unordered days + Sunday) to Mon→Sun", () => {
    const week = normalizeHours([
      { days: ["Saturday", "Friday", "Thursday", "Tuesday", "Wednesday", "Monday"], opens: "10:00:00", closes: "21:00:00" },
      { days: ["Sunday"], opens: "11:00:00", closes: "18:00:00" },
    ]);
    expect(week.map((d) => d.short)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(week[0]).toMatchObject({ day: "Monday", opens: "10:00", closes: "21:00" });
    expect(week[6]).toMatchObject({ day: "Sunday", opens: "11:00", closes: "18:00" });
    expect(compressHours(week)).toBe("Mon–Sat 10:00–21:00 · Sun 11:00–18:00");
  });
  it("handles three blocks, a closed day (opens null) and a single every-day block", () => {
    const three = normalizeHours([
      { days: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "10:00:00", closes: "20:00:00" },
      { days: ["Friday", "Saturday"], opens: "10:00:00", closes: "21:00:00" },
      { days: ["Sunday"], opens: null, closes: null },
    ]);
    expect(compressHours(three)).toBe("Mon–Thu 10:00–20:00 · Fri–Sat 10:00–21:00 · Sun Closed");
    expect(hoursGroups(three)).toHaveLength(3);
    expect(openingHoursSpec(three)).toHaveLength(2);
    expect(openingHoursSpec(three)[0]).toMatchObject({ dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "10:00", closes: "20:00" });
    const everyDay = normalizeHours([{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "09:00:00", closes: "21:00:00" }]);
    expect(compressHours(everyDay)).toBe("Every day 09:00–21:00");
    expect(compressHours(normalizeHours(undefined))).toBe("Closed");
    expect(fmtClock("9:30:00")).toBe("09:30");
  });
  it("every real store normalises to 7 days", () => {
    for (const s of STORES) {
      const week = normalizeHours(s.hours);
      expect(week).toHaveLength(7);
      expect(compressHours(week)).not.toContain("undefined");
    }
  });
  it("computes today's label in the store's zone, not the server's", () => {
    const week = normalizeHours([
      { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "10:00:00", closes: "21:00:00" },
      { days: ["Sunday"], opens: "11:00:00", closes: "18:00:00" },
    ]);
    // 2026-10-30T02:30Z is Thu 16:30 in Honolulu (UTC-10) but Fri 03:30 in Berlin (CET, UTC+1 after the DST change).
    const t = new Date("2026-10-30T02:30:00Z");
    expect(zoneClock(t, "Pacific/Honolulu")).toMatchObject({ dayIndex: 3, minutes: 16 * 60 + 30, dateKey: "2026-10-29" });
    expect(zoneClock(t, "Europe/Berlin")).toMatchObject({ dayIndex: 4, minutes: 3 * 60 + 30, dateKey: "2026-10-30" });
    expect(todayLabel(week, "Pacific/Honolulu", t)).toMatchObject({ status: "open", label: "Open now · closes 21:00" });
    expect(todayLabel(week, "Europe/Berlin", t)).toMatchObject({ status: "before", label: "Opens at 10:00" });
    // Sat 22:00 local → closed, opens tomorrow (Sunday) at 11:00
    const late = new Date("2026-10-31T22:00:00-04:00");
    expect(todayLabel(week, "America/New_York", late)).toMatchObject({ status: "after", label: "Closed now · opens tomorrow at 11:00" });
    const closedSunday = normalizeHours([{ days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "10:00:00", closes: "21:00:00" }, { days: ["Sunday"], opens: null, closes: null }]);
    const sunday = new Date("2026-11-01T12:00:00-05:00");
    expect(todayLabel(closedSunday, "America/New_York", sunday)).toMatchObject({ status: "closed", label: "Closed today · opens tomorrow at 10:00" });
  });
});

describe("geography", () => {
  it("nearest stores across the state line are never in the same state and never empty", () => {
    const summit = STORES.find((s) => s.state === "Alabama")!;
    const out = nearestOutsideState(summit, 4);
    expect(out).toHaveLength(4);
    for (const s of out) expect(s.state).not.toBe("Alabama");
    expect(out[0].distance).toBeLessThanOrEqual(out[1].distance);
    const anchorage = STORES.find((s) => s.state === "Alaska")!;
    expect(nearestOutsideState(anchorage, 1)[0].state).toBe("Washington");
    expect(nearestInState(summit, 5).every((s) => s.state === "Alabama" && s.storeNumber !== summit.storeNumber)).toBe(true);
    expect(nearestInState(anchorage, 5)).toHaveLength(0);
  });
  it("nearestTo excludes the given set and centroid averages", () => {
    const nyc = STORES.filter((s) => s.city === "New York");
    const mid = centroid(nyc);
    expect(mid.lat).toBeGreaterThan(40);
    const near = nearestTo(mid, new Set(nyc.map((s) => s.storeNumber)), 5);
    expect(near).toHaveLength(5);
    for (const s of near) expect(nyc.some((x) => x.storeNumber === s.storeNumber)).toBe(false);
  });
  it("links", () => {
    expect(telHref("(205) 909-2570")).toBe("tel:+12059092570");
    expect(telHref("1-205-909-2570")).toBe("tel:+12059092570");
    expect(telHref("call us")).toBeNull();
    expect(directionsUrl({ lat: 33.4, lng: -86.7, name: "x" })).toBe("https://www.google.com/maps/dir/?api=1&destination=33.4,-86.7");
    expect(alertHref({ model: "duo", storage: "512GB", color: "Night Sky", store: "R225" })).toBe("/?model=duo&storage=512GB&color=Night+Sky&store=R225#notify");
    expect(alertHref({ state: "alabama" })).toBe("/?model=duo&state=alabama#notify");
    expect(alertHref({ state: "alabama", city: "birmingham" })).toBe("/?model=duo&state=alabama&city=birmingham#notify");
  });
});

describe("formatters", () => {
  it("durations, lists, plurals", () => {
    expect(fmtDuration(20_000)).toBe("under a minute");
    expect(fmtDuration(7 * 60_000)).toBe("7 min");
    expect(fmtDuration(2 * 3600_000 + 15 * 60_000)).toBe("2 h 15 min");
    expect(fmtDuration(3 * 3600_000)).toBe("3 h");
    expect(fmtDuration(26 * 3600_000)).toBe("1 d 2 h");
    expect(listWords([])).toBe("");
    expect(listWords(["a"])).toBe("a");
    expect(listWords(["a", "b"])).toBe("a and b");
    expect(listWords(["a", "b", "c"])).toBe("a, b and c");
    expect(listWords(["a", "b", "c", "d"], 2)).toBe("a, b and 2 more");
    expect(plural(1, "store")).toBe("1 store");
    expect(plural(2, "city", "cities")).toBe("2 cities");
    expect(peakOf({ byHour: [0, 0, 5], byWeekday: [0, 3, 2], total: 5 })).toEqual({ hour: "2 AM", day: "Monday", total: 5 });
    expect(peakOf({ byHour: [1], byWeekday: [1], total: 1 })).toBeNull();
  });
});

describe("narrative", () => {
  it("reads well when every number is zero", () => {
    const t = narrative({ kind: "state", place: "Alabama", stores: 2, cities: ["Birmingham", "Huntsville"], stockNow: zeroStock, stats: zeroStats });
    expect(t).toContain("No restock has been logged in Alabama in the last 30 days.");
    expect(t).toContain("The 2 Apple Stores in Alabama (Birmingham and Huntsville) are re-checked every 20 seconds; right now none list the iPhone Duo, none list the iPhone 18 Pro and none list the iPhone 18 Pro Max for pickup.");
    expect(t).toContain("not enough restock-to-sell-out pairs");
    expect(t).not.toMatch(/undefined|NaN|\b0 of 0\b/);
    const store = narrative({ kind: "store", place: "Apple The Summit", stores: 1, stockNow: zeroStock, configs: { duo: 8, "18-pro": 16, "18-pro-max": 16 }, stats: zeroStats });
    expect(store).toContain("No restock has been logged at Apple The Summit in the last 30 days.");
    expect(store).toContain("Right now it lists the iPhone Duo in 0 of 8 configurations, the iPhone 18 Pro in 0 of 16 configurations and the iPhone 18 Pro Max in 0 of 16 configurations; we re-check it every 20 seconds.");
    const model = narrative({ kind: "model", place: "iPhone Duo", stores: 269, stockNow: zeroStock, stats: zeroStats });
    expect(model).toContain("No Apple Store in the US lists the iPhone Duo for in-store pickup at the moment");
    expect(model).toContain("No iPhone Duo restock has been logged anywhere in the last 30 days.");
  });
  it("uses the real numbers when there are some", () => {
    const t = narrative({ kind: "city", place: "Birmingham", stores: 1, stockNow: { duo: 1, "18-pro": 0, "18-pro-max": 1 }, stats: someStats });
    expect(t).toContain("31 restocks have been logged in Birmingham in the last 30 days (9 this week, 2 in the last 24 hours), along with 28 sell-outs.");
    expect(t).toContain("The 1 Apple Store in Birmingham is re-checked every 20 seconds; right now it lists the iPhone Duo, none lists the iPhone 18 Pro and it lists the iPhone 18 Pro Max for pickup.");
    expect(t).toContain("stays available for about 2 h 15 min");
    const one = narrative({ kind: "state", place: "Texas", stores: 20, stockNow: { duo: 3, "18-pro": 20, "18-pro-max": 1 }, stats: { ...someStats, month: 1, soldouts: 0 } });
    expect(one).toContain("1 restock has been logged in Texas");
    expect(one).toContain("right now 3 list the iPhone Duo, all of them list the iPhone 18 Pro and 1 lists the iPhone 18 Pro Max for pickup");
  });
});

describe("explainer and FAQ", () => {
  it("explainer is 3–5 sentences of place-interpolated text", () => {
    for (const kind of ["state", "city", "store", "model"] as const) {
      const ps = explainer(kind, kind === "store" ? "Apple The Summit" : kind === "model" ? "iPhone Duo" : "Alabama");
      expect(ps.length).toBeGreaterThanOrEqual(3);
      expect(ps.length).toBeLessThanOrEqual(5);
      expect(ps.join(" ")).not.toContain("free alert");
    }
    expect(explainer("state", "Alabama")[1]).toContain("Apple Stores in Alabama");
  });
  it("FAQs have 4–6 data-driven questions for every page type, with zero data", () => {
    const al = STORES.filter((s) => s.state === "Alabama");
    const state = faq({ kind: "state", place: "Alabama", stores: al, stockNow: zeroStock, duoStores: [], stats: zeroStats, peak: null, nearest: nearestOutsideState(al[0], 3) });
    expect(state.length).toBeGreaterThanOrEqual(4);
    expect(state.length).toBeLessThanOrEqual(6);
    expect(state[0].a).toContain("None at the last check");
    expect(state.find((q) => q.q.startsWith("How many"))!.a).toContain("2 Apple Stores: Apple The Summit in Birmingham and Apple Bridge Street in Huntsville");
    const store = faq({ kind: "store", place: "Apple The Summit", stores: [al[0]], stockNow: zeroStock, stats: zeroStats, peak: null, nearest: nearestOutsideState(al[0], 3), hours: "Mon–Sat 10:00–21:00 · Sun 11:00–18:00", todayText: "10:00–21:00 (open now)" });
    expect(store.length).toBe(6);
    expect(store[1].a).toContain("Mon–Sat 10:00–21:00");
    expect(store[1].a).toContain("211 Summit Boulevard, Birmingham, AL 35243");
    const model = faq({ kind: "model", place: "iPhone Duo", stores: STORES, stockNow: zeroStock, stats: someStats, peak: { hour: "10 AM", day: "Tuesday", total: 31 }, prices: { low: 1999, high: 2499, storages: ["256GB", "512GB", "1TB"], colors: ["Night Sky", "Star White"] } });
    expect(model.length).toBe(6);
    expect(model[1].a).toContain("$1,999 to $2,499");
    expect(model[2].a).toContain("around 10 AM local time");
    for (const q of [...state, ...store, ...model]) { expect(q.a).not.toMatch(/undefined|NaN/); expect(q.a).not.toContain("free alert"); }
    const ld = faqJsonLd(state);
    expect(ld["@type"]).toBe("FAQPage");
    expect(ld.mainEntity).toHaveLength(state.length);
  });
});

describe("titles", () => {
  it("fit under 60 characters for every state, city, store and model", () => {
    expect(fitTitle(["x".repeat(70), "short"])).toBe("short");
    expect(fitTitle(["x".repeat(70)])).toHaveLength(60);
    for (const s of statesWithStores()) for (const n of [0, 12]) expect(stateTitle(s.name, n, s.count).length).toBeLessThanOrEqual(60);
    for (const c of citiesWithStores()) for (const n of [0, 12]) expect(cityTitle(c.name, STATE_CODES[c.state] ?? c.state, n, c.stores.length).length).toBeLessThanOrEqual(60);
    for (const s of STORES) for (const n of [0, 8]) expect(storeTitle(s, stateCodeOf(s), n).length).toBeLessThanOrEqual(60);
    for (const m of MODELS) for (const n of [0, 269]) expect(modelTitle(m.name, n).length).toBeLessThanOrEqual(60);
    expect(stateTitle("Alabama", 1, 2)).toBe("Apple Stores in Alabama: 1 of 2 have the iPhone Duo now");
  });
});

describe("JSON-LD", () => {
  it("store schema carries hours and a map; lists and products are well formed", () => {
    const s = STORE_INDEX.get("R225")!;
    const ld = storeJsonLd(s, normalizeHours(s.hours));
    expect(ld["@type"]).toBe("Store");
    expect(ld.hasMap).toContain("google.com/maps");
    expect(ld.openingHoursSpecification).toHaveLength(2);
    expect(ld.address.postalCode).toBe("35243");
    const list = itemListJsonLd("Alabama", STORES.filter((x) => x.state === "Alabama"));
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement[0].url).toMatch(/^https:\/\/pickupchecker\.com\/stores\/alabama\//);
    const p = productJsonLd("duo", 0);
    expect(p.offers.availability).toBe("https://schema.org/OutOfStock");
    expect(p.offers.offerCount).toBe(8);
    expect(productJsonLd("18-pro", 3).offers.availability).toBe("https://schema.org/InStock");
  });
});
