/**
 * English strings: account (dashboard page, restock modules on it, install / checkout / pricing pages). Numbers reach
 * these functions raw and print as the site always has; another language may format them (format.num …). Strings
 * with **bold** / [label](href) render through <Md>.
 */
import { SPEED, SPEED_PERKS } from "@/lib/plans";

const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** A plan's alert limit and monthly price in USD (pricing table). */
export interface Tier { limit: number; price: number }

export const account = {
  loading: "Loading",
  meta: { title: "My alerts" },
  signedInAs: (email: string) => `Signed in as ${email}`,
  title: "My alerts",
  /** Short units under the big numbers. */
  units: { s: "s", min: "min", taps: "taps" },

  plan: {
    title: "Plan",
    none: "No plan yet: alerts are off",
    /** "Plus · 3 of 10 alerts on", then " · renews Dec 1" or " · ends Dec 1" ({date} arrives formatted). */
    summary: (plan: string, on: number, limit: number) => `${plan} · ${on} of ${limit} alerts on`,
    renews: (date: string) => ` · renews ${date}`,
    ends: (date: string) => ` · ends ${date}`,
  },

  sent: {
    title: "Sent alerts",
    last: (ago: string) => `Last one ${ago}`,
    none: "Nothing sent yet",
    empty: "Nothing sent yet.",
    channel: { push: "notification", email: "email" } as Record<string, string>,
    status: { sent: "sent", delivered: "delivered", failed: "failed", skipped: "skipped" } as Record<string, string>,
  },

  /** "Reserve it in 20 seconds" (FastCheckoutCard). */
  fast: {
    title: "Reserve it in 20 seconds",
    sub: "do everything but the last four taps now",
    lasts: "a typical Duo listing lasts",
    push: "confirmed → push sent (arrival not measured)",
    tapsLeft: "left for you once the push lands",
    steps: [
      { title: "Find your window", hint: "your stores' hours, below · staged 10 min early" },
      { title: "Stage Apple's checkout", hint: "exact storage + colour → Delivery & Pickup" },
      { title: "Tick terms · or go unlocked", hint: "unlocked, paid in full: no box at all" },
      { title: "Keep it awake", hint: "Auto-Lock → Never · touch it every 10–15 min" },
      { title: "Alert: read, don't tap", hint: "Pickup → the store named → first slot → Apple Pay" },
    ],
    guide: "The 2-minute guide",
    window: "Your restock window",
  },

  /**
   * "When your stores restock" and "How fast your restocks sell out" (RestockTimes). {zone}: "Eastern" in English
   * (so "… time" follows it); in other languages the full Intl zone name ("日本標準時"), which already says "time".
   * Hours ("9 AM") arrive formatted.
   */
  restock: {
    /** "Restock by restock" on the dashboard: each restock against the member's alerts (lib/alertMarks.ts). */
    mark: { delivered: "Alert delivered", sent: "Alert sent", other: "Not in your alerts", before: "Before your alert" },
    title: "When your stores restock",
    /** Every model: "iPhone"; otherwise the models' names joined. */
    anyIphone: "iPhone",
    and: " and ",
    yours: (n: number) => (n === 1 ? "your store" : `your ${n} stores`),
    Yours: (n: number) => (n === 1 ? "Your store" : `Your ${n} stores`),
    otherStores: (n: number) => s(n, "other store"),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${s(stores, "store")} · last ${days} days · ${zone} time`,
    busiest: (yours: string, then: string | null) => (then ? `busiest hour at ${yours} · then ${then}` : `busiest hour at ${yours}`),
    busiestArea: (stores: number, zone: string) => `busiest across all ${stores} stores on ${zone} time`,
    next: (inHours: number) => `next window · ${inHours === 0 ? "this hour" : `in ${inHours} h`}`,
    typical: "typical listing before it sells out",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `no restocks at ${yours} yet · last ${days} days` : `restocks at ${yours} · last ${days} days${pattern ? "" : " · too few for a pattern"}`),
    byHour: (busiestInGreen: boolean) => `By hour${busiestInGreen ? " · busiest in green" : ""}`,
    byWeekday: (busiest: string | null) => `By weekday${busiest ? ` · busiest ${busiest}` : ""}`,
    /** Screen-reader summary of a chart; {items} are "9 AM 2" / "Monday 1" joined. */
    hourChart: (yours: string, zone: string, items: string) => `Restocks by hour at ${yours}, ${zone} time: ${items}`,
    weekdayChart: (yours: string, items: string) => `Restocks by weekday at ${yours}: ${items}`,
    chartItem: (label: string, n: number, reported: number) => `${label} ${n}${reported ? ` (+${reported} reported by other trackers)` : ""}`,
    /** Tooltip over one bar: "10–11 AM: 2 restocks at your store · 5 across Eastern time · 1 reported by other trackers". */
    barTitle: (label: string, n: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${s(n, "restock")} at ${yours}${area ? ` · ${area.n} across ${area.zone} time` : ""}${reported ? ` · ${reported} reported by other trackers` : ""}`,
    now: "now",
    allZone: (stores: number, zone: string) => `All ${stores} stores on ${zone} time`,
    /** Starts the other trackers' footnote under the charts. */
    reportMarkBars: "Dashed",
    reportMarkDots: "Hollow dots",
    sellTitle: "How fast your restocks sell out",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${s(stores, "store")} · last ${days} days`,
    /** Completes "A typical iPhone Duo restock … sold out in about 60–80 seconds". */
    sellLabel: (yours: string) => `at ${yours}`,
  },

  /** /checkout/success. */
  success: {
    metaTitle: "Alerts are on",
    isOn: (plan: string) => `${plan} is on`,
    yourPlan: "Your plan",
    received: "Payment received",
    onPlan: (limit: number) => `${limit} alerts on your plan.`,
    planOn: "Your plan is on.",
    pending: "Your subscription will appear in your account within a minute.",
    open: "Open my alerts",
    another: "Add another alert",
    saved: (n: number) => `${n} alert${n === 1 ? "" : "s"} saved · receipt from Stripe`,
    pushOn: "Notifications",
    pushNext: "Next: alerts on your phone",
  },

  /** /install (the guide itself is client: cdict install). */
  install: {
    metaTitle: "Get the app — restock alerts on your Home Screen",
    metaDescription: "Add PickupChecker to your Home Screen and get a notification the moment an iPhone Duo, 18 Pro or Pro Max is in stock for pickup near you.",
  },

  /** /pricing. Plan names and dollar amounts are not translated (billing is in USD everywhere). */
  pricing: {
    metaTitle: "Pricing — 10 alerts $5, 20 for $10, 50 for $20",
    metaDescription: `iPhone pickup-stock alerts at every US Apple Store: your stores checked every ${SPEED.fastSec} seconds, a push about ${SPEED.alertSec} seconds after a restock. Plus $5/month for 10 alerts, Pro $10 for 20, Max $20 for 50. Cancel anytime.`,
    title: "Pricing",
    lead: "**One alert = one store × one exact iPhone.** Browsing is free.",
    chips: ["All 269 US Apple Stores", "Cancel anytime", "Card or Link"],
    /**
     * The speed block (2026-11-09): what every plan gets, planned and then measured (content/serviceStats.ts) on the
     * same basis, instead of a "fastest" claim. Values arrive formatted ("5.0 s"). A push accepted by Apple's or
     * Google's push service is not arrival on the phone: never word it as "to your phone".
     */
    speedTitle: "How fast is it? Planned, then measured",
    /** The quotable answer. {p50}, {p95}: seconds between two answers for a store with a paid alert, US, last 7 days. */
    speedAnswer: (v: { p50: string; p95: string }) => `Stores your alerts point at are planned every ${SPEED.fastSec} seconds. Measured over the last 7 days in the US, the gap between two answers for such a store was **${v.p50}** at the median and ${v.p95} at the 95th percentile. Every plan gets the same lanes.`,
    /** No week of measurements yet. */
    speedPlanned: `Stores your alerts point at are planned every ${SPEED.fastSec} seconds, every other store every ${SPEED.checkSec}. Measured figures appear here once a week of checks is recorded. Every plan gets the same lanes.`,
    planned: `Planned: your stores every **${SPEED.fastSec} s**, every store every **${SPEED.checkSec} s**`,
    /** Outside the US, last 7 days; `above`: the median is over the plan (say so). */
    intl: (v: { p50: string; p95: string; above: boolean }) => `Outside the US: median **${v.p50}**, 95th percentile ${v.p95}${v.above ? `, slower than the ${SPEED.fastSec}-second plan` : ""}`,
    /** First check that saw stock → push accepted by the push service, last 7 days; {n}: restocks. */
    push: (v: { p50: string; p90: string; n: string }) => `First check that saw stock → push accepted by Apple's or Google's push service: median **${v.p50}**, 90th percentile ${v.p90} (${v.n} restocks, 7 days)`,
    pushPending: "Alert timing appears here once a week of alerts is recorded",
    notMeasured: "Arrival on your phone is not measured: the push services don't report it back",
    /** {band}: band(…) or aboutMinute; {n}: restocks in the last 7 days. "Listed for", never "sells out in". */
    listingLine: (band: string, n: string) => `Apple's pickup page listed a typical iPhone Duo restock for **${band}** (median of ${n} restocks, 7 days)`,
    band: (range: string) => `${range} seconds`,
    aboutMinute: "about a minute",
    report: "[Service report](/service-report): every lane over 24 hours, 7 and 30 days, with samples and limits",
    /** Tile labels under the big numbers. */
    gapTile: "your stores: median gap between checks, 7 days",
    plannedTile: "your stores: planned check interval",
    pushTile: "first sighting → push service, median, 7 days",
    pushTilePending: "first sighting → push service: measuring",
    listing: "typical Duo listing on Apple's pickup page, median",
    note: { plus: "1 iPhone × 10 stores", pro: "2 iPhones × 10 stores", max: "5 iPhones × 10 stores" } as Record<string, string>,
    month: "/ month",
    alerts: (n: number) => s(n, "alert"),
    perks: [...SPEED_PERKS] as string[],
    cancel: "Cancel anytime",
    get: (plan: string) => `Get ${plan}`,
    /** "Do you need a plan?": who does not, who does (answer first). Links in [label](href). */
    needTitle: "Do you need a plan?",
    needAnswer: "Often not. A plan pays off when you want one exact iPhone at stores you can reach, can't keep checking yourself, and its restocks don't stay listed for long. Live stock, the map, the restock log, every store page and the public API stay free, with no account.",
    skipTitle: "You don't need one if",
    skip: [
      "You're browsing live stock, the map or the restock log",
      "Your store is one you can walk into any time: open its page before you go",
      "You're flexible on configuration: store pages list everything in stock right now",
      "You want the data: the [free public API](/iphone-duo-stock-api) has the same live stock",
    ] as string[],
    helpsTitle: "A plan helps if",
    helps: [
      "You want one exact configuration and its restocks are gone within minutes",
      "You can't keep a tab open: a push is sent once two matching checks confirm a restock",
      "You watch several stores or configurations at once",
    ] as string[],
    tool: "Not sure which stores or colours? The [alert setup](/#notify) shows how many past pickup windows your picks had and which change would have added the most, free.",
    /** The alerts table: configurations × stores → the plan that holds it (plans.ts PLANS). */
    tableTitle: "How many alerts do you need?",
    /** Each plan's alert limit and monthly price in USD (PLANS). */
    tableAnswer: (plus: Tier, pro: Tier, max: Tier) => `Alerts = configurations × stores. Up to ${plus.limit} alerts, such as one iPhone at ${plus.limit} stores, is Plus at $${plus.price} a month; up to ${pro.limit} is Pro at $${pro.price}; up to ${max.limit} is Max at $${max.price}. Past ${max.limit}, no plan holds it, so narrow the stores or the configurations.`,
    corner: "iPhones ↓ · stores →",
    configsN: (n: number) => s(n, "iPhone"),
    storesN: (n: number) => s(n, "store"),
    noPlan: "No plan holds it",
    tableNote: "One alert = one store × one exact configuration (model, storage, colour). Any plan watches any mix, up to its number.",
    billing: "Stripe billing · card or Link · upgrades prorated, downgrades from the next renewal",
    /** The refund policy line, as published (no other refund wording anywhere). */
    refund: "Not for you? [Full refund within 7 days](/refunds) if no restock alert has reached you yet",
  },
};
