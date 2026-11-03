/**
 * Italian strings: account (dashboard, its restock modules, install / checkout / pricing pages). {zone} arrives as the
 * full Italian zone name ("Ora dell'Europa centrale"), which already says "ora".
 */
import type { Dict } from "../en";
import { ilData, n as N, pl } from "./util";

export const account: Dict["account"] = {
  loading: "Caricamento",
  meta: { title: "I miei avvisi" },
  signedInAs: (email: string) => `Accesso effettuato come ${email}`,
  title: "I miei avvisi",
  units: { s: "s", min: "min", taps: "tocchi" },

  plan: {
    title: "Piano",
    none: "Nessun piano: gli avvisi sono disattivati",
    summary: (plan: string, on: number, limit: number) => `${plan} · ${N(on)} avvisi attivi su ${N(limit)}`,
    renews: (date: string) => ` · si rinnova ${ilData(date)}`,
    ends: (date: string) => ` · termina ${ilData(date)}`,
  },

  sent: {
    title: "Avvisi inviati",
    last: (ago: string) => `L'ultimo ${ago}`,
    none: "Ancora nessun invio",
    empty: "Ancora nessun invio.",
    channel: { push: "notifica", email: "email" } as Record<string, string>,
    status: { sent: "inviato", failed: "non riuscito", skipped: "saltato" } as Record<string, string>,
  },

  fast: {
    title: "Prenotalo in 20 secondi",
    sub: "fai tutto adesso, tranne gli ultimi quattro tocchi",
    lasts: "quanto dura di solito un Duo disponibile",
    push: "confermato → notifica sul telefono",
    tapsLeft: "quelli che restano a te quando arriva la notifica",
    steps: [
      { title: "Trova la tua fascia", hint: "gli orari dei tuoi negozi, qui sotto · pronto 10 min prima" },
      { title: "Prepara il pagamento su Apple", hint: "capacità + colore esatti → Consegna e ritiro" },
      { title: "Accetta i termini · o scegli sbloccato", hint: "sbloccato, pagato per intero: nessuna casella" },
      { title: "Tienilo sveglio", hint: "Blocco automatico → Mai · toccalo ogni 10–15 min" },
      { title: "Avviso: leggi, non toccare", hint: "Ritiro → il negozio indicato → primo orario → Apple Pay" },
    ],
    guide: "La guida in 2 minuti",
    window: "La tua fascia di rifornimento",
  },

  restock: {
    title: "Quando i tuoi negozi tornano ad averlo",
    anyIphone: "iPhone",
    and: " e ",
    yours: (n: number) => (n === 1 ? "il tuo negozio" : `i tuoi ${N(n)} negozi`),
    Yours: (n: number) => (n === 1 ? "Il tuo negozio" : `I tuoi ${N(n)} negozi`),
    otherStores: (n: number) => pl(n, "altro negozio", "altri negozi"),
    meta: (what: string, stores: number, days: number, zone: string) => `${what} · ${pl(stores, "negozio", "negozi")} · ultimi ${N(days)} giorni · ${zone}`,
    busiest: (yours: string, then: string | null) => (then ? `ora più intensa per ${yours} · poi ${then}` : `ora più intensa per ${yours}`),
    busiestArea: (stores: number, zone: string) => `la più intensa tra tutti i ${N(stores)} negozi (${zone})`,
    next: (inHours: number) => `prossima fascia · ${inHours === 0 ? "in quest'ora" : `tra ${N(inHours)} h`}`,
    typical: "durata tipica prima che si esaurisca",
    count: (yours: string, days: number, total: number, pattern: boolean) => (total === 0 ? `ancora nessun rifornimento per ${yours} · ultimi ${N(days)} giorni` : `rifornimenti per ${yours} · ultimi ${N(days)} giorni${pattern ? "" : " · troppo pochi per una tendenza"}`),
    byHour: (busiestInGreen: boolean) => `Per ora${busiestInGreen ? " · la più intensa in verde" : ""}`,
    byWeekday: (busiest: string | null) => `Per giorno della settimana${busiest ? ` · il più intenso: ${busiest}` : ""}`,
    hourChart: (yours: string, zone: string, items: string) => `Rifornimenti per ora per ${yours}, ${zone}: ${items}`,
    weekdayChart: (yours: string, items: string) => `Rifornimenti per giorno della settimana per ${yours}: ${items}`,
    chartItem: (label: string, n: number, reported: number) => `${label} ${N(n)}${reported ? ` (+${N(reported)} ${reported === 1 ? "segnalato" : "segnalati"} da altri tracker)` : ""}`,
    barTitle: (label: string, n: number, yours: string, area: { n: number; zone: string } | null, reported: number) =>
      `${label}: ${pl(n, "rifornimento", "rifornimenti")} per ${yours}${area ? ` · ${N(area.n)} in tutta la zona (${area.zone})` : ""}${reported ? ` · ${N(reported)} ${reported === 1 ? "segnalato" : "segnalati"} da altri tracker` : ""}`,
    now: "ora",
    allZone: (stores: number, zone: string) => `Tutti i ${N(stores)} negozi (${zone})`,
    reportMarkBars: "Tratteggiate",
    reportMarkDots: "Punti vuoti",
    sellTitle: "In quanto tempo si esauriscono i tuoi rifornimenti",
    sellMeta: (what: string, stores: number, days: number) => `${what} · ${pl(stores, "negozio", "negozi")} · ultimi ${N(days)} giorni`,
    sellLabel: (yours: string) => `per ${yours}`,
  },

  success: {
    metaTitle: "Avvisi attivi",
    isOn: (plan: string) => `${plan} è attivo`,
    yourPlan: "Il tuo piano",
    received: "Pagamento ricevuto",
    onPlan: (limit: number) => `${N(limit)} avvisi nel tuo piano.`,
    planOn: "Il tuo piano è attivo.",
    pending: "L'abbonamento comparirà nel tuo account entro un minuto.",
    open: "Apri i miei avvisi",
    another: "Aggiungi un altro avviso",
    saved: (n: number) => `${pl(n, "avviso salvato", "avvisi salvati")} · ricevuta da Stripe`,
    pushOn: "Notifiche",
    pushNext: "Prossimo passo: gli avvisi sul telefono",
  },

  install: {
    metaTitle: "Installa l'app: avvisi di disponibilità sulla schermata Home",
    metaDescription: "Aggiungi PickupChecker alla schermata Home e ricevi una notifica appena iPhone Duo, 18 Pro o Pro Max è disponibile per il ritiro vicino a te.",
  },

  pricing: {
    metaTitle: "Prezzi: 10 avvisi a $5, 20 a $10, 50 a $20",
    metaDescription: "Avvisi di disponibilità iPhone per il ritiro negli Apple Store: i tuoi negozi controllati ogni 5 secondi, una notifica circa 3 secondi dopo un rifornimento. Plus $5 al mese per 10 avvisi, Pro $10 per 20, Max $20 per 50. Disdici quando vuoi.",
    title: "Prezzi",
    lead: "**Un avviso = un negozio × un iPhone esatto.** Consultare la disponibilità è gratis.",
    /** The English chip names the 269 US stores; an Italian reader is not on the US page, so no US-only number here. */
    chips: ["Tutti gli Apple Store monitorati", "Disdici quando vuoi", "Carta o Link"],
    fastest: "L'intervallo di controllo dichiarato più rapido tra i tracker di disponibilità iPhone",
    everyFast: "I tuoi negozi ogni **5 secondi** · gli altri tracker dichiarano da 8 secondi a 15 minuti",
    sellsOut: (band: string) => `Un rifornimento tipico di iPhone Duo si esaurisce in **${band}**, alcuni in 20–30 secondi`,
    band: (range: string) => `${range} secondi`,
    aboutMinute: "circa un minuto",
    sameSpeed: "Tutti i piani hanno la stessa velocità",
    rechecked: "i tuoi negozi ricontrollati",
    toPhone: "dal rifornimento confermato al telefono",
    listing: "durata tipica di un Duo disponibile, dall'arrivo all'esaurimento",
    note: { plus: "1 iPhone × 10 negozi", pro: "2 iPhone × 10 negozi", max: "5 iPhone × 10 negozi" } as Record<string, string>,
    month: "/ mese",
    alerts: (n: number) => `${N(n)} avvisi`,
    perks: ["I tuoi negozi controllati ogni 5 s, tutti gli altri ogni 15 s", "Notifica circa 3 s dopo un rifornimento confermato"],
    cancel: "Disdici quando vuoi",
    get: (plan: string) => `Scegli ${plan}`,
    billing: "Pagamenti con Stripe · carta o Link · cambi di piano calcolati pro rata",
    refund: "Non fa per te? [Rimborso completo entro 7 giorni](/refunds) se non ti è ancora arrivato nessun avviso di rifornimento",
  },
};
