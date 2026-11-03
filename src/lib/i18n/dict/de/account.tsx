/**
 * German strings: account (dashboard page, its restock modules, install / checkout / pricing pages). Plan names
 * and dollar amounts are not translated (billing is in USD everywhere).
 */
import type { Dict } from "../en";
import { n, plural } from "./util";

const stores = (k: number) => plural(k, "Store", "Stores");

export const account: Dict["account"] = {
  loading: "Wird geladen",
  meta: { title: "Meine Alarme" },
  signedInAs: (email: string) => `Angemeldet als ${email}`,
  title: "Meine Alarme",
  units: { s: "Sek.", min: "Min.", taps: "Taps" },

  plan: {
    title: "Tarif",
    none: "Noch kein Tarif: Alarme sind aus",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${n(on)} von ${n(limit)} Alarmen an`,
    renews: (date: string) => ` · verlängert sich am ${date}`,
    ends: (date: string) => ` · endet am ${date}`,
  },

  sent: {
    title: "Gesendete Alarme",
    last: (ago: string) => `Zuletzt ${ago}`,
    none: "Noch nichts gesendet",
    empty: "Noch nichts gesendet.",
    channel: { push: "Mitteilung", email: "E-Mail" } as Record<string, string>,
    status: { sent: "gesendet", failed: "fehlgeschlagen", skipped: "übersprungen" } as Record<string, string>,
  },

  fast: {
    title: "In 20 Sekunden reserviert",
    sub: "jetzt alles erledigen außer den letzten vier Taps",
    lasts: "so lange hält ein typisches Duo-Angebot",
    push: "bestätigt → Push auf Ihrem Handy",
    tapsLeft: "bleiben Ihnen, wenn der Push kommt",
    steps: [
      { title: "Ihr Zeitfenster finden", hint: "Öffnungszeiten Ihrer Stores unten · 10 Min. vorher bereit" },
      { title: "Apples Checkout vorbereiten", hint: "genauer Speicher + Farbe → Lieferung & Abholung" },
      { title: "Bedingungen abhaken · oder ohne Vertrag", hint: "ohne Vertrag, voll bezahlt: gar kein Häkchen" },
      { title: "Wach halten", hint: "Automatische Sperre → Nie · alle 10–15 Min. antippen" },
      { title: "Alarm: lesen, nicht tippen", hint: "Abholung → der genannte Store → erstes Zeitfenster → Apple Pay" },
    ],
    guide: "Die 2-Minuten-Anleitung",
    window: "Ihr Restock-Zeitfenster",
  },

  restock: {
    title: "Wann Ihre Stores wieder vorrätig sind",
    anyIphone: "iPhone",
    and: " und ",
    yours: (k: number) => (k === 1 ? "Ihrem Store" : `Ihren ${n(k)} Stores`),
    Yours: (k: number) => (k === 1 ? "Ihr Store" : `Ihre ${n(k)} Stores`),
    otherStores: (k: number) => (k === 1 ? "1 anderen Store" : `${n(k)} anderen Stores`),
    meta: (what: string, k: number, days: number, zone: string) => `${what} · ${stores(k)} · letzte ${days} Tage · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `stärkste Stunde in ${yours} · danach ${then}` : `stärkste Stunde in ${yours}`),
    busiestArea: (k: number, zone: string) => `am stärksten über alle ${n(k)} Stores (${zone})`,
    next: (inHours: number) => `nächstes Zeitfenster · ${inHours === 0 ? "diese Stunde" : `in ${inHours} Std.`}`,
    typical: "typische Dauer, bis ausverkauft",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `noch keine Restocks in ${yours} · letzte ${days} Tage` : `Restocks in ${yours} · letzte ${days} Tage${pattern ? "" : " · zu wenige für ein Muster"}`),
    byHour: (busiestInGreen: boolean) => `Nach Uhrzeit${busiestInGreen ? " · stärkste in Grün" : ""}`,
    byWeekday: (busiest: string | null) => `Nach Wochentag${busiest ? ` · am stärksten ${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `Restocks nach Uhrzeit in ${yours}, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `Restocks nach Wochentag in ${yours}: ${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${n(k)}${reported ? ` (+${n(reported)} von anderen Trackern gemeldet)` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${plural(k, "Restock", "Restocks")} in ${yours}${area ? ` · ${n(area.n)} insgesamt (${area.zone})` : ""}${reported ? ` · ${n(reported)} von anderen Trackern gemeldet` : ""}`,
    now: "jetzt",
    allZone: (k: number, zone: string) => `Alle ${n(k)} Stores (${zone})`,
    reportMarkBars: "Gestrichelt",
    reportMarkDots: "Hohle Punkte",
    sellTitle: "Wie schnell Ihre Restocks ausverkauft sind",
    sellMeta: (what: string, k: number, days: number) => `${what} · ${stores(k)} · letzte ${days} Tage`,
    sellLabel: (yours: string) => `in ${yours}`,
  },

  success: {
    metaTitle: "Alarme sind an",
    isOn: (plan: string) => `${plan} ist aktiv`,
    yourPlan: "Ihr Tarif",
    received: "Zahlung erhalten",
    onPlan: (limit: number) => `${n(limit)} Alarme in Ihrem Tarif.`,
    planOn: "Ihr Tarif ist aktiv.",
    pending: "Ihr Abo erscheint innerhalb einer Minute in Ihrem Konto.",
    open: "Meine Alarme öffnen",
    another: "Weiteren Alarm einrichten",
    saved: (k: number) => `${plural(k, "Alarm", "Alarme")} gespeichert · Beleg von Stripe`,
    pushOn: "Mitteilungen",
    pushNext: "Als Nächstes: Alarme auf Ihrem Handy",
  },

  install: {
    metaTitle: "App holen – Restock-Alarme auf dem Home-Bildschirm",
    metaDescription: "Fügen Sie PickupChecker zum Home-Bildschirm hinzu und bekommen Sie eine Mitteilung, sobald ein iPhone Duo, 18 Pro oder Pro Max in Ihrer Nähe zur Abholung verfügbar ist.",
  },

  pricing: {
    metaTitle: "Preise – 10 Alarme für $5, 20 für $10, 50 für $20",
    metaDescription: "iPhone-Alarme zur Abholung im Apple Store: Ihre Stores alle 5 Sekunden geprüft, ein Push etwa 3 Sekunden nach einem Restock. Plus $5/Monat für 10 Alarme, Pro $10 für 20, Max $20 für 50. Jederzeit kündbar.",
    title: "Preise",
    lead: "**Ein Alarm = ein Store × ein exaktes iPhone.** Stöbern ist kostenlos.",
    chips: ["Alle Apple Stores in Deutschland, Österreich und der Schweiz", "Jederzeit kündbar", "Karte oder Link"],
    fastest: "Das schnellste veröffentlichte Prüfintervall aller iPhone-Tracker",
    everyFast: "Ihre Stores alle **5 Sekunden** · andere Tracker nennen 8 Sekunden bis 15 Minuten",
    sellsOut: (band: string) => `Ein typischer iPhone-Duo-Restock ist in **${band}** ausverkauft, manche in 20–30 Sekunden`,
    band: (range: string) => `${range} Sekunden`,
    aboutMinute: "etwa einer Minute",
    sameSpeed: "Jeder Tarif hat dasselbe Tempo",
    rechecked: "Ihre Stores erneut geprüft",
    toPhone: "bestätigter Restock bis aufs Handy",
    listing: "typisches Duo-Angebot, gelistet bis weg",
    note: { plus: "1 iPhone × 10 Stores", pro: "2 iPhones × 10 Stores", max: "5 iPhones × 10 Stores" } as Record<string, string>,
    month: "/ Monat",
    alerts: (k: number) => `${n(k)} Alarme`,
    perks: ["Ihre Stores alle 5 Sek. geprüft, jeder Store alle 15 Sek.", "Push etwa 3 Sek. nach einem bestätigten Restock"] as string[],
    cancel: "Jederzeit kündbar",
    get: (plan: string) => `${plan} wählen`,
    billing: "Abrechnung über Stripe · Karte oder Link · Tarifwechsel anteilig",
    refund: "Doch nichts für Sie? [Volle Rückerstattung innerhalb von 7 Tagen](/refunds), solange Sie noch keinen Restock-Alarm erhalten haben",
  },
};
