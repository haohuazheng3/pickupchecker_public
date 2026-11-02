import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { recallHere, rememberHere } from "@/lib/lastPlace";

describe("last device location (lib/lastPlace.ts)", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("keeps it rounded to about a kilometre", () => {
    rememberHere({ lat: 41.878113, lng: -87.629799 });
    expect(recallHere()).toEqual({ lat: 41.88, lng: -87.63 });
  });

  it("forgets it after 30 days and ignores junk", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
    rememberHere({ lat: 40.7, lng: -74 });
    vi.setSystemTime(new Date("2026-12-03T00:00:00Z"));
    expect(recallHere()).toBeNull();
    store.set("pc:here", "{nope");
    expect(recallHere()).toBeNull();
    store.set("pc:here", JSON.stringify({ lat: 200, lng: 0, at: Date.now() }));
    expect(recallHere()).toBeNull();
  });

  it("survives a browser without storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } });
    expect(() => rememberHere({ lat: 1, lng: 1 })).not.toThrow();
    expect(recallHere()).toBeNull();
  });
});
