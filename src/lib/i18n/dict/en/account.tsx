/**
 * English strings: account (dashboard page, restock modules on it, install / checkout / pricing pages). Numbers reach
 * these functions raw and print as the site always has; another language may format them (format.num …). Strings
 * with **bold** / [label](href) render through <Md>.
 */
import { OTHER_TRACKERS, SPEED, SPEED_PERKS } from "@/lib/plans";

const s = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

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
    status: { sent: "sent", failed: "failed", skipped: "skipped" } as Record<string, string>,
  },

  /** "Reserve it in 20 seconds" (FastCheckoutCard). */
  fast: {
    title: "Reserve it in 20 seconds",
    sub: "do everything but the last four taps now",
    lasts: "a typical Duo listing lasts",
    push: "confirmed → push on your phone",
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
    fastest: "The fastest published check interval of any iPhone stock tracker",
    everyFast: `Your stores every **${SPEED.fastSec} seconds** · other trackers publish ${OTHER_TRACKERS}`,
    /** {band} is "60–80 seconds" or "about a minute". */
    sellsOut: (band: string) => `A typical iPhone Duo restock sells out in **${band}**, some in 20–30 seconds`,
    band: (range: string) => `${range} seconds`,
    aboutMinute: "about a minute",
    sameSpeed: "Every plan gets the same speed",
    rechecked: "your stores re-checked",
    toPhone: "confirmed restock to your phone",
    listing: "typical Duo listing, listed to gone",
    note: { plus: "1 iPhone × 10 stores", pro: "2 iPhones × 10 stores", max: "5 iPhones × 10 stores" } as Record<string, string>,
    month: "/ month",
    alerts: (n: number) => `${n} alerts`,
    perks: [...SPEED_PERKS] as string[],
    cancel: "Cancel anytime",
    get: (plan: string) => `Get ${plan}`,
    billing: "Stripe billing · card or Link · plan changes prorated",
    /** The refund policy line, as published (no other refund wording anywhere). */
    refund: "Not for you? [Full refund within 7 days](/refunds) if no restock alert has reached you yet",
  },
};
