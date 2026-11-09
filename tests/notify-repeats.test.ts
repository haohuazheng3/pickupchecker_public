import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_ALERTS_PER_HOUR, underHourlyCap } from "@/lib/stock/notify";

/**
 * 2026-11-09: a second batch of the same store × configuration alerts again. The old 30-minute cool-down held back
 * 3,386 alerts in 14 days (22 % of real restocks follow another within 30 minutes). Only a flood guard is left.
 */
describe("repeat restocks alert again", () => {
  const now = new Date("2026-11-09T06:00:00Z");
  const ago = (min: number) => new Date(now.getTime() - min * 60_000);

  it("alerts a second batch minutes after the first", () => {
    expect(underHourlyCap([ago(2)], now)).toBe(true);
    expect(underHourlyCap([ago(0.5), ago(10), ago(25)], now)).toBe(true);
  });
  it("holds only once the hourly cap is reached, and counts the last 60 minutes only", () => {
    const six = [1, 5, 12, 20, 33, 50].map(ago);
    expect(MAX_ALERTS_PER_HOUR).toBe(6);
    expect(underHourlyCap(six, now)).toBe(false);
    expect(underHourlyCap(six.slice(1), now)).toBe(true);
    expect(underHourlyCap([...six.slice(1), ago(61)], now)).toBe(true);
  });
  it("has no 30-minute cool-down left in the alert path", () => {
    const src = readFileSync("src/lib/stock/notify.ts", "utf8");
    expect(src).not.toMatch(/COOLDOWN_MS/);
    expect(src).not.toMatch(/30 \* 60 \* 1000/);
  });
});
