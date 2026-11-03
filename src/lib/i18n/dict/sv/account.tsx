/**
 * Swedish strings: account (dashboard, its restock modules, install / checkout / pricing pages). Plan names and
 * dollar amounts stay as they are (billing is in USD everywhere). Strings with **bold** / [label](href) render
 * through <Md>.
 */
import type { Dict } from "../en";
import { n, pl } from "./util";

export const account: Dict["account"] = {
  loading: "Laddar",
  meta: { title: "Mina bevakningar" },
  signedInAs: (email: string) => `Inloggad som ${email}`,
  title: "Mina bevakningar",
  units: { s: "s", min: "min", taps: "tryck" },

  plan: {
    title: "Plan",
    none: "Ingen plan än: bevakningarna är av",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${on} av ${limit} bevakningar på`,
    renews: (date: string) => ` · förnyas ${date}`,
    ends: (date: string) => ` · slutar ${date}`,
  },

  sent: {
    title: "Skickade notiser",
    last: (ago: string) => `Senaste ${ago}`,
    none: "Inget skickat än",
    empty: "Inget skickat än.",
    channel: { push: "notis", email: "mejl" } as Record<string, string>,
    status: { sent: "skickad", failed: "misslyckades", skipped: "hoppades över" } as Record<string, string>,
  },

  fast: {
    title: "Reservera på 20 sekunder",
    sub: "gör allt utom de fyra sista trycken nu",
    lasts: "så länge ligger en typisk Duo ute",
    push: "bekräftad → notis i din telefon",
    tapsLeft: "kvar för dig när notisen kommer",
    steps: [
      { title: "Hitta ditt fönster", hint: "dina butikers tider, nedan · var redo 10 min innan" },
      { title: "Förbered Apples kassa", hint: "exakt lagring + färg → Leverans och hämtning" },
      { title: "Bocka i villkor · eller köp olåst", hint: "olåst, betald i sin helhet: ingen ruta alls" },
      { title: "Håll skärmen vaken", hint: "Automatiskt lås → Aldrig · rör den var 10–15:e min" },
      { title: "Notis: läs, tryck inte", hint: "Hämta i butik → butiken som nämns → första tiden → Apple Pay" },
    ],
    guide: "Guiden på 2 minuter",
    window: "Ditt påfyllningsfönster",
  },

  restock: {
    title: "När dina butiker fyller på",
    anyIphone: "iPhone",
    and: " och ",
    yours: (k: number) => (k === 1 ? "din butik" : `dina ${k} butiker`),
    Yours: (k: number) => (k === 1 ? "Din butik" : `Dina ${k} butiker`),
    otherStores: (k: number) => pl(k, "annan butik", "andra butiker"),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${pl(stores, "butik", "butiker")} · senaste ${days} dagarna · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `flest påfyllningar i ${yours} · sedan ${then}` : `flest påfyllningar i ${yours}`),
    busiestArea: (stores: number, zone: string) => `flest i alla ${stores} butiker inom ${zone}`,
    next: (inHours: number) => `nästa fönster · ${inHours === 0 ? "den här timmen" : `om ${inHours} tim`}`,
    typical: "så länge ligger en typisk påfyllning ute innan den tar slut",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `inga påfyllningar i ${yours} än · senaste ${days} dagarna` : `påfyllningar i ${yours} · senaste ${days} dagarna${pattern ? "" : " · för få för ett mönster"}`),
    byHour: (busiestInGreen: boolean) => `Per timme${busiestInGreen ? " · flest i grönt" : ""}`,
    byWeekday: (busiest: string | null) => `Per veckodag${busiest ? ` · flest på ${busiest}ar` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `Påfyllningar per timme i ${yours}, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `Påfyllningar per veckodag i ${yours}: ${items}`,
    chartItem: (label: string, k: number, reported: number) => `${label} ${n(k)}${reported ? ` (+${reported} rapporterade av andra bevakningstjänster)` : ""}`,
    barTitle: (label: string, k: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${pl(k, "påfyllning", "påfyllningar")} i ${yours}${area ? ` · ${area.n} inom hela ${area.zone}` : ""}${reported ? ` · ${reported} rapporterade av andra bevakningstjänster` : ""}`,
    now: "nu",
    allZone: (stores: number, zone: string) => `Alla ${stores} butiker inom ${zone}`,
    reportMarkBars: "Streckade",
    reportMarkDots: "Ihåliga prickar",
    sellTitle: "Hur snabbt dina påfyllningar tar slut",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${pl(stores, "butik", "butiker")} · senaste ${days} dagarna`,
    sellLabel: (yours: string) => `i ${yours}`,
  },

  success: {
    metaTitle: "Bevakningarna är på",
    isOn: (plan: string) => `${plan} är aktiv`,
    yourPlan: "Din plan",
    received: "Betalningen har kommit in",
    onPlan: (limit: number) => `${limit} bevakningar ingår i din plan.`,
    planOn: "Din plan är aktiv.",
    pending: "Ditt abonnemang syns på ditt konto inom en minut.",
    open: "Öppna mina bevakningar",
    another: "Lägg till en bevakning till",
    saved: (k: number) => `${pl(k, "bevakning sparad", "bevakningar sparade")} · kvitto från Stripe`,
    pushOn: "Notiser",
    pushNext: "Nästa steg: notiser i din telefon",
  },

  install: {
    metaTitle: "Skaffa appen – notis om iPhone i lager på din hemskärm",
    metaDescription: "Lägg till PickupChecker på hemskärmen och få en notis i samma stund som en iPhone Duo, 18 Pro eller Pro Max finns att hämta i en butik nära dig.",
  },

  pricing: {
    metaTitle: "Priser – 10 bevakningar $5, 20 för $10, 50 för $20",
    metaDescription: "Notis när iPhone finns att hämta i Apple Store: dina butiker kollas var 5:e sekund, notis cirka 3 sekunder efter en påfyllning. Plus $5/mån för 10 bevakningar, Pro $10 för 20, Max $20 för 50. Avsluta när du vill.",
    title: "Priser",
    lead: "**En bevakning = en butik × en exakt iPhone.** Att titta är gratis.",
    chips: ["Alla Apple Store-butiker", "Avsluta när du vill", "Kort eller Link"],
    fastest: "Det snabbaste publicerade kontrollintervallet bland iPhone-lagerkollar",
    everyFast: "Dina butiker **var 5:e sekund** · andra tjänster uppger från 8 sekunder till 15 minuter",
    sellsOut: (band: string) => `En typisk påfyllning av iPhone Duo tar slut på **${band}**, vissa på 20–30 sekunder`,
    band: (r: string) => `${r} sekunder`,
    aboutMinute: "ungefär en minut",
    sameSpeed: "Alla planer har samma hastighet",
    rechecked: "dina butiker kollas om",
    toPhone: "från bekräftad påfyllning till din telefon",
    listing: "typisk tid i lager för en Duo, från listad till borta",
    note: { plus: "1 iPhone × 10 butiker", pro: "2 iPhone × 10 butiker", max: "5 iPhone × 10 butiker" } as Record<string, string>,
    month: "/ månad",
    alerts: (k: number) => `${k} bevakningar`,
    perks: ["Dina butiker kollas var 5:e sekund, alla butiker var 15:e", "Notis cirka 3 s efter en bekräftad påfyllning"],
    cancel: "Avsluta när du vill",
    get: (plan: string) => `Välj ${plan}`,
    billing: "Fakturering via Stripe · kort eller Link · planbyten räknas om proportionellt",
    refund: "Inte något för dig? [Full återbetalning inom 7 dagar](/refunds) om ingen notis om påfyllning har nått dig än",
  },
};
