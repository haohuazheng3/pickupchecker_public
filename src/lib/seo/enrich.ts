/**
 * Pure helpers that turn the static dataset (stores.json, catalog.json) and the per-place statistics
 * into the rich content of the SEO pages: normalised opening hours, "open now" labels in the store's
 * zone, nearest stores across state lines, narrative paragraphs, FAQs, JSON-LD and page titles.
 * Everything here is deterministic and unit-tested (tests/seo-enrich.test.ts); nothing touches the DB.
 */
import { STORES, MODELS, DEFAULT_MODEL, STORAGE_ORDER, catalogFor, modelByKey, stateCodeOf, distanceMiles, storePath, type Store, type ModelKey, type CatalogItem } from "../apple/catalog";

/* ------------------------------------------------------------------ opening hours */

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface DayHours { day: (typeof DAY_NAMES)[number]; short: (typeof DAY_SHORT)[number]; opens: string | null; closes: string | null }

/** "10:00:00" → "10:00"; null stays null. Tolerates "10:00" and "9:00:00". */
export function fmtClock(t: string | null | undefined): string | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : t;
}

/** Hours blocks from apple.com (1–3 blocks, days in any order, `opens: null` = closed) → Mon→Sun, always 7 entries. */
export function normalizeHours(hours: Store["hours"] | undefined): DayHours[] {
  const byDay = new Map<string, { opens: string | null; closes: string | null }>();
  for (const block of hours ?? []) for (const d of block.days ?? []) byDay.set(d, { opens: block.opens && block.closes ? fmtClock(block.opens) : null, closes: block.opens && block.closes ? fmtClock(block.closes) : null });
  return DAY_NAMES.map((day, i) => ({ day, short: DAY_SHORT[i], opens: byDay.get(day)?.opens ?? null, closes: byDay.get(day)?.closes ?? null }));
}

export function hoursText(d: Pick<DayHours, "opens" | "closes">): string {
  return d.opens && d.closes ? `${d.opens}–${d.closes}` : "Closed";
}

/** Consecutive days with identical hours collapse: [{ label: "Mon–Sat", hours: "10:00–21:00" }, { label: "Sun", hours: "11:00–18:00" }]. */
export function hoursGroups(week: DayHours[]): { label: string; hours: string; days: number[] }[] {
  const out: { label: string; hours: string; days: number[] }[] = [];
  week.forEach((d, i) => {
    const h = hoursText(d);
    const last = out[out.length - 1];
    if (last && last.hours === h && last.days[last.days.length - 1] === i - 1) last.days.push(i);
    else out.push({ label: "", hours: h, days: [i] });
  });
  for (const g of out) g.label = g.days.length === 1 ? DAY_SHORT[g.days[0]] : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`;
  return out;
}

/** "Mon–Sat 10:00–21:00 · Sun 11:00–18:00" */
export function compressHours(week: DayHours[]): string {
  const groups = hoursGroups(week);
  if (groups.length === 1 && groups[0].days.length === 7) return groups[0].hours === "Closed" ? "Closed" : `Every day ${groups[0].hours}`;
  return groups.map((g) => `${g.label} ${g.hours}`).join(" · ");
}

/** Wall-clock in an IANA zone: Mon=0 … Sun=6, minutes since midnight and the YYYY-MM-DD date key. */
export function zoneClock(now: Date, tz: string): { dayIndex: number; minutes: number; dateKey: string } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", hourCycle: "h23", hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  }
  const get = (t: Intl.DateTimeFormatPart["type"]) => parts.find((p) => p.type === t)?.value ?? "";
  const dayIndex = Math.max(0, (DAY_SHORT as readonly string[]).indexOf(get("weekday")));
  const hour = Number(get("hour")) % 24;
  return { dayIndex, minutes: hour * 60 + Number(get("minute")), dateKey: `${get("year")}-${get("month")}-${get("day")}` };
}

export function dateKeyInZone(now: Date, tz: string): string {
  return zoneClock(now, tz).dateKey;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export type OpenStatus = "open" | "before" | "after" | "closed";

/** Today's hours and an "Open now / Opens at / Closed today" label, in the store's own zone. */
export function todayLabel(week: DayHours[], tz: string, now = new Date()): { dayIndex: number; today: DayHours; status: OpenStatus; label: string } {
  const { dayIndex, minutes } = zoneClock(now, tz);
  const today = week[dayIndex];
  const nextOpen = () => {
    for (let k = 1; k <= 7; k++) {
      const d = week[(dayIndex + k) % 7];
      if (d.opens) return `${k === 1 ? "tomorrow" : d.short} at ${d.opens}`;
    }
    return null;
  };
  if (!today.opens || !today.closes) {
    const n = nextOpen();
    return { dayIndex, today, status: "closed", label: n ? `Closed today · opens ${n}` : "Closed today" };
  }
  if (minutes < toMinutes(today.opens)) return { dayIndex, today, status: "before", label: `Opens at ${today.opens}` };
  if (minutes < toMinutes(today.closes)) return { dayIndex, today, status: "open", label: `Open now · closes ${today.closes}` };
  const n = nextOpen();
  return { dayIndex, today, status: "after", label: n ? `Closed now · opens ${n}` : "Closed now" };
}

/** schema.org openingHoursSpecification (closed days omitted). */
export function openingHoursSpec(week: DayHours[]) {
  return hoursGroups(week)
    .filter((g) => g.hours !== "Closed")
    .map((g) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: g.days.map((i) => DAY_NAMES[i]), opens: week[g.days[0]].opens, closes: week[g.days[0]].closes }));
}

/* ------------------------------------------------------------------ store links & geography */

export function directionsUrl(store: Pick<Store, "lat" | "lng" | "name">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
}

/** "(205) 909-2570" → "tel:+12059092570"; anything without 10 digits → null. */
export function telHref(phone: string | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return null;
}

export function fullAddress(store: Store): string {
  return `${(store.street ?? "").trim()}, ${store.city}, ${stateCodeOf(store)} ${store.postalCode ?? ""}`.replace(/\s+/g, " ").trim();
}

/** Wizard deep link: one alert is one store × one model × one storage × one colour. */
export function alertHref(o: { model?: ModelKey; storage?: string; color?: string; store?: string; state?: string; city?: string } = {}): string {
  const q = new URLSearchParams();
  q.set("model", o.model ?? DEFAULT_MODEL);
  if (o.storage) q.set("storage", o.storage);
  if (o.color) q.set("color", o.color);
  if (o.store) q.set("store", o.store);
  if (o.state) q.set("state", o.state);
  if (o.city) q.set("city", o.city);
  return `/?${q.toString()}#notify`;
}

export type StoreWithDistance = Store & { distance: number };

function withDistance(from: Pick<Store, "lat" | "lng">, list: Store[]): StoreWithDistance[] {
  return list.map((s) => ({ ...s, distance: distanceMiles(from.lat, from.lng, s.lat, s.lng) })).sort((a, b) => a.distance - b.distance);
}

/** Nearest stores in a different state (never empty: Alaska gets Washington). */
export function nearestOutsideState(from: Pick<Store, "lat" | "lng" | "state">, limit = 4): StoreWithDistance[] {
  return withDistance(from, STORES.filter((s) => s.state !== from.state)).slice(0, limit);
}

/** Nearest other stores in the same state, optionally outside the same city. */
export function nearestInState(from: Store, limit = 6, opts: { excludeCity?: boolean } = {}): StoreWithDistance[] {
  return withDistance(from, STORES.filter((s) => s.state === from.state && s.storeNumber !== from.storeNumber && (!opts.excludeCity || s.city !== from.city))).slice(0, limit);
}

/** Nearest stores to a point, any state, excluding a set. */
export function nearestTo(from: Pick<Store, "lat" | "lng">, exclude: Set<string>, limit = 6): StoreWithDistance[] {
  return withDistance(from, STORES.filter((s) => !exclude.has(s.storeNumber))).slice(0, limit);
}

export function centroid(stores: Pick<Store, "lat" | "lng">[]): { lat: number; lng: number } {
  const n = Math.max(1, stores.length);
  return { lat: stores.reduce((a, s) => a + s.lat, 0) / n, lng: stores.reduce((a, s) => a + s.lng, 0) / n };
}

/* ------------------------------------------------------------------ small formatters */

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return "under a minute";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d ${h % 24} h` : `${d} d`;
}

export function fmtPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

/** "a, b and c" — beyond `max` items: "a, b, c and 4 more". */
export function listWords(items: string[], max = 6): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length <= max) return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  return `${items.slice(0, max).join(", ")} and ${items.length - max} more`;
}

export function configName(item: CatalogItem): string {
  return `${item.model} ${item.storage} ${item.color}`;
}

export function sortConfigs<T extends { storage: string; color: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color));
}

/* ------------------------------------------------------------------ narrative */

/** The cached statistics a narrative needs (shape of PlaceStats in stock/queries.ts, minus the series). */
export interface NarrativeStats { day: number; week: number; month: number; soldouts: number; medianMs: number | null; days: number }

export interface NarrativeInput {
  kind: "state" | "city" | "store" | "model";
  /** "Alabama", "Birmingham", "Apple The Summit", "iPhone Duo" */
  place: string;
  stores: number;
  /** State pages: the city names (for "Birmingham and Huntsville"). */
  cities?: string[];
  /** State/city/model: stores with at least one configuration available, per model. Store: configurations available, per model. */
  stockNow: Record<ModelKey, number>;
  /** Store pages: configurations tracked per model (8 / 16 / 16). */
  configs?: Record<ModelKey, number>;
  stats: NarrativeStats;
}

/** One paragraph of real numbers that reads well at zero. The "latest restock" sentence is rendered separately (it ticks). */
export function narrative(i: NarrativeInput): string {
  const n = i.stats.days;
  const s: string[] = [];
  if (i.kind === "model") {
    const m = modelByKey(MODELS.find((x) => x.name === i.place)?.key ?? DEFAULT_MODEL) ?? MODELS[0];
    const now = i.stockNow[m.key] ?? 0;
    s.push(now === 0 ? `No Apple Store in the US lists the ${i.place} for in-store pickup at the moment — all ${i.stores} stores are re-checked every 20 seconds, so this changes within seconds of a restock.` : `${plural(now, "Apple Store")} of ${i.stores} in the US ${now === 1 ? "lists" : "list"} the ${i.place} for in-store pickup right now; every store is re-checked every 20 seconds.`);
    s.push(i.stats.month === 0 ? `No ${i.place} restock has been logged anywhere in the last ${n} days.` : `${plural(i.stats.month, `${i.place} restock`)} ${i.stats.month === 1 ? "was" : "were"} logged across the country in the last ${n} days (${i.stats.week} this week, ${i.stats.day} in the last 24 hours)${i.stats.soldouts ? `, along with ${plural(i.stats.soldouts, "sell-out")}` : ""}.`);
  } else {
    const where = i.kind === "store" ? `at ${i.place}` : `in ${i.place}`;
    s.push(i.stats.month === 0 ? `No restock has been logged ${where} in the last ${n} days${i.stats.soldouts ? `, though ${plural(i.stats.soldouts, "sell-out")} ${i.stats.soldouts === 1 ? "was" : "were"}` : ""}.` : `${plural(i.stats.month, "restock")} ${i.stats.month === 1 ? "has" : "have"} been logged ${where} in the last ${n} days (${i.stats.week} this week, ${i.stats.day} in the last 24 hours)${i.stats.soldouts ? `, along with ${plural(i.stats.soldouts, "sell-out")}` : ""}.`);
    if (i.kind === "store") {
      const bits = MODELS.map((m) => `the ${m.name} in ${i.stockNow[m.key] ?? 0} of ${i.configs?.[m.key] ?? 0} configurations`);
      s.push(`Right now it lists ${listWords(bits)}; we re-check it every 20 seconds.`);
    } else {
      const subject = i.kind === "state" ? `The ${plural(i.stores, "Apple Store")} in ${i.place}${i.cities && i.cities.length > 1 ? ` (${listWords(i.cities, 5)})` : ""}` : `The ${plural(i.stores, "Apple Store")} in ${i.place}`;
      const bits = MODELS.map((m) => { const k = i.stockNow[m.key] ?? 0; return `${k === 0 ? "none" : k === i.stores ? (i.stores === 1 ? "it" : "all of them") : k} ${k === 1 || i.stores === 1 ? "lists" : "list"} the ${m.name}`; });
      s.push(`${subject} ${i.stores === 1 ? "is" : "are"} re-checked every 20 seconds; right now ${listWords(bits)} for pickup.`);
    }
  }
  s.push(i.stats.medianMs == null ? `There are not enough restock-to-sell-out pairs yet to say how long stock lasts here.` : `Once a configuration comes back it typically stays available for about ${fmtDuration(i.stats.medianMs)} before selling out again.`);
  return s.join(" ");
}

/** "3 PM" for an hour-of-day bucket. */
export function fmtHour(h: number): string {
  return `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;
}

/** Peak local hour and weekday from the restock histograms; null below 5 events (too thin to call a pattern). */
export function peakOf(stats: { byHour: number[]; byWeekday: number[]; total: number }): { hour: string; day: string; total: number } | null {
  if (stats.total < 5) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const h = stats.byHour.indexOf(Math.max(...stats.byHour));
  const d = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  return { hour: fmtHour(Math.max(0, h)), day: days[Math.max(0, d)], total: stats.total };
}

/* ------------------------------------------------------------------ explainer & FAQ */

export interface FaqItem { q: string; a: string }

export const ALERT_RULE = "One alert covers one store, one model, one storage size and one colour — the exact configuration you will buy. Plus holds 10 alerts for $5 a month and Pro 20 for $10 a month; a push notification (or email) goes out within seconds of apple.com flipping to available.";

/** "How in-store pickup works at Apple {place}", 4–5 sentences. */
export function explainer(kind: "state" | "city" | "store" | "model", place: string): string[] {
  const at = kind === "store" ? place : kind === "model" ? "any Apple Store" : `Apple Stores in ${place}`;
  return [
    `Apple sells the iPhone for in-store pickup through apple.com: you choose a configuration, pick a store at checkout and pay online, then collect it at the Pickup counter — usually the same day. Stock for pickup is separate from the shelves and from carrier stores, and it appears store by store, often in small batches.`,
    `PickupChecker asks apple.com for the pickup status of every tracked configuration at ${at} every 20 seconds and keeps the answer: available, unavailable or unknown. A change only counts after a second confirming check, so a one-off glitch never becomes a false restock or a false sell-out.`,
    `Every real change is logged with its time, which is where the restock patterns and history on this page come from. "Checked … ago" counts the seconds since the last successful check${kind === "model" ? " of each store" : ""}.`,
    `When a configuration becomes available, the window is short — popular ones sell out in minutes — so the fastest route is an alert for the exact store and configuration you want, opened straight into apple.com checkout.`,
  ];
}

export interface FaqContext {
  kind: "state" | "city" | "store" | "model";
  place: string;
  stores: Store[];
  stockNow: Record<ModelKey, number>;
  /** Stores with Duo stock now (state/city), for the "which stores" answer. */
  duoStores?: Store[];
  stats: NarrativeStats;
  /** Peak hour label and weekday from RestockStats, when there are ≥5 events. */
  peak?: { hour: string; day: string; total: number } | null;
  nearest?: StoreWithDistance[];
  hours?: string;
  todayText?: string;
  /** Model pages: price range and option lists. */
  prices?: { low: number; high: number; storages: string[]; colors: string[] };
}

/** 4–6 data-driven questions per page type. */
export function faq(c: FaqContext): FaqItem[] {
  const duo = modelByKey(DEFAULT_MODEL)!;
  const n = c.stats.days;
  const out: FaqItem[] = [];
  const restockA = `${c.stats.month === 0 ? `No restock has been logged ${c.kind === "store" ? "at" : c.kind === "model" ? "for" : "in"} ${c.place} in the last ${n} days` : `In the last ${n} days we logged ${plural(c.stats.month, "restock")} ${c.kind === "store" ? "at" : c.kind === "model" ? "for" : "in"} ${c.place}, ${c.stats.week} of them this week`}. ${c.peak ? `Most of the ${c.peak.total} restocks arrived around ${c.peak.hour} local time, and ${c.peak.day}s were the busiest day.` : "There are too few events to call a time-of-day pattern yet; the chart on this page fills in as restocks happen."} Apple does not publish a restock schedule.`;
  const lastsA = c.stats.medianMs == null ? `We have not seen enough restock-to-sell-out pairs here to measure it yet. Nationwide, popular configurations are usually gone within minutes, which is why an alert matters more than refreshing.` : `Over the last ${n} days a configuration that came back stayed available for about ${fmtDuration(c.stats.medianMs)} (median) before selling out again. Nationwide, popular configurations are usually gone within minutes.`;
  const alertA = `Set an alert for the exact configuration and store. ${ALERT_RULE}`;
  if (c.kind === "model") {
    const now = c.stockNow[MODELS.find((m) => m.name === c.place)?.key ?? "duo"] ?? 0;
    out.push({ q: `Which Apple Stores have the ${c.place} in stock right now?`, a: now === 0 ? `As of the last check (every store is re-checked every 20 seconds), no Apple Store in the US lists the ${c.place} for in-store pickup. The list on this page updates as soon as one does.` : `As of the last check, ${plural(now, "Apple Store")} in the US ${now === 1 ? "lists" : "list"} the ${c.place} for in-store pickup; the list on this page names each one and the configurations it has.` });
    if (c.prices) out.push({ q: `How much does the ${c.place} cost?`, a: `The ${c.place} ranges from ${fmtPrice(c.prices.low)} to ${fmtPrice(c.prices.high)} unlocked, depending on storage (${c.prices.storages.join(", ")}). It comes in ${listWords(c.prices.colors)}. Pickup orders are paid on apple.com at the same price as shipping.` });
    out.push({ q: `How often does the ${c.place} restock?`, a: restockA });
    out.push({ q: `How long does ${c.place} stock last once it appears?`, a: lastsA });
    out.push({ q: `How do I get notified when the ${c.place} is available for pickup near me?`, a: alertA });
    out.push({ q: `Can I reserve the ${c.place} for pickup?`, a: `Apple does not take reservations without payment. When a store lists a configuration as available, you buy it on apple.com with in-store pickup selected and pick a time slot; it is then held for you. If checkout fails, someone else took the last unit.` });
    return out;
  }
  if (c.kind === "store") {
    const s = c.stores[0];
    out.push({ q: `Does ${c.place} have the ${duo.name} in stock?`, a: c.stockNow.duo > 0 ? `Yes — as of the last check, ${c.place} lists the ${duo.name} in ${plural(c.stockNow.duo, "configuration")} for in-store pickup. The table on this page shows exactly which storage and colour.` : `Not at the moment: the last check found no ${duo.name} configuration available for pickup at ${c.place}. ${c.stockNow["18-pro"] + c.stockNow["18-pro-max"] > 0 ? `It does list ${c.stockNow["18-pro"]} iPhone 18 Pro and ${c.stockNow["18-pro-max"]} 18 Pro Max configurations.` : "No 18 Pro or 18 Pro Max configuration is available either."}` });
    out.push({ q: `What are ${c.place}'s hours?`, a: `${c.hours ?? "Hours are listed on this page"}. ${c.todayText ? `Today: ${c.todayText}.` : ""} Pickup orders are collected during opening hours; the store is at ${fullAddress(s)}${s.phone ? `, phone ${s.phone}` : ""}.` });
    out.push({ q: `How often does ${c.place} restock the iPhone?`, a: restockA });
    out.push({ q: `How long does stock last at ${c.place}?`, a: lastsA });
    if (c.nearest?.length) out.push({ q: `What is the nearest other Apple Store to ${c.place}?`, a: `${listWords(c.nearest.slice(0, 3).map((x) => `Apple ${x.name} in ${x.city}, ${stateCodeOf(x)} (${Math.round(x.distance)} mi)`))}. Each has its own page with live stock, and a Pro plan can watch several stores at once.` });
    out.push({ q: `How do I get an alert for ${c.place}?`, a: alertA });
    return out;
  }
  const label = c.kind === "state" ? c.place : c.place;
  const duoNow = c.duoStores ?? [];
  out.push({ q: `Which Apple Stores in ${label} have the ${duo.name} in stock right now?`, a: duoNow.length === 0 ? `None at the last check: no Apple Store in ${label} currently lists the ${duo.name} for in-store pickup. Every store is re-checked every 20 seconds and this page updates the moment one does.` : `As of the last check, ${plural(duoNow.length, "store")} in ${label} ${duoNow.length === 1 ? "lists" : "list"} the ${duo.name} for pickup: ${listWords(duoNow.map((x) => `Apple ${x.name}`))}.` });
  out.push({ q: `How many Apple Stores are there in ${label}?`, a: `${plural(c.stores.length, "Apple Store")}: ${listWords(c.stores.map((x) => `Apple ${x.name}${c.kind === "state" ? ` in ${x.city}` : ""}`), 8)}. All of them offer in-store pickup for the iPhone and all are tracked here.` });
  out.push({ q: `How often do ${label} Apple Stores restock the iPhone?`, a: restockA });
  out.push({ q: `How long does stock last in ${label}?`, a: lastsA });
  if (c.nearest?.length) out.push({ q: `What is the closest Apple Store outside ${label}?`, a: `${listWords(c.nearest.slice(0, 3).map((x) => `Apple ${x.name} in ${x.city}, ${stateCodeOf(x)} (${Math.round(x.distance)} mi)`))}. Those stores restock independently, so watching one of them widens your chances.` });
  out.push({ q: `How do I get notified when a store in ${label} gets the ${duo.name}?`, a: alertA });
  return out;
}

/* ------------------------------------------------------------------ JSON-LD */

const BASE = "https://pickupchecker.com";

export function faqJsonLd(items: FaqItem[]) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })) };
}

export function itemListJsonLd(name: string, stores: Store[]) {
  return { "@context": "https://schema.org", "@type": "ItemList", name, numberOfItems: stores.length, itemListElement: stores.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: `Apple ${s.name}`, url: `${BASE}${storePath(s)}` })) };
}

export function storeJsonLd(s: Store, week: DayHours[]) {
  return {
    "@context": "https://schema.org", "@type": "Store", name: `Apple ${s.name}`, url: `${BASE}${storePath(s)}`, sameAs: s.url, brand: { "@type": "Brand", name: "Apple" },
    address: { "@type": "PostalAddress", streetAddress: (s.street ?? "").trim(), addressLocality: s.city, addressRegion: s.state, postalCode: s.postalCode, addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng }, telephone: s.phone, image: s.image,
    hasMap: directionsUrl(s), openingHoursSpecification: openingHoursSpec(week),
  };
}

export function productJsonLd(model: ModelKey, inStockStores: number) {
  const m = modelByKey(model)!;
  const items = catalogFor(model);
  const prices = items.map((i) => i.price);
  return {
    "@context": "https://schema.org", "@type": "Product", name: m.name, brand: { "@type": "Brand", name: "Apple" }, url: `${BASE}/stock/${m.slug}`,
    description: `${m.name} in-store pickup availability at every US Apple Store, checked every 20 seconds.`,
    offers: { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: items.length, availability: inStockStores > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", seller: { "@type": "Organization", name: "Apple" } },
  };
}

/* ------------------------------------------------------------------ titles & descriptions (≤ 60 chars before the " · PickupChecker" template) */

export function fitTitle(variants: string[], max = 60): string {
  for (const v of variants) if (v.length <= max) return v;
  const last = variants[variants.length - 1] ?? "";
  return last.length <= max ? last : `${last.slice(0, max - 1).trimEnd()}…`;
}

export function stateTitle(name: string, duoNow: number, stores: number): string {
  return fitTitle([
    `Apple Stores in ${name}: ${duoNow} of ${stores} have the iPhone Duo now`,
    `Apple Stores in ${name} – iPhone Duo pickup stock, live`,
    `Apple Stores in ${name} – iPhone Duo stock`,
    `${name} Apple Stores – iPhone stock`,
  ]);
}

export function cityTitle(city: string, code: string, duoNow: number, stores: number): string {
  return fitTitle([
    `Apple Stores in ${city}, ${code}: ${duoNow} of ${stores} have the iPhone Duo`,
    `Apple Stores in ${city}, ${code} – iPhone Duo pickup stock`,
    `Apple Stores in ${city}, ${code} – iPhone Duo stock`,
    `${city} Apple Stores – iPhone stock`,
  ]);
}

export function storeTitle(s: Pick<Store, "name" | "city">, code: string, duoConfigs: number): string {
  return fitTitle([
    `Apple ${s.name}, ${s.city} ${code}: ${duoConfigs} iPhone Duo configs in stock`,
    `Apple ${s.name}, ${s.city} ${code} – iPhone Duo pickup stock`,
    `Apple ${s.name}, ${s.city} – iPhone Duo stock`,
    `Apple ${s.name} – iPhone pickup stock`,
    `Apple ${s.name} – stock`,
  ]);
}

export function modelTitle(name: string, storesNow: number): string {
  return fitTitle([
    `${name} pickup stock: ${storesNow} Apple Stores have it right now`,
    `${name} pickup stock: ${storesNow} Apple Stores have it now`,
    `${name} in-store pickup stock, live`,
  ]);
}
