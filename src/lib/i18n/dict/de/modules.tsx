/**
 * German strings: modules — restock, store and stock modules. `label` is a place phrase the page builds
 * ("in Bayern", "bei Apple Rosenstraße", "hier"); numbers arrive raw and are formatted here.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { inOrt, n, plural } from "./util";

const restocks = (x: number) => plural(x, "Restock", "Restocks");
const mal = (x: number) => (x === 1 ? "einmal" : `${n(x)}-mal`);

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `Kein Restock oder Ausverkauf ${label} in den letzten ${days} Tagen – das Diagramm füllt sich ab dem ersten.`,
    summary: (r: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${restocks(r)} und ${plural(soldouts, "Ausverkauf", "Ausverkäufe")} ${label} in den letzten ${days} Tagen, an ${activeDays === 1 ? "einem Tag" : `${n(activeDays)} verschiedenen Tagen`}.`,
    busiest: (day: string, r: number) => <> Der stärkste Tag war der <b className="text-ink">{day}</b> mit {n(r)}.</>,
    barAria: (day: string, r: number, soldouts: number) => `${day}: ${restocks(r)}, ${plural(soldouts, "Ausverkauf", "Ausverkäufe")}`,
    barTitle: (day: string, r: number, soldouts: number) => `${day}: ${restocks(r)} · ${plural(soldouts, "Ausverkauf", "Ausverkäufe")}`,
    legendRestocks: "Restocks",
    legendSoldouts: "Ausverkäufe",
  },

  last24: {
    title: (label: string) => `iPhone-Duo-Restocks ${label} in den letzten 24 Stunden`,
    asOf: (when: string) => `Stand ${when}`,
    localTime: (when: string) => `${when} Ortszeit`,
    anAppleStore: "ein Apple Store",
    unknown: "Die Zahl der letzten 24 Stunden ließ sich gerade nicht lesen; Live-Verfügbarkeit und Restock-Protokoll auf dieser Seite sind nicht betroffen.",
    none: (label: string, asOf: string) => <><b className="text-ink">Kein iPhone-Duo-Restock {label} in den letzten 24 Stunden</b> (Stand {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>In den letzten 24 Stunden war das iPhone Duo <b className="text-ink">{mal(o.restocks)} {o.one ? o.label : `in ${n(o.withStores)} von ${n(o.allStores)} Apple ${o.allStores === 1 ? "Store" : "Stores"} ${o.label}`} wieder da</b>; zuletzt: <b className="text-ink">{o.config}</b>{o.store != null && <> bei {o.store}</>}, {o.when} Ortszeit.</>
    ),
    tileRestocks: "bestätigte Restocks · 24 Std.",
    tileConfigsBack: "Konfigurationen wieder da",
    tileStores: (configs: number, allConfigs: number) => `Stores mit Restock${configs ? ` · ${configs} von ${allConfigs} Konfigurationen` : ""}`,
    tileLatest: (config: string, store: string | null) => <>zuletzt · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>davor · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "kein früherer Restock erfasst",
    caption: (label: string, asOf: string) => `Bestätigte Restocks je iPhone-Duo-Konfiguration ${label}, letzte 24 Stunden, Stand ${asOf}`,
    thConfig: "Konfiguration",
    thRestocks: "Restocks",
    thStores: "Stores",
    thLast: "Letzter Restock (Ortszeit)",
    thNow: "Jetzt vorrätig",
    ofStores: (k: number, total: number) => `${n(k)} von ${n(total)}`,
    noneIn24: "keiner in 24 Std.",
    yes: "ja",
    no: "nein",
    countedTitle: "So zählen wir Restocks",
    counted: "PickupChecker prüft die Abholung im Store auf apple.com selbst: jeden Store alle 15 Sekunden, Stores mit Alarm alle 5. Ein Restock zählt erst, wenn zwei Prüfungen übereinstimmen; die allererste Sichtung eines Stores zählt nicht; Meldungen anderer Tracker fließen nie ein.",
    alert: (label: string | null) => `Alarm${label != null ? ` ${label}` : ""} stellen → den nächsten in Sekunden`,
  },

  clock: {
    none: (label: string, days: number) => `Noch keine Restocks ${label} in den letzten ${days} Tagen.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${restocks(total)} ${label} in den letzten ${days} Tagen${dates != null ? ` (an ${dates === 1 ? "einem Tag" : `${n(dates)} Tagen`})` : ""} – noch zu wenige für ein Muster.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{restocks(total)} {label} in den letzten {days} Tagen. Die meisten kommen gegen <b className="text-ink">{hour}</b> Ortszeit{day ? <>, der stärkste Wochentag ist der <b className="text-ink">{day}</b></> : null}.</>
    ),
    byHour: (zone: string) => `Nach Uhrzeit · ${zone}`,
    byWeekday: "Nach Wochentag",
    barReported: (k: number) => ` (+${n(k)} von anderen Trackern gemeldet)`,
    barReportedTitle: (bar: string, k: number) => `${bar}: ${n(k)} von anderen Trackern gemeldet`,
    legendOurs: "Von PickupChecker bestätigt",
  },

  feed: {
    empty: "Noch keine Restocks erfasst.",
    available: "Verfügbar",
    soldOut: "Ausverkauft",
    soldOutAt: (time: ReactNode) => <>ausverkauft {time}</>,
    since: (time: ReactNode) => <>aufgetaucht {time}</>,
    restockedAt: (time: ReactNode) => <>wieder da {time}</>,
    mapAria: (store: string) => `${store} auf der Karte zeigen`,
    map: "Karte",
    buyAria: (model: string, config: string) => `${model} ${config} auf apple.com kaufen`,
    buy: "Auf apple.com kaufen",
  },

  byConfig: {
    empty: (label: string, days: number) => `Keine Konfiguration war ${label} in den letzten ${days} Tagen wieder vorrätig – noch keine Rangliste.`,
    intro: (label: string, days: number) => `Welche Konfigurationen ${label} in den letzten ${days} Tagen wieder vorrätig waren, die häufigsten zuerst.`,
    times: (k: number) => `${n(k)}×`,
    alert: "Alarm stellen",
  },

  sellout: {
    typical: (label: string, band: string) => `Ein typischer iPhone-Duo-Restock ${label} war in etwa ${band} ausverkauft.`,
    half: (label: string, duration: string) => `Die Hälfte der Restocks ${label} war binnen ${duration} ausverkauft.`,
    none: (label: string, days: number) => `In den letzten ${days} Tagen war noch kein Restock ${label} ausverkauft.`,
    whatDuo: "iPhone Duo",
    whatAll: "alle iPhones",
    definition: "Die Angebotsdauer ist die Zeit, in der Apples Abholseite die Konfiguration als verfügbar zeigte, begrenzt durch zwei unserer Prüfungen; sie sagt nicht, wie viele Geräte verkauft wurden oder wie schnell Sie sein müssen.",
    tileHalf: (what: string) => <>Hälfte weg binnen · {what}</>,
    tileWithin30: "weg binnen 30 Sek.",
    tileWithin60: "weg binnen 1 Min.",
    tileFastest: (k: number, days: number) => <>am schnellsten · {n(k)} ausverkaufte Restocks, {days} Tg.</>,
    caption: (days: number) => `Nach iPhone, letzte ${days} Tage`,
    thIphone: "iPhone",
    thSoldOut: "Ausverkauft",
    thHalf: "Hälfte weg binnen",
    thWithin30: "≤ 30 Sek.",
    thWithin60: "≤ 1 Min.",
    thFastest: "Am schnellsten",
    each: "Restock für Restock",
    barNote: (full: string) => `Balken = Sekunden gelistet · voll bei ${full}`,
    stillListed: (duration: string) => `noch gelistet · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "So wird gemessen",
    measured: (estimated: boolean) =>
      `„In 45–60 Sek. ausverkauft“ heißt: Die Konfiguration war bei unserer Prüfung 45 Sekunden nach der ersten Sichtung noch gelistet und bei der Prüfung nach 60 Sekunden weg. Stores mit Alarm prüfen wir alle 5 Sekunden, alle anderen alle 15 – so breit ist jede Spanne${estimated ? "; ≈ markiert Restocks aus der Zeit, bevor wir die letzte Prüfung gespeichert haben, begrenzt durch die 15-Sekunden-Runde" : ""}. Ein Angebot, das kürzer als eine Prüfung ist, kann zwischen zwei Prüfungen kommen und gehen – der echte Anteil, der binnen 30 Sekunden weg ist, liegt also höher als angezeigt.`,
  },

  configTable: {
    title: "Jede Konfiguration in diesem Store",
    titleAt: (store: string) => `Jede Konfiguration bei ${store}`,
    lookupOff: (hasRows: boolean) => `Apple bietet für diesen Store gerade keine Abholabfrage an${hasRows ? " (die letzten Antworten stehen unten)" : ""}`,
    tracked: (k: number) => `${n(k)} Konfigurationen erfasst`,
    firstSweep: "Erste Prüfrunde läuft – der Status erscheint innerhalb einer Minute",
    inStock: (k: number, total: number) => `${n(k)} von ${n(total)} vorrätig`,
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    noLookup: "keine Abholabfrage",
    notChecked: "noch nicht geprüft",
    since: (ago: ReactNode) => <>aufgetaucht {ago}</>,
    lastAvailable: (ago: ReactNode) => <>zuletzt verfügbar {ago}</>,
    neverHere: "hier noch nie vorrätig gesehen",
    buy: "Kaufen",
    alertAria: (model: string, config: string, store: string) => `Alarm, sobald das ${model} ${config} bei ${store} verfügbar ist`,
    alert: "Alarm stellen →",
  },

  matrix: {
    store: "Store",
    checked: "Geprüft",
    cellTitle: (model: string, k: number, total: number) => `${model}: ${n(k)} von ${n(total)} Konfigurationen verfügbar`,
  },

  nearby: {
    duo: (short: string, k: number) => `${short} · ${n(k)}`,
    noDuo: (short: string) => `kein ${short}`,
  },

  stockByModel: {
    availableNow: (k: number, total: number) => `${n(k)} von ${n(total)} Konfigurationen jetzt verfügbar`,
    noneNow: (total: number) => `gerade keine der ${n(total)} Konfigurationen`,
    lookupOff: "Apple bietet hier gerade keine Abholabfrage an",
    notChecked: "noch nicht geprüft",
    more: (k: number) => `+${n(k)}`,
    checked: (ago: ReactNode) => <>geprüft {ago}</>,
    alert: "Alarm stellen →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>Geprüft {ago} · alle 15 Sek., 5 Sek. mit Alarm</>,
    map: "Auf der Karte zeigen",
    alert: "Hier Alarm stellen",
    alsoIn: (region: string) => `Außerdem ${inOrt(region)}`,
    acrossLine: "Nächste Stores im Nachbar-Bundesstaat",
    elsewhere: "Nächste Stores anderswo",
  },

  hours: {
    title: "Öffnungszeiten",
    local: (zone: string) => `Ortszeit · ${zone}`,
    today: (hours: string, week: string) => ` · heute ${hours} · ${week}`,
    directions: "Route",
    applePage: "Store-Seite auf apple.com",
    liveMap: "Live-Karte",
    storePage: "Store-Seite",
    closed: "Geschlossen",
    everyDay: (hours: string) => `Täglich ${hours}`,
    openNow: (closes: string) => `Jetzt geöffnet · schließt um ${closes}`,
    opensAt: (opens: string) => `Öffnet um ${opens}`,
    closedToday: (next: string | null) => (next ? `Heute geschlossen · öffnet ${next}` : "Heute geschlossen"),
    closedNow: (next: string | null) => (next ? `Jetzt geschlossen · öffnet ${next}` : "Jetzt geschlossen"),
    nextOpen: (day: string | null, time: string) => `${day ?? "morgen"} um ${time}`,
  },

  liveStats: {
    inStock: "Jetzt vorrätig",
    storesWith: "Stores m. Bestand",
    lastCheck: "Letzte Prüfung",
    none: "—",
  },

  board: {
    summary: (k: number, stores: number, short: string) => `${n(k)} von ${n(stores)} Stores haben das ${short} vorrätig`,
    lastCheck: (ago: ReactNode) => <>Letzte Prüfung {ago}</>,
    firstSweep: "Erste Prüfrunde läuft.",
    noneListed: (model: string, storage: string | null, color: string | null) => `Gerade hat kein Store das ${model}${storage ? ` ${storage}` : ""}${color ? ` in ${color}` : ""}.`,
    more: (k: number) => `+${n(k)}`,
    seen: (ago: ReactNode) => <>Gesehen {ago}</>,
    loading: "Verfügbarkeit wird geladen",
  },

  duoNow: {
    eyebrow: (label: string) => `iPhone Duo ${label} jetzt`,
    /** Verdict sentences. `stamp` is the local time stamp; `list` the in-stock stores (storeItem), joined. */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">Nicht vorrätig, Stand {o.stamp}</b>: {o.n === 1 ? `Der Apple Store ${o.label} bietet kein iPhone Duo zur Abholung an.` : `Keiner der ${n(o.n)} Apple Stores ${o.label} bietet ein iPhone Duo zur Abholung an.`}</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">Nicht vorrätig, Stand {o.stamp}</b>: {o.name} bietet keine iPhone-Duo-Konfiguration zur Abholung an.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">Vorrätig, Stand {o.stamp}</b>: {n(o.k)} von {n(o.n)} Apple {o.n === 1 ? "Store" : "Stores"} {o.label} {o.k === 1 ? "bietet" : "bieten"} ein iPhone Duo zur Abholung an – {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">Vorrätig, Stand {o.stamp}</b>: {o.name} bietet {n(o.k)} von {plural(o.total, "iPhone-Duo-Konfiguration", "iPhone-Duo-Konfigurationen")} zur Abholung an – {o.list}.</>,
    /** One in-stock store in the list: its link, how many configurations, and since when. */
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} ({plural(configs, "Konfiguration", "Konfigurationen")}{ago ? `, aufgetaucht ${ago}` : ""})</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (aufgetaucht ${ago})` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>Zuletzt vorrätig: <b className="text-ink">{o.config}</b>{o.store != null && <> bei {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `Kein bestätigter iPhone-Duo-Restock ${label} seit Beginn der Erfassung am ${since}.`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `Das iPhone 18 Pro ist hier in ${n(o.pro)} von ${n(o.configs)} Konfigurationen vorrätig, das 18 Pro Max in ${n(o.max)}.` : `Das iPhone 18 Pro gibt es in ${n(o.pro)} davon, das 18 Pro Max in ${n(o.max)}.`),
    evidence: (o) => (o.one
      ? (o.fresh > 0
        ? <>Stand {o.stamp}: {o.name} hat innerhalb der letzten Minute auf unsere Prüfung geantwortet.</>
        : <>Stand {o.stamp}: keine Antwort von {o.name} in der letzten Minute – Status unbekannt, nicht als ausverkauft gezählt.</>)
      : <>Stand {o.stamp}: {n(o.fresh)} von {n(o.total)} Stores {o.fresh === 1 ? "hat" : "haben"} innerhalb der letzten Minute geantwortet{o.stale > 0 ? `; ${n(o.stale)} ohne aktuelle Antwort – Status unbekannt, nicht als ausverkauft gezählt` : ""}.</>),
    evidenceNone: (o) => (o.one
      ? `${o.name} hat noch auf keine Prüfung geantwortet – Status unbekannt, nicht als ausverkauft gezählt.`
      : `Noch keiner der ${n(o.total)} Stores hat auf eine Prüfung geantwortet – Status unbekannt, nichts wird als ausverkauft gezählt.`),
    howCounted: (o) => {
      const base = "Ein Restock zählt erst nach zwei übereinstimmenden Antworten (erste Sichtungen zählen nicht); die Angebotsdauer liegt zwischen der letzten Prüfung, die die Konfiguration noch sah, und der ersten, die sie nicht mehr sah. Geplant sind Prüfungen alle 5 Sek. bei Stores mit Alarm und alle 15 Sek. bei jedem Store";
      const lanes = [
        o.fast && `im Median ${o.fast.p50} bei Stores mit Alarm (p95 ${o.fast.p95}, ${n(o.fast.n)} Intervalle${o.fast.slow ? "; langsamer als geplant" : ""})`,
        o.round && `${o.round.p50} pro voller Runde (p95 ${o.round.p95}, ${n(o.round.n)} Runden${o.round.slow ? "; langsamer als geplant" : ""})`,
      ].filter(Boolean);
      if (lanes.length === 0 || !o.win) return `${base}.`;
      const win = o.win.days ? `in den letzten ${n(o.win.days)} Tagen` : o.win.hours && o.win.hours > 1 ? `in den letzten ${n(o.win.hours)} Stunden` : "in der letzten Stunde";
      return `${base}; gemessen ${win}: ${lanes.join(" und ")}.`;
    },
    howLink: "So messen wir →",
    sec: (v) => `${v} Sek.`,
    technique: "PickupChecker fragt Apples Abholverfügbarkeit für jeden Apple Store ab: alle 5 Sekunden bei Stores mit Mitglieder-Alarm, alle 15 Sekunden bei jedem Store. Ein Restock zählt erst nach zwei übereinstimmenden Antworten (erste Sichtungen ausgenommen); die Angebotsdauer liegt zwischen der letzten Prüfung, die die Konfiguration noch sah, und der ersten, die sie nicht mehr sah.",
    /* Tiles */
    tShare: (range: string) => `der Restocks im Fenster ${range}`,
    tBusiest: (count: number) => `stärkste Stunde · ${restocks(count)}`,
    tHalf: "mittlere Angebotsdauer",
    tSince: (date: string) => `bestätigte Restocks seit ${date}`,
    tToday: "heute bisher",
    mostOften: (config: string, k: number, total: number) => `am häufigsten ${config} (${n(k)} von ${n(total)})`,
    /** German pages always say "Ortszeit"; US zone names are only for English. */
    zone: (tz: string | null): string => { void tz; return "Ortszeit"; },
    factsTitle: (label) => `Kernfakten: iPhone Duo ${label}`,
    fN: (o) => <>PickupChecker hat seit dem {o.since} <b className="text-ink">{n(o.n)}</b> {o.n === 1 ? "iPhone-Duo-Restock" : "iPhone-Duo-Restocks"} {o.one ? o.label : o.stores === 1 ? `im Apple Store ${o.label}` : `in den ${n(o.stores)} Apple Stores ${o.label}`} bestätigt, an {o.days === 1 ? "einem Tag" : `${n(o.days)} verschiedenen Tagen`}.</>,
    fShare: (o) => <><b className="text-ink">{o.pct}</b> der {n(o.n)} iPhone-Duo-Restocks {o.label} seit dem {o.since} fielen in das Fenster {o.range} {o.zone}; die stärkste Stunde war {o.busiest} ({restocks(o.busiestN)}).</>,
    fTooFew: (o) => `${plural(o.n, "bestätigter iPhone-Duo-Restock", "bestätigte iPhone-Duo-Restocks")} ${o.label} an ${o.days === 1 ? "einem Tag" : `${n(o.days)} Tagen`} – zu wenige für eine übliche Uhrzeit: PickupChecker nennt sie erst ab ${n(o.min)} Restocks an ${n(o.minDays)} verschiedenen Tagen.`,
    fMedian: (o) => <>Im Median stand ein iPhone Duo {o.label} <b className="text-ink">etwa {o.median}</b> auf Apples Abholseite ({n(o.n)} gemessene Angebote seit dem {o.since}).</>,
    fTop: (o) => <>Die am häufigsten aufgefüllte iPhone-Duo-Konfiguration {o.label} ist das <b className="text-ink">{o.config}</b>: {n(o.k)} von {n(o.n)} Restocks ({o.pct}) seit dem {o.since}.</>,
    fToday: (o) => (o.n > 0
      ? <>Heute ({o.date}, Ortszeit) hat PickupChecker {o.label} bisher <b className="text-ink">{n(o.n)}</b> {o.n === 1 ? "iPhone-Duo-Restock" : "iPhone-Duo-Restocks"} bestätigt.</>
      : <>Heute ({o.date}, Ortszeit) hat PickupChecker {o.label} bisher keinen iPhone-Duo-Restock bestätigt.</>),
    hourByHour: "Stunde für Stunde, jeder Store →",
    lastThree: (k: number, label: string) => (k === 1 ? `Der letzte iPhone-Duo-Restock ${label}` : `Die letzten ${n(k)} iPhone-Duo-Restocks ${label}`),
    secs: (x: number) => `${n(x)} s`,
    mins: (x: number) => `${n(x)} Min.`,
    listedRange: (low: string, high: string) => `${low}–${high} angeboten`,
    listedAbout: (x: string) => `etwa ${x} angeboten`,
    stillListed: (x: string) => `noch angeboten (${x})`,
    ago: (x: string) => `vor ${x}`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `In den letzten ${n(o.days)} Tagen hat PickupChecker ${plural(o.sent, "Alarm", "Alarme")} zu iPhone-Duo-Restocks ${o.label} an Mitglieder verschickt.`
      : `In den letzten ${n(o.days)} Tagen hat PickupChecker ${plural(o.sent, "Alarm", "Alarme")} zu iPhone-Duo-Restocks in ${n(o.stores)} von ${n(o.total)} Apple ${o.total === 1 ? "Store" : "Stores"} ${o.label} an Mitglieder verschickt.`),
    alertMe: (label: string) => `Alarm ${label} stellen`,
    unknown: "Das Restock-Muster ließ sich gerade nicht lesen; die Live-Verfügbarkeit auf dieser Seite ist nicht betroffen.",
    allModels: (o: { n: number; days: number; peak: string | null }) => `Alle drei iPhones: ${restocks(o.n)} in ${n(o.days)} Tagen${o.peak ? `, die meisten gegen ${o.peak}` : ""}.`,
  },
};
