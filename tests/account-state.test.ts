import { describe, it, expect, beforeEach } from "vitest";
import { ownedKeys, pickDelta, ruleKey, storesOwnedFor } from "@/lib/alertPicks";
import { summarizeDevices } from "@/lib/devices";
import { Body } from "@/app/api/watches/route";
import { identify, track } from "@/lib/track";

const nightSky = { model: "duo", storage: "512GB", color: "Night Sky" };
const starWhite = { model: "duo", storage: "512GB", color: "Star White" };
const row = (p: typeof nightSky, store: string, active = true) => ({ active, model: p.model, storages: [p.storage], colors: [p.color], storeNumbers: [store] });

describe("store picks for a signed-in user (+ Stores)", () => {
  const owned = ownedKeys([row(nightSky, "R1"), row(nightSky, "R2"), row(starWhite, "R3"), row(nightSky, "R9", false), { active: true, model: "duo", storages: [], colors: [], storeNumbers: ["R5"] }]);
  it("keeps only active one-store rules", () => {
    expect([...owned]).toEqual([ruleKey(nightSky, "R1"), ruleKey(nightSky, "R2"), ruleKey(starWhite, "R3")]);
  });
  it("starts the phone's own stores ticked, in the order they were set up", () => {
    expect(storesOwnedFor(owned, [nightSky])).toEqual(["R1", "R2"]);
    expect(storesOwnedFor(owned, [starWhite, nightSky])).toEqual(["R1", "R2", "R3"]);
    expect(storesOwnedFor(owned, [{ ...nightSky, color: "Silver" }])).toEqual([]);
  });
  it("counts what saving would change: nothing, additions, and unticked stores switched off", () => {
    expect(pickDelta([nightSky], ["R1", "R2"], owned)).toEqual({ added: 0, off: 0, offStores: [] });
    expect(pickDelta([nightSky], ["R1", "R2", "R4"], owned)).toEqual({ added: 1, off: 0, offStores: [] });
    expect(pickDelta([nightSky], ["R2", "R4"], owned)).toEqual({ added: 1, off: 1, offStores: ["R1"] });
    // Two phones: each ticked store is one alert per phone that lacks it.
    expect(pickDelta([nightSky, starWhite], ["R1", "R2", "R3"], owned)).toEqual({ added: 3, off: 0, offStores: [] });
    // No account data (visitor): every tick is new.
    expect(pickDelta([nightSky], ["R1", "R4"], null)).toEqual({ added: 2, off: 0, offStores: [] });
  });
  it("accepts a save that only switches stores off, and still needs some store", () => {
    expect(Body.safeParse({ items: [nightSky], storeNumbers: [], removeStoreNumbers: ["R123"] }).success).toBe(true);
    expect(Body.safeParse({ items: [nightSky], storeNumbers: ["R124"], removeStoreNumbers: ["R123"] }).success).toBe(true);
    expect(Body.safeParse({ items: [nightSky], storeNumbers: [], removeStoreNumbers: [] }).success).toBe(false);
    expect(Body.safeParse({ items: [nightSky], removeStoreNumbers: ["X1"] }).success).toBe(false);
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
