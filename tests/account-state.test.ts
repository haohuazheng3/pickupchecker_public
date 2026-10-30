import { describe, it, expect, beforeEach } from "vitest";
import { summarizeDevices } from "@/lib/devices";
import { Body, SetBody } from "@/app/api/watches/route";
import { identify, track } from "@/lib/track";

const nightSky = { model: "duo", storage: "512GB", color: "Night Sky" };

describe("alert requests", () => {
  it("adds and switches off stores for some phones (POST)", () => {
    expect(Body.safeParse({ items: [nightSky], storeNumbers: [], removeStoreNumbers: ["R123"] }).success).toBe(true);
    expect(Body.safeParse({ items: [nightSky], storeNumbers: [], removeStoreNumbers: [] }).success).toBe(false);
  });
  it("sets the whole phones × stores set (PUT), empty lists included", () => {
    expect(SetBody.safeParse({ phones: [nightSky], stores: ["R095", "R415"] }).success).toBe(true);
    expect(SetBody.safeParse({ phones: [], stores: [] }).success).toBe(true);
    expect(SetBody.safeParse({ phones: [{ ...nightSky, model: "galaxy" }], stores: [] }).success).toBe(false);
    expect(SetBody.safeParse({ phones: [nightSky], stores: ["Fifth"] }).success).toBe(false);
  });
});

describe("where alerts go", () => {
  const ua = { iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)", ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" };
  it("names the one device, counts several, and ignores stopped ones", () => {
    expect(summarizeDevices([])).toEqual({ active: 0, label: null });
    expect(summarizeDevices([{ platform: "ios", standalone: true, userAgent: ua.iphone, disabledAt: null }])).toEqual({ active: 1, label: "iPhone app" });
    expect(summarizeDevices([{ platform: "ios", standalone: true, userAgent: ua.ipad, disabledAt: null }]).label).toBe("iPad app");
    expect(summarizeDevices([{ platform: "desktop", standalone: false, disabledAt: null }, { platform: "ios", standalone: true, userAgent: ua.iphone, disabledAt: null }])).toEqual({ active: 2, label: "2 devices" });
    expect(summarizeDevices([{ platform: "android", standalone: false, disabledAt: new Date() }])).toEqual({ active: 0, label: null });
  });
});

describe("analytics calls", () => {
  type Fw = ((...a: unknown[]) => void) & { q?: unknown[][] };
  const g = globalThis as unknown as { window?: { fw?: Fw } };
  beforeEach(() => { g.window = {}; });
  it("queues fw('event', name, props) until the snippet loads", () => {
    track("watch_saved", { rules: 3 });
    identify("user_1", "a@b.c");
    expect(g.window!.fw!.q).toEqual([["event", "watch_saved", { rules: 3 }], ["identify", { userRef: "user_1", email: "a@b.c" }]]);
  });
  it("calls the loaded snippet with FlowGlance's signature", () => {
    const calls: unknown[][] = [];
    g.window!.fw = ((...a: unknown[]) => { calls.push(a); }) as Fw;
    track("purchase", { amount: 20, currency: "usd", item: "max", id: "cs_1" });
    expect(calls).toEqual([["event", "purchase", { amount: 20, currency: "usd", item: "max", id: "cs_1" }]]);
  });
});

describe("when your stores restock", async () => {
  const { hourLabel, hourSpan, majorityZone, nextWindow, topHours, zoneName } = await import("@/lib/restockTimes");
  it("names the busiest hours, busiest first, earlier hour on a tie", () => {
    const byHour = Array(24).fill(0);
    byHour[10] = 9; byHour[14] = 9; byHour[18] = 4; byHour[2] = 1;
    expect(topHours(byHour, 3)).toEqual([10, 14, 18]);
    expect(topHours(Array(24).fill(0))).toEqual([]);
  });
  it("says hours the way people read them", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(13)).toBe("1 PM");
    expect(hourSpan(10)).toBe("10–11 AM");
    expect(hourSpan(11)).toBe("11 AM–12 PM");
    expect(hourSpan(23)).toBe("11 PM–12 AM");
  });
  it("finds the next window, wrapping past midnight", () => {
    expect(nextWindow([10, 14, 18], 12)).toEqual({ hour: 14, inHours: 2 });
    expect(nextWindow([10, 14, 18], 20)).toEqual({ hour: 10, inHours: 14 });
    expect(nextWindow([10], 10)).toEqual({ hour: 10, inHours: 0 });
    expect(nextWindow([], 10)).toBeNull();
  });
  it("speaks in the zone most of the stores are in", () => {
    expect(majorityZone(["America/Detroit", "America/New_York", "America/Detroit", "America/Chicago"])).toBe("America/Detroit");
    expect(zoneName("America/Detroit")).toBe("Eastern");
    expect(zoneName("America/Chicago")).toBe("Central");
    expect(zoneName("Europe/Paris")).toBe("Paris");
  });
});
