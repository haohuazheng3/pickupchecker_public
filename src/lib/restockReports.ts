/**
 * Restock reports published by other trackers (table restock_reports, imported from the private
 * data/restock-reports/*.json by scripts/import-restock-reports.ts). They are other sites' observations, not
 * restocks PickupChecker confirmed: no count, feed, alert or facts token ever includes them. Pages draw them only
 * as a separate series (hollow, dashed) with a legend naming the trackers and the dates, and a footnote linking
 * the trackers' home pages.
 *
 * Pure (tested), and safe for client components: no catalogue, no database.
 */

/** The trackers whose public data is imported, and the home page each footnote links (rel="nofollow noopener"). */
export const REPORT_SOURCES: Record<string, string> = {
  "Apple Pickup Live": "https://pickup.o1xhack.com/",
  DuoReady: "https://getduoready.com/stock/",
};

/**
 * Within this of one another, two sightings of the same store × part are the same restock: a report this close
 * to one of our own restocks is not imported (the page already shows ours), and the same restock reported by two
 * trackers counts once.
 */
export const REPORT_DEDUPE_MS = 10 * 60_000;

export interface ReportLike { storeNumber: string; partNumber: string; at: string | Date; source: string }
/** A report as the pages get it (queries.ts): `model` is the catalogue's name of the part ("iPhone Duo"). */
export interface ReportInput extends ReportLike { model?: string }

const time = (t: string | Date) => (typeof t === "string" ? Date.parse(t) : t.getTime());
const pairOf = (r: { storeNumber: string; partNumber: string }) => `${r.storeNumber}|${r.partNumber}`;

/* ------------------------------------------------------------------ import */

/**
 * Splits reports into the ones to import and the ones within ±windowMs of one of our own restocks of the same
 * store × part (`ours`: availability_events, kind restock, first_seen false).
 */
export function withoutOurs<T extends ReportLike>(reports: T[], ours: { storeNumber: string; partNumber: string; at: string | Date }[], windowMs = REPORT_DEDUPE_MS): { kept: T[]; duplicates: T[] } {
  const byPair = new Map<string, number[]>();
  for (const e of ours) {
    const l = byPair.get(pairOf(e)) ?? [];
    l.push(time(e.at));
    byPair.set(pairOf(e), l);
  }
  for (const l of byPair.values()) l.sort((a, b) => a - b);
  const kept: T[] = [], duplicates: T[] = [];
  for (const r of reports) {
    const l = byPair.get(pairOf(r));
    const t = time(r.at);
    // The first of ours at or after t − window: a duplicate when it is also at or before t + window.
    let lo = 0, hi = l?.length ?? 0;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (l![mid] < t - windowMs) lo = mid + 1; else hi = mid; }
    (l && lo < l.length && l[lo] <= t + windowMs ? duplicates : kept).push(r);
  }
  return { kept, duplicates };
}

export interface ReportRecord extends ReportLike { at: string; sourceUrl: string | null; kind: string }

/** Checks one data/restock-reports file: its well-formed reports, and a line per report it had to leave out. */
export function parseReportFile(json: unknown): { reports: ReportRecord[]; problems: string[] } {
  const reports: ReportRecord[] = [], problems: string[] = [];
  const list = (json as { reports?: unknown })?.reports;
  if (!Array.isArray(list)) return { reports, problems: ["no reports array"] };
  list.forEach((x, i) => {
    const r = x as Record<string, unknown>;
    const at = typeof r.at === "string" ? Date.parse(r.at) : NaN;
    const bad =
      typeof r.storeNumber !== "string" || !/^R\d{3,4}$/.test(r.storeNumber) ? "storeNumber"
        : typeof r.partNumber !== "string" || !r.partNumber ? "partNumber"
          : !Number.isFinite(at) ? "at"
            : typeof r.source !== "string" || !r.source.trim() ? "source"
              : typeof r.kind !== "string" || !r.kind ? "kind"
                : r.sourceUrl != null && typeof r.sourceUrl !== "string" ? "sourceUrl" : null;
    if (bad) { problems.push(`report ${i}: bad ${bad}`); return; }
    reports.push({ storeNumber: r.storeNumber as string, partNumber: r.partNumber as string, at: new Date(at).toISOString(), source: (r.source as string).trim(), sourceUrl: (r.sourceUrl as string | null | undefined) ?? null, kind: r.kind as string });
  });
  return { reports, problems };
}

/* ------------------------------------------------------------------ display */

/**
 * The same restock reported by two trackers within windowMs (same store × part) counts once, the earliest
 * sighting. Two reports from one tracker stay two: each tracker already publishes one sighting per restock.
 */
export function collapseReports<T extends ReportLike>(reports: T[], windowMs = REPORT_DEDUPE_MS): T[] {
  const sorted = [...reports].sort((a, b) => pairOf(a).localeCompare(pairOf(b)) || time(a.at) - time(b.at));
  const out: T[] = [];
  let pair = "", kept: { t: number; source: string }[] = [];
  for (const r of sorted) {
    const k = pairOf(r), t = time(r.at);
    if (k !== pair) { pair = k; kept = []; }
    if (kept.some((x) => x.source !== r.source && t - x.t <= windowMs)) continue;
    kept.push({ t, source: r.source });
    out.push(r);
  }
  return out;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FORMATS = new Map<string, Intl.DateTimeFormat>();

/** Local calendar day, hour, minute and weekday (0 = Sunday, as Postgres' dow) of an instant in `tz`. */
export function localTime(at: number, tz: string): { day: string; hour: number; minute: number; dow: number } {
  let f = FORMATS.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" });
    FORMATS.set(tz, f);
  }
  const p = f.formatToParts(new Date(at));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24, minute: Number(get("minute")), dow: WEEKDAYS.indexOf(get("weekday")) };
}

/** One store's report "drops" in one 15-minute slot of the day: the shape restockSlots (queries.ts) gives ours. */
export interface ReportSlot { slot: number; store: string; drops: number; mins: number }

/**
 * Reports → the timeline's slots, by the rule restockSlots applies to our own restocks: a store's reports within
 * one 10-minute window of a local day are one drop (at its earliest minute); drops are counted per 15-minute slot
 * and store, with the mean minute of the day.
 */
export function reportSlots(reports: ReportLike[], tz: string): ReportSlot[] {
  const drops = new Map<string, { store: string; m: number }>();
  for (const r of reports) {
    const l = localTime(time(r.at), tz);
    const m = l.hour * 60 + l.minute;
    const k = `${r.storeNumber}|${l.day}|${Math.floor(m / 10)}`;
    const d = drops.get(k);
    if (!d || m < d.m) drops.set(k, { store: r.storeNumber, m });
  }
  const slots = new Map<string, { slot: number; store: string; drops: number; sum: number }>();
  for (const d of drops.values()) {
    const slot = Math.floor(d.m / 15);
    const k = `${slot}|${d.store}`;
    const s = slots.get(k) ?? { slot, store: d.store, drops: 0, sum: 0 };
    s.drops++; s.sum += d.m;
    slots.set(k, s);
  }
  return [...slots.values()].map((s) => ({ slot: s.slot, store: s.store, drops: s.drops, mins: s.sum / s.drops })).sort((a, b) => a.slot - b.slot || a.store.localeCompare(b.store));
}

/** What a restock module draws for other trackers' reports, in the module's own time zone and window. */
export interface ReportSeries {
  total: number;
  /** Local hour of day 0–23 and weekday 0–6 (Sunday first), like RestockStats. */
  byHour: number[];
  byWeekday: number[];
  /** For the account timeline (same shape as our own restockSlots rows). */
  slots: ReportSlot[];
  /** The trackers among these reports (REPORT_SOURCES order first), with the home page to link (null if unknown). */
  sources: { name: string; url: string | null }[];
  /** The phones among these reports ("iPhone Duo"). */
  models: string[];
  /** Local dates (YYYY-MM-DD) the imported reports in the window span: what the trackers' data covers, not only this place. */
  from: string;
  to: string;
  tz: string;
  days: number;
}

const MODEL_ORDER = ["iPhone Duo", "iPhone 18 Pro", "iPhone 18 Pro Max"];

/**
 * Reports (one country's, as cached) → the series of one module: those in the last `days`, at `stores`, of
 * `parts` (null = all), collapsed across trackers, bucketed in `tz`. null when there is nothing to draw, so a
 * module without reports renders exactly as it did before reports existed.
 */
export function reportSeries(rows: ReportInput[], opts: { tz: string; days: number; now?: number; stores?: Iterable<string> | null; parts?: Iterable<string> | null }): ReportSeries | null {
  const now = opts.now ?? Date.now();
  const since = now - opts.days * 86400_000;
  const inWindow = rows.filter((r) => { const t = time(r.at); return t > since && t <= now; });
  if (inWindow.length === 0) return null;
  const stores = opts.stores ? new Set(opts.stores) : null;
  const parts = opts.parts ? new Set(opts.parts) : null;
  const shown = collapseReports(inWindow.filter((r) => (!stores || stores.has(r.storeNumber)) && (!parts || parts.has(r.partNumber))));
  if (shown.length === 0) return null;
  let first = Infinity, last = -Infinity;
  for (const r of inWindow) { const t = time(r.at); if (t < first) first = t; if (t > last) last = t; }
  const byHour = Array(24).fill(0) as number[], byWeekday = Array(7).fill(0) as number[];
  for (const r of shown) { const l = localTime(time(r.at), opts.tz); byHour[l.hour]++; byWeekday[l.dow]++; }
  const known = Object.keys(REPORT_SOURCES);
  const names = [...new Set(shown.map((r) => r.source))].sort((a, b) => (known.indexOf(a) + 1 || 99) - (known.indexOf(b) + 1 || 99) || a.localeCompare(b));
  const models = [...new Set(shown.map((r) => r.model).filter((m): m is string => Boolean(m)))].sort((a, b) => (MODEL_ORDER.indexOf(a) + 1 || 99) - (MODEL_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));
  return {
    total: shown.length, byHour, byWeekday, slots: reportSlots(shown, opts.tz),
    sources: names.map((name) => ({ name, url: Object.hasOwn(REPORT_SOURCES, name) ? REPORT_SOURCES[name] : null })),
    models, from: localTime(first, opts.tz).day, to: localTime(last, opts.tz).day, tz: opts.tz, days: opts.days,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-26" → "Oct 26". */
export function dayLabel(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Oct 26 – Nov 1" (one day: "Oct 26"). */
export function reportRange(s: Pick<ReportSeries, "from" | "to">): string {
  return s.from === s.to ? dayLabel(s.from) : `${dayLabel(s.from)} – ${dayLabel(s.to)}`;
}

/** "A", "A and B", "A, B and C". */
export function andList(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** The legend line of the reports series: "Reported by other trackers (Apple Pickup Live, DuoReady), Oct 26 – Nov 1". */
export function reportLegend(s: Pick<ReportSeries, "sources" | "from" | "to">): string {
  return `Reported by other trackers (${s.sources.map((x) => x.name).join(", ")}), ${reportRange(s)}`;
}
