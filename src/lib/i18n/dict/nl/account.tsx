/**
 * Dutch strings: account (dashboard page, restock modules on it, install / checkout / pricing pages). Plan names and
 * dollar amounts stay as they are: billing is in US dollars everywhere.
 */
import { SPEED } from "@/lib/plans";
import { num } from "@/lib/i18n/format";
import type { Dict } from "../en";

const L = "nl" as const;
const n$ = (v: number) => num(L, v);
const cnt = (n: number, one: string, many: string) => `${n$(n)} ${n === 1 ? one : many}`;

export const account: Dict["account"] = {
  loading: "Laden",
  meta: { title: "Mijn alerts" },
  signedInAs: (email: string) => `Ingelogd als ${email}`,
  title: "Mijn alerts",
  units: { s: "sec.", min: "min", taps: "tikken" },

  plan: {
    title: "Abonnement",
    none: "Nog geen abonnement: alerts staan uit",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${n$(on)} van ${n$(limit)} alerts aan`,
    renews: (date: string) => ` · verlengt op ${date}`,
    ends: (date: string) => ` · loopt af op ${date}`,
  },

  sent: {
    title: "Verstuurde alerts",
    last: (ago: string) => `Laatste ${ago}`,
    none: "Nog niets verstuurd",
    empty: "Nog niets verstuurd.",
    channel: { push: "melding", email: "e-mail" } as Record<string, string>,
    status: { sent: "verstuurd", failed: "mislukt", skipped: "overgeslagen" } as Record<string, string>,
  },

  fast: {
    title: "Reserveer hem in 20 seconden",
    sub: "doe nu alles behalve de laatste vier tikken",
    lasts: "zo lang blijft een Duo meestal te koop",
    push: "bevestigd → push op je telefoon",
    tapsLeft: "voor jou over zodra de push binnenkomt",
    steps: [
      { title: "Ken je tijdvak", hint: "openingstijden van je winkels hieronder · 10 min van tevoren klaarzetten" },
      { title: "Zet Apples afrekenpagina klaar", hint: "exacte opslag + kleur → Levering en ophalen" },
      { title: "Voorwaarden aanvinken · of simlockvrij", hint: "simlockvrij, in één keer betaald: geen vakje te zien" },
      { title: "Houd je scherm wakker", hint: "Automatische vergrendeling → Nooit · raak het elke 10–15 min aan" },
      { title: "Alert: lees, tik niet", hint: "Ophalen → de genoemde winkel → eerste tijdvak → Apple Pay" },
    ],
    guide: "De gids van 2 minuten",
    window: "Jouw voorraadvenster",
  },

  restock: {
    title: "Wanneer je winkels nieuwe voorraad krijgen",
    anyIphone: "iPhone",
    and: " en ",
    yours: (n: number) => (n === 1 ? "je winkel" : `je ${n$(n)} winkels`),
    Yours: (n: number) => (n === 1 ? "Je winkel" : `Je ${n$(n)} winkels`),
    otherStores: (n: number) => cnt(n, "andere winkel", "andere winkels"),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${cnt(stores, "winkel", "winkels")} · laatste ${n$(days)} dagen · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `drukste uur bij ${yours} · daarna ${then}` : `drukste uur bij ${yours}`),
    busiestArea: (stores: number) => `drukste uur over alle ${n$(stores)} winkels in deze tijdzone`,
    next: (inHours: number) => `volgende venster · ${inHours === 0 ? "dit uur" : `over ${n$(inHours)} u`}`,
    typical: "zo lang blijft hij meestal te koop",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `nog geen aanvullingen bij ${yours} · laatste ${n$(days)} dagen` : `aanvullingen bij ${yours} · laatste ${n$(days)} dagen${pattern ? "" : " · te weinig voor een patroon"}`),
    byHour: (busiestInGreen: boolean) => `Per uur${busiestInGreen ? " · drukste in groen" : ""}`,
    byWeekday: (busiest: string | null) => `Per weekdag${busiest ? ` · drukst op ${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `Aanvullingen per uur bij ${yours}, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `Aanvullingen per weekdag bij ${yours}: ${items}`,
    chartItem: (label: string, n: number, reported: number) => `${label} ${n$(n)}${reported ? ` (+${n$(reported)} gemeld door andere trackers)` : ""}`,
    barTitle: (label: string, n: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${cnt(n, "aanvulling", "aanvullingen")} bij ${yours}${area ? ` · ${n$(area.n)} in deze tijdzone` : ""}${reported ? ` · ${n$(reported)} gemeld door andere trackers` : ""}`,
    now: "nu",
    allZone: (stores: number, zone: string) => `Alle ${n$(stores)} winkels in dezelfde tijdzone (${zone})`,
    reportMarkBars: "Gestippeld",
    reportMarkDots: "Holle stippen",
    sellTitle: "Hoe snel jouw aanvullingen uitverkocht zijn",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${cnt(stores, "winkel", "winkels")} · laatste ${n$(days)} dagen`,
    sellLabel: (yours: string) => `bij ${yours}`,
  },

  success: {
    metaTitle: "Alerts staan aan",
    isOn: (plan: string) => `${plan} staat aan`,
    yourPlan: "Je abonnement",
    received: "Betaling ontvangen",
    onPlan: (limit: number) => `${n$(limit)} alerts in je abonnement.`,
    planOn: "Je abonnement staat aan.",
    pending: "Je abonnement verschijnt binnen een minuut in je account.",
    open: "Open mijn alerts",
    another: "Nog een alert toevoegen",
    saved: (n: number) => `${cnt(n, "alert", "alerts")} opgeslagen · bonnetje van Stripe`,
    pushOn: "Meldingen",
    pushNext: "Volgende stap: alerts op je telefoon",
  },

  install: {
    metaTitle: "Installeer de app — voorraadalerts op je beginscherm",
    metaDescription: "Zet PickupChecker op je beginscherm en krijg een melding zodra een iPhone Duo, 18 Pro of Pro Max bij jou in de buurt klaarligt om op te halen.",
  },

  pricing: {
    metaTitle: "Prijzen — 10 alerts $5, 20 voor $10, 50 voor $20",
    metaDescription: `Voorraadalerts voor iPhones om op te halen: je winkels elke ${SPEED.fastSec} seconden gecheckt, een push zo'n ${SPEED.alertSec} seconden na nieuwe voorraad. Plus $5 per maand voor 10 alerts, Pro $10 voor 20, Max $20 voor 50. Altijd opzegbaar.`,
    title: "Prijzen",
    lead: "**Eén alert = één winkel × één exacte iPhone.** Rondkijken is gratis.",
    chips: ["Apple Stores in 19 landen", "Altijd opzegbaar", "Kaart of Link"],
    fastest: "Het snelste gepubliceerde checkinterval van alle iPhone-voorraadtrackers",
    everyFast: `Je winkels elke **${SPEED.fastSec} seconden** · andere trackers noemen 8 seconden tot 15 minuten`,
    sellsOut: (band: string) => `Een gemiddelde iPhone Duo-aanvulling is in **${band}** uitverkocht, sommige in 20–30 seconden`,
    band: (range: string) => `${range} seconden`,
    aboutMinute: "zo'n minuut",
    sameSpeed: "Elk abonnement krijgt dezelfde snelheid",
    rechecked: "je winkels opnieuw gecheckt",
    toPhone: "van bevestigde aanvulling tot je telefoon",
    listing: "gemiddelde Duo te koop, van verschijnen tot weg",
    note: { plus: "1 iPhone × 10 winkels", pro: "2 iPhones × 10 winkels", max: "5 iPhones × 10 winkels" } as Record<string, string>,
    month: "/ maand",
    alerts: (n: number) => `${n$(n)} alerts`,
    perks: [`Je winkels elke ${SPEED.fastSec} sec. gecheckt, alle winkels elke ${SPEED.checkSec} sec.`, `Push zo'n ${SPEED.alertSec} sec. nadat nieuwe voorraad is bevestigd`],
    cancel: "Altijd opzegbaar",
    get: (plan: string) => `Kies ${plan}`,
    billing: "Betaling via Stripe · kaart of Link · wijzigingen naar rato verrekend",
    refund: "Toch niets voor jou? [Volledige terugbetaling binnen 7 dagen](/refunds) als er nog geen voorraadalert bij je is aangekomen",
  },
};
