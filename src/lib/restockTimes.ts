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
