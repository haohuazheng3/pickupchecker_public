/**
 * "When your stores restock" (account page): which hours to be ready at, said in the zone the user's
 * stores are in. Pure, so it is tested.
 */
const ZONES: Record<string, string> = {
  "America/New_York": "Eastern", "America/Detroit": "Eastern", "America/Indiana/Indianapolis": "Eastern", "America/Kentucky/Louisville": "Eastern",
  "America/Chicago": "Central", "America/Denver": "Mountain", "America/Boise": "Mountain", "America/Phoenix": "Arizona",
  "America/Los_Angeles": "Pacific", "America/Anchorage": "Alaska", "Pacific/Honolulu": "Hawaii", "America/Puerto_Rico": "Atlantic",
};

/** "Eastern", "Central" … for a US zone; the city part of anything else. */
export function zoneName(tz: string): string {
  return ZONES[tz] ?? tz.split("/").pop()!.replace(/_/g, " ");
}

/** The zone most of these stores are in (ties: the first seen). */
export function majorityZone(tzs: string[], fallback = "America/New_York"): string {
  const n = new Map<string, number>();
  for (const t of tzs) n.set(t, (n.get(t) ?? 0) + 1);
  let best = fallback, top = 0;
  for (const [t, c] of n) if (c > top) { best = t; top = c; }
  return best;
}

/** The k busiest hours (0–23) that saw anything, busiest first; ties go to the earlier hour. */
export function topHours(byHour: number[], k = 3): number[] {
  return byHour.map((n, h) => ({ n, h })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.h - b.h).slice(0, k).map((x) => x.h);
}

/** 0 → "12 AM", 13 → "1 PM". */
export function hourLabel(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** The hour as a window: "10–11 AM", "11 AM–12 PM". */
export function hourSpan(h: number): string {
  const a = hourLabel(h), b = hourLabel((h + 1) % 24);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}

/** The next of these hours at or after `nowHour` (wrapping past midnight) and how many hours away it starts. */
export function nextWindow(hours: number[], nowHour: number): { hour: number; inHours: number } | null {
  if (hours.length === 0) return null;
  const ahead = hours.map((h) => ({ hour: h, inHours: (h - nowHour + 24) % 24 })).sort((a, b) => a.inHours - b.inHours);
  return ahead[0];
}

/* ------------------------------------------------------------------ restock timeline */

/** A time of day restocks landed at, over the window: mean minute (rounded to 5), how many drops, at which stores. */
export interface TimelinePoint { min: number; drops: number; stores: { storeNumber: string; drops: number }[] }
export interface Timeline { points: TimelinePoint[]; /** Minutes per point: slots merge until few enough remain. */ step: 15 | 30 | 60; total: number; /** Drops left out of the busiest points shown. */ hidden: number }

/**
 * Drops by 15-minute slot and store into at most `maxPoints` times of day, earliest first. Slots merge into
 * half hours, then hours, until few enough remain; past that only the busiest hours stay (the rest counted
 * in `hidden`).
 */
export function buildTimeline(rows: { slot: number; store: string; drops: number; mins: number }[], maxPoints = 12): Timeline {
  const total = rows.reduce((a, r) => a + r.drops, 0);
  for (const step of [15, 30, 60] as const) {
    const per = step / 15;
    const groups = new Map<number, { weighted: number; drops: number; stores: Map<string, number> }>();
    for (const r of rows) {
      const k = Math.floor(r.slot / per);
      const g = groups.get(k) ?? { weighted: 0, drops: 0, stores: new Map<string, number>() };
      g.weighted += r.mins * r.drops; g.drops += r.drops; g.stores.set(r.store, (g.stores.get(r.store) ?? 0) + r.drops);
      groups.set(k, g);
    }
    if (groups.size > maxPoints && step !== 60) continue;
    let points: TimelinePoint[] = [...groups.values()].filter((g) => g.drops > 0).map((g) => ({
      min: Math.min(1435, Math.round(g.weighted / g.drops / 5) * 5),
      drops: g.drops,
      stores: [...g.stores].map(([storeNumber, drops]) => ({ storeNumber, drops })).sort((a, b) => b.drops - a.drops || a.storeNumber.localeCompare(b.storeNumber)),
    }));
    let hidden = 0;
    if (points.length > maxPoints) {
      const kept = [...points].sort((a, b) => b.drops - a.drops || a.min - b.min).slice(0, maxPoints);
      hidden = total - kept.reduce((a, p) => a + p.drops, 0);
      points = kept;
    }
    return { points: points.sort((a, b) => a.min - b.min), step, total, hidden };
  }
  return { points: [], step: 60, total, hidden: 0 };
}

/** Where "now" falls among the points: how many come before it, and the next one (tomorrow's first after the last). */
export function placeNow(points: { min: number }[], nowMin: number): { before: number; next: number | null; inMin: number; tomorrow: boolean } {
  if (points.length === 0) return { before: 0, next: null, inMin: 0, tomorrow: false };
  const i = points.findIndex((p) => p.min >= nowMin);
  if (i === -1) return { before: points.length, next: 0, inMin: 1440 - nowMin + points[0].min, tomorrow: true };
  return { before: i, next: i, inMin: points[i].min - nowMin, tomorrow: false };
}

/** 565 → "9:25 AM". */
export function clockLabel(min: number): string {
  const h = Math.floor(min / 60) % 24, m = min % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** 48 → "48 min", 125 → "2 h 5 min", 180 → "3 h". */
export function gapLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Minute of the day (0–1439) in a zone. */
export function minuteIn(tz: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}
