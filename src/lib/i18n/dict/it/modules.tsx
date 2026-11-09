/**
 * Italian strings: modules — the restock, store and stock modules. `label` arrives with its preposition
 * ("a Roma", "da Apple Via del Corso", "in Italia", "qui"); numbers arrive raw and are grouped here.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { dei, n as N, pl } from "./util";

const CHECK_NOTE = "ogni 15 s, 5 s con un avviso";
/** "il martedì" / "la domenica" from a weekday name. */
const ilDay = (d: string) => (/^domenic/i.test(d) ? `la ${d}` : `il ${d}`);

/** "dal 3 novembre" / "dall'8 novembre". */
const dal = (d: string) => (/^(8|11\b|1\b)/.test(d) ? `dall'${d}` : `dal ${d}`);
/** "Il 58%" / "L'80%" / "L'11%". */
const ilPct = (p: string) => (/^(8|11\D|1\D)/.test(p) ? `L'${p}` : `Il ${p}`);
/** The label as is for one store; otherwise "nei 12 Apple Store in Italia". */
const itWhere = (o: { one: boolean; stores: number; label: string }) => (o.one ? o.label : o.stores === 1 ? `nell'Apple Store ${o.label}` : `${dei(o.stores).replace(/^d/, "n")} Apple Store ${o.label}`);

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `Nessun rifornimento o esaurimento registrato ${label} negli ultimi ${N(days)} giorni: il grafico si riempie dal primo.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${pl(restocks, "rifornimento", "rifornimenti")} e ${pl(soldouts, "esaurimento", "esaurimenti")} ${label} negli ultimi ${N(days)} giorni, in ${pl(activeDays, "giorno", "giorni diversi")}.`,
    busiest: (day: string, restocks: number) => <> Il giorno più intenso è stato il <b className="text-ink">{day}</b>, con {N(restocks)}.</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: ${pl(restocks, "rifornimento", "rifornimenti")}, ${pl(soldouts, "esaurimento", "esaurimenti")}`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: ${pl(restocks, "rifornimento", "rifornimenti")} · ${pl(soldouts, "esaurimento", "esaurimenti")}`,
    legendRestocks: "rifornimenti",
    legendSoldouts: "esaurimenti",
  },

  last24: {
    title: (label: string) => `Rifornimenti di iPhone Duo ${label} nelle ultime 24 ore`,
    asOf: (when: string) => `situazione al ${when}`,
    localTime: (when: string) => `${when} ora locale`,
    anAppleStore: "un Apple Store",
    unknown: "Il conteggio delle ultime 24 ore non è disponibile in questo momento; la disponibilità in tempo reale e il registro dei rifornimenti di questa pagina non ne risentono.",
    none: (label: string, asOf: string) => <><b className="text-ink">Nessun rifornimento di iPhone Duo {label} nelle ultime 24 ore</b> (situazione al {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>Nelle ultime 24 ore l&apos;iPhone Duo è tornato disponibile <b className="text-ink">{o.restocks === 1 ? "1 volta" : `${N(o.restocks)} volte`} {o.one ? o.label : `in ${N(o.withStores)} ${o.allStores === 1 ? "Apple Store su 1" : `${dei(o.allStores)} Apple Store`} ${o.label}`}</b>; l&apos;ultimo: <b className="text-ink">{o.config}</b>{o.store != null && <> da {o.store}</>}, {o.when} ora locale.</>
    ),
    tileRestocks: "rifornimenti confermati · 24 h",
    tileConfigsBack: "configurazioni tornate disponibili",
    tileStores: (configs: number, allConfigs: number) => `negozi con un rifornimento${configs ? ` · ${N(configs)} configurazioni su ${N(allConfigs)}` : ""}`,
    tileLatest: (config: string, store: string | null) => <>ultimo · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>il precedente · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "nessun rifornimento precedente registrato",
    caption: (label: string, asOf: string) => `Rifornimenti confermati di ogni configurazione di iPhone Duo ${label}, ultime 24 ore, situazione al ${asOf}`,
    thConfig: "Configurazione",
    thRestocks: "Rifornimenti",
    thStores: "Negozi",
    thLast: "Ultimo rifornimento (ora locale)",
    thNow: "Disponibile ora",
    ofStores: (n: number, total: number) => `${N(n)} su ${N(total)}`,
    noneIn24: "nessuno in 24 h",
    yes: "sì",
    no: "no",
    countedTitle: "Come contiamo i rifornimenti",
    counted: "Sono controlli di PickupChecker sul Ritiro in negozio di apple.com: ogni negozio ogni 15 secondi, quelli con avvisi ogni 5. Un rifornimento viene registrato solo quando due controlli concordano; la prima volta che vediamo un negozio non conta; le segnalazioni di altri tracker non vengono mai mescolate ai nostri numeri.",
    alert: (label: string | null) => `Avvisami${label != null ? ` ${label}` : ""} → il prossimo in pochi secondi`,
  },

  clock: {
    none: (label: string, days: number) => `Ancora nessun rifornimento registrato ${label} negli ultimi ${N(days)} giorni.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${pl(total, "rifornimento", "rifornimenti")} ${label} negli ultimi ${N(days)} giorni${dates != null ? ` (in ${pl(dates, "giorno", "giorni")})` : ""}: troppo pochi per parlare di una tendenza.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{pl(total, "rifornimento", "rifornimenti")} {label} negli ultimi {N(days)} giorni. Per lo più arrivano verso <b className="text-ink">le {hour}</b>, ora locale{day ? <>, e il giorno più intenso è <b className="text-ink">{ilDay(day)}</b></> : null}.</>
    ),
    byHour: (zone: string) => `Per fascia oraria · ${zone}`,
    byWeekday: "Per giorno della settimana",
    barReported: (n: number) => ` (+${N(n)} ${n === 1 ? "segnalato" : "segnalati"} da altri tracker)`,
    barReportedTitle: (bar: string, n: number) => `${bar}: ${N(n)} ${n === 1 ? "segnalato" : "segnalati"} da altri tracker`,
    legendOurs: "Confermati da PickupChecker",
  },

  feed: {
    empty: "Ancora nessun rifornimento registrato.",
    available: "Disponibile",
    soldOut: "Esaurito",
    soldOutAt: (time: ReactNode) => <>esaurito {time}</>,
    since: (time: ReactNode) => <>disponibile {time}</>,
    restockedAt: (time: ReactNode) => <>rifornito {time}</>,
    mapAria: (store: string) => `Mostra ${store} sulla mappa`,
    map: "Mappa",
    buyAria: (model: string, config: string) => `Acquista l'${model} ${config} su apple.com`,
    buy: "Acquista su apple.com",
  },

  byConfig: {
    empty: (label: string, days: number) => `Nessuna configurazione è tornata disponibile ${label} negli ultimi ${N(days)} giorni, quindi non c'è ancora una classifica.`,
    intro: (label: string, days: number) => `Le configurazioni tornate disponibili ${label} negli ultimi ${N(days)} giorni, dalla più frequente.`,
    times: (n: number) => `${N(n)}×`,
    alert: "Avvisami",
  },

  sellout: {
    typical: (label: string, band: string) => `Un rifornimento tipico di iPhone Duo ${label} si è esaurito in circa ${band}.`,
    half: (label: string, duration: string) => `Metà dei rifornimenti ${label} si è esaurita entro ${duration}.`,
    none: (label: string, days: number) => `Nessun rifornimento ${label} si è ancora esaurito negli ultimi ${N(days)} giorni.`,
    whatDuo: "iPhone Duo",
    whatAll: "tutti gli iPhone",
    definition: "La durata di disponibilità è il tempo in cui la pagina di ritiro di Apple ha mostrato la configurazione come disponibile, delimitato da due nostri controlli; non indica quanti telefoni sono stati venduti né quanto devi essere veloce.",
    tileHalf: (what: string) => <>metà esaurita entro · {what}</>,
    tileWithin30: "esauriti entro 30 s",
    tileWithin60: "esauriti entro 1 min",
    tileFastest: (n: number, days: number) => <>il più rapido · {pl(n, "rifornimento esaurito", "rifornimenti esauriti")}, {N(days)} g</>,
    caption: (days: number) => `Per iPhone, ultimi ${N(days)} giorni`,
    thIphone: "iPhone",
    thSoldOut: "Esauriti",
    thHalf: "Metà esaurita entro",
    thWithin30: "≤ 30 s",
    thWithin60: "≤ 1 min",
    thFastest: "Il più rapido",
    each: "Rifornimento per rifornimento",
    barNote: (full: string) => `barra = secondi in vendita · piena a ${full}`,
    stillListed: (duration: string) => `ancora disponibile · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "Come lo misuriamo",
    measured: (estimated: boolean) =>
      `«Esaurito in 45–60 s» significa che la configurazione era ancora disponibile al nostro controllo 45 secondi dopo averla vista per la prima volta, e non lo era più al controllo dopo 60 secondi. I negozi con avvisi vengono controllati ogni 5 secondi, tutti gli altri ogni 15: è questa l'ampiezza di ogni intervallo${estimated ? "; ≈ indica rifornimenti precedenti alla registrazione dell'ultimo controllo, delimitati invece dal giro di 15 secondi" : ""}. Una disponibilità più breve di un controllo può comparire e sparire tra due controlli, quindi la quota reale esaurita entro 30 secondi è più alta di quella mostrata.`,
  },

  configTable: {
    title: "Tutte le configurazioni in questo negozio",
    titleAt: (store: string) => `Tutte le configurazioni da ${store}`,
    lookupOff: (hasRows: boolean) => `Al momento Apple non offre la verifica del Ritiro in negozio per questo negozio${hasRows ? " (qui sotto le ultime risposte ricevute)" : ""}`,
    tracked: (n: number) => `${N(n)} configurazioni monitorate`,
    firstSweep: "Primo controllo in corso: gli stati compaiono entro un minuto",
    inStock: (n: number, total: number) => `${N(n)} su ${N(total)} disponibili`,
    available: "Disponibile",
    unavailable: "Non disponibile",
    noLookup: "nessuna verifica del ritiro",
    notChecked: "non ancora controllato",
    since: (ago: ReactNode) => <>apparso {ago}</>,
    lastAvailable: (ago: ReactNode) => <>ultima volta disponibile {ago}</>,
    neverHere: "mai visto disponibile qui",
    buy: "Acquista",
    alertAria: (model: string, config: string, store: string) => `Avvisami quando l'${model} ${config} è disponibile da ${store}`,
    alert: "Avvisami →",
  },

  matrix: {
    store: "Negozio",
    checked: "Controllato",
    cellTitle: (model: string, n: number, total: number) => `${model}: ${N(n)} configurazioni su ${N(total)} disponibili`,
  },

  nearby: {
    duo: (short: string, n: number) => `${short} · ${N(n)}`,
    noDuo: (short: string) => `nessun ${short}`,
  },

  stockByModel: {
    availableNow: (n: number, total: number) => `${N(n)} configurazioni su ${N(total)} disponibili ora`,
    noneNow: (total: number) => `nessuna delle ${N(total)} configurazioni in questo momento`,
    lookupOff: "Al momento Apple non offre la verifica del ritiro qui",
    notChecked: "non ancora controllato",
    more: (n: number) => `+${N(n)}`,
    checked: (ago: ReactNode) => <>controllato {ago}</>,
    alert: "Avvisami →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>Controllato {ago} · {CHECK_NOTE}</>,
    map: "Mostra sulla mappa",
    alert: "Avvisami qui",
    alsoIn: (region: string) => `Anche in provincia di ${region}`,
    acrossLine: "I negozi più vicini oltre il confine dello stato",
    elsewhere: "I negozi più vicini altrove",
  },

  hours: {
    title: "Orari",
    local: (zone: string) => `Orari locali (${zone})`,
    today: (hours: string, week: string) => ` · oggi ${hours} · ${week}`,
    directions: "Indicazioni",
    applePage: "Pagina del negozio su apple.com",
    liveMap: "Mappa in tempo reale",
    storePage: "Pagina del negozio",
    closed: "Chiuso",
    everyDay: (hours: string) => `Tutti i giorni ${hours}`,
    openNow: (closes: string) => `Aperto ora · chiude alle ${closes}`,
    opensAt: (opens: string) => `Apre alle ${opens}`,
    closedToday: (next: string | null) => (next ? `Chiuso oggi · apre ${next}` : "Chiuso oggi"),
    closedNow: (next: string | null) => (next ? `Chiuso ora · apre ${next}` : "Chiuso ora"),
    nextOpen: (day: string | null, time: string) => `${day ?? "domani"} alle ${time}`,
  },

  liveStats: {
    inStock: "Disponibili ora",
    storesWith: "Negozi con disponibilità",
    lastCheck: "Ultimo controllo",
    none: "—",
  },

  board: {
    summary: (n: number, stores: number, short: string) => `${N(n)} negozi su ${N(stores)} hanno il ${short} disponibile`,
    lastCheck: (ago: ReactNode) => <>Ultimo controllo {ago}</>,
    firstSweep: "Primo controllo in corso.",
    noneListed: (model: string, storage: string | null, color: string | null) => `In questo momento nessun negozio ha disponibile l'${model}${storage ? ` ${storage}` : ""}${color ? ` ${color}` : ""}.`,
    more: (n: number) => `+${N(n)}`,
    seen: (ago: ReactNode) => <>Visto {ago}</>,
    loading: "Caricamento disponibilità",
  },
  duoNow: {
    eyebrow: (label) => `iPhone Duo ${label} in questo momento`,
    notNow: (o) => (o.n === 1
      ? <><b className="text-ink">Non disponibile al {o.stamp}</b>: l&apos;Apple Store {o.label} non ha iPhone Duo disponibili per il ritiro.</>
      : <><b className="text-ink">Non disponibile al {o.stamp}</b>: nessuno {dei(o.n)} Apple Store {o.label} ha un iPhone Duo disponibile per il ritiro.</>),
    notNowOne: (o) => <><b className="text-ink">Non disponibile al {o.stamp}</b>: {o.name} non ha nessuna configurazione di iPhone Duo disponibile per il ritiro.</>,
    inStock: (o) => <><b className="text-ink">Disponibile al {o.stamp}</b>: {N(o.k)} Apple Store su {N(o.n)} {o.label} {o.k === 1 ? "ha" : "hanno"} un iPhone Duo disponibile per il ritiro — {o.list}.</>,
    inStockOne: (o) => <><b className="text-ink">Disponibile al {o.stamp}</b>: {o.name} ha {pl(o.k, "configurazione", "configurazioni")} di iPhone Duo su {N(o.total)} {o.k === 1 ? "disponibile" : "disponibili"} per il ritiro — {o.list}.</>,
    storeItem: (store, configs, ago) => <>{store} ({pl(configs, "configurazione", "configurazioni")}{ago ? `, vista ${ago}` : ""})</>,
    configItem: (config, ago) => <>{config}{ago ? ` (vista ${ago})` : ""}</>,
    lastIn: (o) => <>Ultima disponibilità: <b className="text-ink">{o.config}</b>{o.store != null && <> da {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label, since) => `Nessun rifornimento di iPhone Duo confermato ${label} da quando è iniziato il monitoraggio (${since}).`,
    others: (o) => (o.one
      ? `L'iPhone 18 Pro è disponibile qui in ${N(o.pro)} configurazioni su ${N(o.configs)}, il 18 Pro Max in ${N(o.max)}.`
      : `L'iPhone 18 Pro è disponibile in ${N(o.pro)} di questi negozi, il 18 Pro Max in ${N(o.max)}.`),
    evidence: (o) => (o.one
      ? (o.fresh > 0
        ? <>Al {o.stamp}: {o.name} ha risposto al nostro controllo nell&apos;ultimo minuto.</>
        : <>Al {o.stamp}: nessuna risposta da {o.name} nell&apos;ultimo minuto — stato sconosciuto, non contato come esaurito.</>)
      : <>Al {o.stamp}: {pl(o.fresh, "negozio", "negozi")} su {N(o.total)} {o.fresh === 1 ? "ha" : "hanno"} risposto nell&apos;ultimo minuto{o.stale > 0 ? `; ${N(o.stale)} senza una risposta recente — stato sconosciuto, non ${o.stale === 1 ? "contato come esaurito" : "contati come esauriti"}` : ""}.</>),
    evidenceNone: (o) => (o.one
      ? `${o.name} non ha ancora risposto a nessun controllo — stato sconosciuto, non contato come esaurito.`
      : `Nessuno ${dei(o.total)} negozi ha ancora risposto a un controllo — stato sconosciuto, nulla viene contato come esaurito.`),
    howCounted: (o) => {
      const base = "Un rifornimento conta solo dopo due risposte concordi (i primi avvistamenti sono esclusi); la durata di disponibilità è compresa tra l'ultimo controllo che vedeva ancora la configurazione e il primo che non la vedeva più. I controlli sono previsti ogni 5 s nei negozi con un avviso e ogni 15 s in tutti i negozi";
      const lanes = [
        o.fast && `${o.fast.p50} di mediana nei negozi con un avviso (p95 ${o.fast.p95}, ${N(o.fast.n)} intervalli${o.fast.slow ? "; più lento del previsto" : ""})`,
        o.round && `${o.round.p50} per giro completo (p95 ${o.round.p95}, ${N(o.round.n)} giri${o.round.slow ? "; più lento del previsto" : ""})`,
      ].filter(Boolean);
      if (lanes.length === 0 || !o.win) return `${base}.`;
      const win = o.win.days ? `negli ultimi ${N(o.win.days)} giorni` : o.win.hours && o.win.hours > 1 ? `nelle ultime ${N(o.win.hours)} ore` : "nell'ultima ora";
      return `${base}; misurato ${win}: ${lanes.join(" e ")}.`;
    },
    howLink: "Come misuriamo →",
    sec: (v) => `${v} s`,
    technique: "PickupChecker interroga la disponibilità per il ritiro in negozio di Apple per ogni Apple Store: ogni 5 secondi nei negozi con avvisi dei membri e ogni 15 secondi in tutti i negozi. Un rifornimento conta solo dopo due risposte concordi (primi avvistamenti esclusi); la durata di disponibilità è compresa tra l'ultimo controllo che vedeva ancora la configurazione e il primo che non la vedeva più.",
    tShare: (range) => `dei rifornimenti nella fascia ${range}`,
    tBusiest: (count) => `ora più intensa · ${pl(count, "rifornimento", "rifornimenti")}`,
    tHalf: "durata mediana di disponibilità",
    tSince: (date) => `rifornimenti confermati ${dal(date)}`,
    tToday: "oggi, finora",
    mostOften: (config, k, total) => `più spesso ${config} (${N(k)} su ${N(total)})`,
    /** I nomi dei fusi orari statunitensi servono solo in inglese: qui sempre "ora locale". */
    zone: (tz: string | null): string => {
      void tz;
      return "ora locale";
    },
    factsTitle: (label) => `Dati chiave: iPhone Duo ${label}`,
    fN: (o) => <>PickupChecker ha confermato <b className="text-ink">{N(o.n)}</b> {o.n === 1 ? "rifornimento" : "rifornimenti"} di iPhone Duo {itWhere(o)} {dal(o.since)}, in {o.days === 1 ? "un solo giorno" : `${N(o.days)} giorni diversi`}.</>,
    fShare: (o) => <>{ilPct(o.pct).slice(0, -o.pct.length)}<b className="text-ink">{o.pct}</b> {dei(o.n)} rifornimenti di iPhone Duo {o.label} {dal(o.since)} è avvenuto nella fascia {o.range}, {o.zone}; l&apos;ora più intensa è stata {o.busiest} ({pl(o.busiestN, "rifornimento", "rifornimenti")}).</>,
    fTooFew: (o) => `${pl(o.n, "rifornimento", "rifornimenti")} di iPhone Duo ${o.n === 1 ? "confermato" : "confermati"} ${o.label} in ${pl(o.days, "giorno", "giorni")}: ${o.n === 1 ? "troppo poco" : "troppo pochi"} per indicare un orario abituale; PickupChecker aspetta ${N(o.min)} rifornimenti in ${N(o.minDays)} giorni diversi.`,
    fMedian: (o) => <>In mediana un iPhone Duo {o.label} è rimasto <b className="text-ink">circa {o.median}</b> sulla pagina di ritiro di Apple ({N(o.n)} disponibilità cronometrate {dal(o.since)}).</>,
    fTop: (o) => <>La configurazione di iPhone Duo rifornita più spesso {o.label} è <b className="text-ink">{o.config}</b>: {N(o.k)} rifornimenti su {N(o.n)} ({o.pct}) {dal(o.since)}.</>,
    fToday: (o) => (o.n > 0
      ? <>Oggi ({o.date}, ora locale) PickupChecker ha confermato finora <b className="text-ink">{N(o.n)}</b> {o.n === 1 ? "rifornimento" : "rifornimenti"} di iPhone Duo {o.label}.</>
      : <>Oggi ({o.date}, ora locale) PickupChecker non ha ancora confermato nessun rifornimento di iPhone Duo {o.label}.</>),
    hourByHour: "Ora per ora, negozio per negozio →",
    lastThree: (k, label) => (k === 1 ? `L'ultimo rifornimento di iPhone Duo ${label}` : `Gli ultimi ${N(k)} rifornimenti di iPhone Duo ${label}`),
    secs: (v) => `${N(v)} s`,
    mins: (v) => `${N(v)} min`,
    listedRange: (low, high) => `disponibile ${low}–${high}`,
    listedAbout: (x) => `disponibile circa ${x}`,
    stillListed: (x) => `ancora disponibile (${x})`,
    ago: (x) => `${x} fa`,
    alerts: (o) => (o.one
      ? `Negli ultimi ${N(o.days)} giorni PickupChecker ha inviato ${pl(o.sent, "avviso", "avvisi")} ai membri per rifornimenti di iPhone Duo ${o.label}.`
      : `Negli ultimi ${N(o.days)} giorni PickupChecker ha inviato ${pl(o.sent, "avviso", "avvisi")} ai membri per rifornimenti di iPhone Duo in ${N(o.stores)} Apple Store su ${N(o.total)} ${o.label}.`),
    alertMe: (label) => `Avvisami ${label}`,
    unknown: "L'andamento dei rifornimenti non è disponibile in questo momento; la disponibilità in tempo reale di questa pagina non ne risente.",
    allModels: (o) => `Tutti e tre gli iPhone: ${pl(o.n, "rifornimento", "rifornimenti")} in ${N(o.days)} giorni${o.peak ? `, soprattutto verso ${o.peak}` : ""}.`,
  },
};
