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
    push: "bevestigd → push verstuurd (aankomst niet gemeten)",
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
    speedTitle: "Hoe snel is het? Gepland, dan gemeten",
    speedAnswer: (v) => `Winkels waar je alerts naar wijzen worden volgens plan elke ${SPEED.fastSec} seconden gecheckt. Gemeten over de afgelopen 7 dagen in de VS was de tijd tussen twee antwoorden voor zo'n winkel **${v.p50}** als mediaan en ${v.p95} op het 95e percentiel. Elk abonnement krijgt hetzelfde tempo.`,
    speedPlanned: `Winkels waar je alerts naar wijzen worden volgens plan elke ${SPEED.fastSec} seconden gecheckt, alle andere elke ${SPEED.checkSec}. Gemeten cijfers verschijnen hier zodra er een week aan checks is vastgelegd. Elk abonnement krijgt hetzelfde tempo.`,
    planned: `Gepland: je winkels elke **${SPEED.fastSec} sec.**, elke winkel elke **${SPEED.checkSec} sec.**`,
    intl: (v) => `Buiten de VS: mediaan **${v.p50}**, 95e percentiel ${v.p95}${v.above ? `, trager dan de geplande ${SPEED.fastSec} seconden` : ""}`,
    push: (v) => `Eerste check die voorraad zag → push geaccepteerd door de pushdienst van Apple of Google: mediaan **${v.p50}**, 90e percentiel ${v.p90} (${v.n} aanvullingen, 7 dagen)`,
    pushPending: "Alerttijden verschijnen hier zodra er een week aan alerts is vastgelegd",
    notMeasured: "Aankomst op je telefoon meten we niet: de pushdiensten melden die niet terug",
    listingLine: (band, k) => `Apples ophaalpagina toonde een typische iPhone Duo-aanvulling **${band}** lang (mediaan van ${k} aanvullingen, 7 dagen)`,
    band: (range: string) => `${range} seconden`,
    aboutMinute: "zo'n minuut",
    report: "[Servicerapport](/service-report): elke checkronde over 24 uur, 7 en 30 dagen, met steekproeven en grenzen",
    gapTile: "je winkels: mediane tijd tussen checks, 7 dagen",
    plannedTile: "je winkels: gepland checkinterval",
    pushTile: "eerste waarneming → pushdienst, mediaan, 7 dagen",
    pushTilePending: "eerste waarneming → pushdienst: wordt gemeten",
    listing: "typische Duo-vermelding op Apples ophaalpagina, mediaan",
    note: { plus: "1 iPhone × 10 winkels", pro: "2 iPhones × 10 winkels", max: "5 iPhones × 10 winkels" } as Record<string, string>,
    month: "/ maand",
    alerts: (n: number) => cnt(n, "alert", "alerts"),
    perks: [`Je winkels elke ${SPEED.fastSec} sec. gecheckt, alle winkels elke ${SPEED.checkSec} sec.`, `Push verstuurd zo'n ${SPEED.alertSec} sec. nadat nieuwe voorraad is bevestigd`],
    cancel: "Altijd opzegbaar",
    get: (plan: string) => `Kies ${plan}`,
    needTitle: "Heb je een abonnement nodig?",
    needAnswer: "Vaak niet. Een abonnement loont als je één exacte iPhone wilt bij winkels die je kunt bereiken, niet zelf steeds kunt kijken en de aanvullingen maar kort zichtbaar blijven. Live voorraad, de kaart, het aanvullingslogboek, elke winkelpagina en de openbare API blijven gratis, zonder account.",
    skipTitle: "Je hebt er geen nodig als",
    skip: [
      "Je alleen live voorraad, de kaart of het aanvullingslogboek bekijkt",
      "Je winkel altijd bereikbaar is: open de winkelpagina voordat je gaat",
      "Je flexibel bent in configuratie: winkelpagina's tonen alles wat nu op voorraad is",
      "Je de data wilt: de [gratis openbare API](/iphone-duo-stock-api) heeft dezelfde live voorraad",
    ],
    helpsTitle: "Een abonnement helpt als",
    helps: [
      "Je één exacte configuratie wilt en de aanvullingen binnen minuten weg zijn",
      "Je geen tabblad open kunt houden: een push gaat eruit zodra twee overeenkomende checks een aanvulling bevestigen",
      "Je meerdere winkels of configuraties tegelijk volgt",
    ],
    tool: "Twijfel je over winkels of kleuren? De [alertinstelling](/#notify) laat gratis zien hoeveel ophaalvensters je keuze eerder had en welke wijziging er de meeste had toegevoegd.",
    tableTitle: "Hoeveel alerts heb je nodig?",
    tableAnswer: (plus, pro, max) => `Alerts = configuraties × winkels. Tot ${plus.limit} alerts, bijvoorbeeld één iPhone bij ${plus.limit} winkels, is Plus voor $${plus.price} per maand; tot ${pro.limit} is Pro voor $${pro.price}; tot ${max.limit} is Max voor $${max.price}. Boven ${max.limit} past het in geen enkel abonnement: kies minder winkels of configuraties.`,
    corner: "iPhones ↓ · winkels →",
    configsN: (k) => cnt(k, "iPhone", "iPhones"),
    storesN: (k) => cnt(k, "winkel", "winkels"),
    noPlan: "Past in geen abonnement",
    tableNote: "Eén alert = één winkel × één exacte configuratie (model, opslag, kleur). Elk abonnement dekt elke mix, tot zijn aantal.",
    billing: "Betaling via Stripe · kaart of Link · wijzigingen naar rato verrekend",
    refund: "Toch niets voor jou? [Volledige terugbetaling binnen 7 dagen](/refunds) als er nog geen voorraadalert bij je is aangekomen",
  },
};
