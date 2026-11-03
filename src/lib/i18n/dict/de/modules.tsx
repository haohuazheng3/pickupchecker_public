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
};
