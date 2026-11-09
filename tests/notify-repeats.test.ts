import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_ALERTS_PER_HOUR, SAME_BATCH_GAP_MS, batchStart, underHourlyCap } from "@/lib/stock/notify";
import { decide } from "@/lib/stock/ingest";

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

/** 2026-11-09 (owner): one batch is one alert from start to end — never one per check, never again after a short dip. */
describe("one batch, one alert", () => {
  const t = (s: number) => new Date(Date.UTC(2026, 10, 9, 6, 0, 0) + s * 1000);

  it("a listing seen again on every 5-second check is no new event (alerts fire on transitions only)", () => {
    const prev = { status: "available" as const, quote: null, pendingStatus: null, pendingSince: null, pendingSeen: 0 };
    for (let i = 1; i <= 12; i++) expect(decide(prev, { available: true, quote: null }, t(5 * i)).commit).toBeNull();
  });
  it("a first restock starts its own batch", () => {
    expect(batchStart([], t(0))).toEqual(t(0));
    expect(batchStart([{ kind: "restock", at: t(0), seenUntil: null }], t(0))).toEqual(t(0));
  });
  it("off the shelf for under 2 minutes and back: the same batch as the listing before", () => {
    const ev = [
      { kind: "restock", at: t(0), seenUntil: null },
      { kind: "soldout", at: t(70), seenUntil: t(55) },
      { kind: "restock", at: t(110), seenUntil: null },
    ];
    expect(SAME_BATCH_GAP_MS).toBe(120_000);
    expect(batchStart(ev, t(110))).toEqual(t(0));
  });
  it("follows several short dips back to the first listing", () => {
    const ev = [
      { kind: "restock", at: t(0), seenUntil: null },
      { kind: "soldout", at: t(40), seenUntil: t(25) },
      { kind: "restock", at: t(90), seenUntil: null },
      { kind: "soldout", at: t(150), seenUntil: t(135) },
      { kind: "restock", at: t(200), seenUntil: null },
    ];
    expect(batchStart(ev, t(200))).toEqual(t(0));
  });
  it("back after 2 minutes or more off the shelf: a new batch", () => {
    const ev = [
      { kind: "restock", at: t(0), seenUntil: null },
      { kind: "soldout", at: t(60), seenUntil: t(45) },
      { kind: "restock", at: t(165), seenUntil: null },
    ];
    expect(batchStart(ev, t(165))).toEqual(t(165));
    // A long gap further back ends the walk: the batch starts at the listing after it.
    const chain = [
      { kind: "restock", at: t(0), seenUntil: null },
      { kind: "soldout", at: t(60), seenUntil: t(45) },
      { kind: "restock", at: t(400), seenUntil: null },
      { kind: "soldout", at: t(460), seenUntil: t(445) },
      { kind: "restock", at: t(500), seenUntil: null },
    ];
    expect(batchStart(chain, t(500))).toEqual(t(400));
  });
  it("uses the sell-out time when its last-seen check is missing", () => {
    const ev = [
      { kind: "restock", at: t(0), seenUntil: null },
      { kind: "soldout", at: t(60), seenUntil: null },
      { kind: "restock", at: t(150), seenUntil: null },
    ];
    expect(batchStart(ev, t(150))).toEqual(t(0)); // 90 s after the sell-out
  });
});

