/**
 * Dutch strings: modules — the restock, store and stock modules. `label` is a place phrase the page builds
 * ("in Noord-Holland", "bij Apple Haarlem", "hier"); numbers arrive raw and are formatted here.
 * Check intervals are only ever 15 seconds (every store) and 5 seconds (stores with alerts).
 */
import type { ReactNode } from "react";
import { num } from "@/lib/i18n/format";
import { colorLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";

const L = "nl" as const;
const n$ = (v: number) => num(L, v);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
/** "1 aanvulling", "3 aanvullingen". */
const cnt = (n: number, one: string, many: string) => `${n$(n)} ${n === 1 ? one : many}`;
const CHECK = "elke 15 sec., 5 sec. met een alert";

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `In de afgelopen ${n$(days)} dagen is ${label} nog niets aangevuld of uitverkocht — de grafiek vult zich vanaf de eerste aanvulling.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${cnt(restocks, "aanvulling", "aanvullingen")} en ${n$(soldouts)} keer uitverkocht ${label} in de afgelopen ${n$(days)} dagen, op ${cnt(activeDays, "dag", "verschillende dagen")}.`,
    busiest: (day: string, restocks: number) => <> De drukste dag was <b className="text-ink">{day}</b> met {n$(restocks)}.</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: ${cnt(restocks, "aanvulling", "aanvullingen")}, ${n$(soldouts)} keer uitverkocht`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: ${cnt(restocks, "aanvulling", "aanvullingen")} · ${n$(soldouts)} keer uitverkocht`,
    legendRestocks: "aanvullingen",
    legendSoldouts: "uitverkocht",
  },

  last24: {
    title: (label: string) => `iPhone Duo-aanvullingen ${label} in de afgelopen 24 uur`,
    asOf: (when: string) => `stand van ${when}`,
    localTime: (when: string) => `${when} lokale tijd`,
    anAppleStore: "een Apple Store",
    unknown: "Het aantal van de afgelopen 24 uur kon nu niet worden gelezen; de live voorraad en het voorraadlogboek op deze pagina werken gewoon.",
    none: (label: string, asOf: string) => <><b className="text-ink">Geen iPhone Duo-aanvulling {label} in de afgelopen 24 uur</b> (stand van {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>In de afgelopen 24 uur kwam de iPhone Duo <b className="text-ink">{`${n$(o.restocks)} keer`} terug {o.one ? o.label : `in ${n$(o.withStores)} van de ${n$(o.allStores)} Apple Store${o.allStores === 1 ? "" : "s"} ${o.label}`}</b>; de laatste: <b className="text-ink">{o.config}</b>{o.store != null && <> bij {o.store}</>}, {o.when} lokale tijd.</>
    ),
    tileRestocks: "bevestigde aanvullingen · 24 u",
    tileConfigsBack: "configuraties die terugkwamen",
    tileStores: (configs: number, allConfigs: number) => `winkels met een aanvulling${configs ? ` · ${n$(configs)} van ${n$(allConfigs)} configuraties` : ""}`,
    tileLatest: (config: string, store: string | null) => <>laatste · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>laatste daarvoor · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "geen eerdere aanvulling bekend",
    caption: (label: string, asOf: string) => `Bevestigde aanvullingen per iPhone Duo-configuratie ${label}, afgelopen 24 uur, stand van ${asOf}`,
    thConfig: "Configuratie",
    thRestocks: "Aanvullingen",
    thStores: "Winkels",
    thLast: "Laatste aanvulling (lokale tijd)",
    thNow: "Nu op voorraad",
    ofStores: (n: number, total: number) => `${n$(n)} van ${n$(total)}`,
    noneIn24: "geen in 24 u",
    yes: "ja",
    no: "nee",
    countedTitle: "Zo tellen we aanvullingen",
    counted: "PickupChecker controleert zelf de ophaalvoorraad op apple.com: elke winkel elke 15 seconden, de winkels met alerts elke 5. Een aanvulling telt pas als twee checks het eens zijn; de allereerste keer dat we een winkel zien telt niet mee; meldingen van andere trackers tellen nooit mee.",
    alert: (label: string | null) => `Waarschuw me${label != null ? ` ${label}` : ""} → de volgende binnen seconden`,
  },

  clock: {
    none: (label: string, days: number) => `${cap(label)} zijn in de afgelopen ${n$(days)} dagen nog geen aanvullingen gelogd.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${cnt(total, "aanvulling", "aanvullingen")} ${label} in de afgelopen ${n$(days)} dagen${dates != null ? ` (op ${cnt(dates, "dag", "dagen")})` : ""} — te weinig om al een patroon te noemen.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{cnt(total, "aanvulling", "aanvullingen")} {label} in de afgelopen {n$(days)} dagen. De meeste komen rond <b className="text-ink">{hour}</b> lokale tijd{day ? <>, en <b className="text-ink">{day}</b> is de drukste dag</> : null}.</>
    ),
    byHour: (zone: string) => `Per uur · ${zone}`,
    byWeekday: "Per weekdag",
    barReported: (n: number) => ` (+${n$(n)} gemeld door andere trackers)`,
    barReportedTitle: (bar: string, n: number) => `${bar}: ${n$(n)} gemeld door andere trackers`,
    legendOurs: "Bevestigd door PickupChecker",
  },

  feed: {
    empty: "Nog geen aanvullingen gelogd.",
    available: "Beschikbaar",
    soldOut: "Uitverkocht",
    soldOutAt: (time: ReactNode) => <>uitverkocht {time}</>,
    since: (time: ReactNode) => <>sinds {time}</>,
    restockedAt: (time: ReactNode) => <>aangevuld {time}</>,
    mapAria: (store: string) => `${store} op de kaart tonen`,
    map: "Kaart",
    buyAria: (model: string, config: string) => `De ${model} ${config} kopen op apple.com`,
    buy: "Kopen op apple.com",
  },

  byConfig: {
    empty: (label: string, days: number) => `${cap(label)} is in de afgelopen ${n$(days)} dagen geen enkele configuratie aangevuld, dus er is nog geen ranglijst.`,
    intro: (label: string, days: number) => `Welke configuraties ${label} terugkwamen in de afgelopen ${n$(days)} dagen, de vaakste eerst.`,
    times: (n: number) => `${n$(n)}×`,
    alert: "Waarschuw me",
  },

  sellout: {
    typical: (label: string, band: string) => `Een gemiddelde iPhone Duo-aanvulling ${label} was in zo'n ${band} uitverkocht.`,
    half: (label: string, duration: string) => `De helft van de aanvullingen ${label} was binnen ${duration} uitverkocht.`,
    none: (label: string, days: number) => `${cap(label)} is in de afgelopen ${n$(days)} dagen nog geen aanvulling uitverkocht geraakt.`,
    whatDuo: "iPhone Duo",
    whatAll: "alle iPhones",
    tileHalf: (what: string) => <>helft weg binnen · {what}</>,
    tileWithin30: "weg binnen 30 sec.",
    tileWithin60: "weg binnen 1 min.",
    tileFastest: (n: number, days: number) => <>snelste · {n$(n)} keer uitverkocht, {n$(days)} d</>,
    caption: (days: number) => `Per iPhone, laatste ${n$(days)} dagen`,
    thIphone: "iPhone",
    thSoldOut: "Uitverkocht",
    thHalf: "Helft weg binnen",
    thWithin30: "≤ 30 sec.",
    thWithin60: "≤ 1 min.",
    thFastest: "Snelste",
    each: "Aanvulling voor aanvulling",
    barNote: (full: string) => `balk = seconden te koop · vol bij ${full}`,
    stillListed: (duration: string) => `nog te koop · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "Zo meten we dit",
    measured: (estimated: boolean) =>
      `"Uitverkocht in 45–60 sec." betekent: bij onze check 45 seconden nadat we de configuratie voor het eerst zagen, stond hij nog te koop, en bij de check na 60 seconden was hij weg. Winkels met alerts checken we elke 5 seconden, alle andere elke 15, dus zo breed is elk bereik${estimated ? "; ≈ markeert aanvullingen van vóór we de laatste check vastlegden, begrensd door de ronde van 15 seconden" : ""}. Een aanbod dat korter duurt dan één check kan tussen twee checks verschijnen en weer verdwijnen, dus het echte aandeel dat binnen 30 seconden weg is, ligt hoger dan hier staat.`,
  },

  configTable: {
    title: "Elke configuratie in deze winkel",
    titleAt: (store: string) => `Elke configuratie bij ${store}`,
    lookupOff: (hasRows: boolean) => `Apple biedt in deze winkel nu geen voorraadcheck voor ophalen aan${hasRows ? " (de laatste antwoorden staan hieronder)" : ""}`,
    tracked: (n: number) => `${n$(n)} configuraties gevolgd`,
    firstSweep: "Eerste ronde bezig — de status verschijnt binnen een minuut",
    inStock: (n: number, total: number) => `${n$(n)} van ${n$(total)} op voorraad`,
    available: "Beschikbaar",
    unavailable: "Niet beschikbaar",
    noLookup: "geen ophaalcheck",
    notChecked: "nog niet gecheckt",
    since: (ago: ReactNode) => <>{ago} verschenen</>,
    lastAvailable: (ago: ReactNode) => <>laatst beschikbaar {ago}</>,
    neverHere: "hier nog nooit op voorraad gezien",
    buy: "Kopen",
    alertAria: (model: string, config: string, store: string) => `Waarschuw me als de ${model} ${config} beschikbaar is bij ${store}`,
    alert: "Waarschuw me →",
  },

  matrix: {
    store: "Winkel",
    checked: "Gecheckt",
    cellTitle: (model: string, n: number, total: number) => `${model}: ${n$(n)} van ${n$(total)} configuraties beschikbaar`,
  },

  nearby: {
    duo: (short: string, n: number) => `${short} · ${n$(n)}`,
    noDuo: (short: string) => `geen ${short}`,
  },

  stockByModel: {
    availableNow: (n: number, total: number) => `${n$(n)} van ${n$(total)} configuraties nu beschikbaar`,
    noneNow: (total: number) => `nu geen van de ${n$(total)} configuraties`,
    lookupOff: "Apple biedt hier nu geen ophaalcheck aan",
    notChecked: "nog niet gecheckt",
    more: (n: number) => `+${n$(n)}`,
    checked: (ago: ReactNode) => <>gecheckt {ago}</>,
    alert: "Waarschuw me →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>Gecheckt {ago} · {CHECK}</>,
    map: "Op de kaart",
    alert: "Waarschuw me hier",
    alsoIn: (region: string) => `Ook in ${region}`,
    acrossLine: "Dichtstbijzijnde winkels over de staatsgrens",
    elsewhere: "Dichtstbijzijnde winkels elders",
  },

  hours: {
    title: "Openingstijden",
    local: (zone: string) => `Lokale tijd · ${zone}`,
    today: (hours: string, week: string) => ` · vandaag ${hours} · ${week}`,
    directions: "Route",
    applePage: "winkelpagina op apple.com",
    liveMap: "Live kaart",
    storePage: "Winkelpagina",
    closed: "Gesloten",
    everyDay: (hours: string) => `Elke dag ${hours}`,
    openNow: (closes: string) => `Nu open · sluit om ${closes}`,
    opensAt: (opens: string) => `Opent om ${opens}`,
    closedToday: (next: string | null) => (next ? `Vandaag gesloten · opent ${next}` : "Vandaag gesloten"),
    closedNow: (next: string | null) => (next ? `Nu gesloten · opent ${next}` : "Nu gesloten"),
    nextOpen: (day: string | null, time: string) => `${day ?? "morgen"} om ${time}`,
  },

  liveStats: {
    inStock: "Nu op voorraad",
    storesWith: "Winkels met voorraad",
    lastCheck: "Laatste check",
    none: "—",
  },

  board: {
    summary: (n: number, stores: number, short: string) => `${n$(n)} van de ${n$(stores)} winkels ${n === 1 ? "heeft" : "hebben"} de ${short} op voorraad`,
    lastCheck: (ago: ReactNode) => <>Laatste check {ago}</>,
    firstSweep: "Eerste ronde bezig.",
    noneListed: (model: string, storage: string | null, color: string | null) => `Geen enkele winkel heeft de ${model}${storage ? ` ${storage}` : ""}${color ? ` in ${colorLabel(color, L)}` : ""} nu op voorraad.`,
    more: (n: number) => `+${n$(n)}`,
    seen: (ago: ReactNode) => <>Gezien {ago}</>,
    loading: "Voorraad laden",
  },

  duoNow: {
    eyebrow: (label: string) => `iPhone Duo ${label} nu`,
    /** Verdict sentences. `stamp` is the local time stamp; `list` the in-stock stores (storeItem), joined. */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">Niet op voorraad, stand van {o.stamp}</b>: {o.n === 1 ? `de Apple Store ${o.label} heeft geen iPhone Duo om af te halen.` : `geen van de ${n$(o.n)} Apple Stores ${o.label} heeft een iPhone Duo om af te halen.`}</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">Niet op voorraad, stand van {o.stamp}</b>: {o.name} heeft geen enkele iPhone Duo-configuratie om af te halen.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">Op voorraad, stand van {o.stamp}</b>: {n$(o.k)} van de {n$(o.n)} Apple Store{o.n === 1 ? "" : "s"} {o.label} {o.k === 1 ? "heeft" : "hebben"} een iPhone Duo om af te halen — {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">Op voorraad, stand van {o.stamp}</b>: {o.name} heeft {n$(o.k)} van {cnt(o.total, "iPhone Duo-configuratie", "iPhone Duo-configuraties")} om af te halen — {o.list}.</>,
    /** One in-stock store in the list: its link, how many configurations, and since when. */
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} ({cnt(configs, "configuratie", "configuraties")}{ago ? `, verschenen ${ago}` : ""})</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (verschenen ${ago})` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>Laatst op voorraad: <b className="text-ink">{o.config}</b>{o.store != null && <> bij {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `Geen bevestigde iPhone Duo-aanvulling ${label} sinds we op ${since} begonnen te volgen.`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `De iPhone 18 Pro is hier in ${n$(o.pro)} van de ${n$(o.configs)} configuraties op voorraad, de 18 Pro Max in ${n$(o.max)}.` : `De iPhone 18 Pro is in ${n$(o.pro)} daarvan op voorraad, de 18 Pro Max in ${n$(o.max)}.`),
    updated: (stamp: string) => `Bijgewerkt ${stamp}`,
    checked: (note: string) => `gecontroleerd ${note}`,
    since: (date: string) => `gegevens sinds ${date}`,
    method: "een aanvulling telt alleen als twee checks het eens zijn; de eerste keer dat we iets zien telt niet",
    /* Tiles */
    tShare: (range: string) => `van de aanvullingen tussen ${range}`,
    tBusiest: (count: number) => `drukste uur · ${cnt(count, "aanvulling", "aanvullingen")}`,
    tHalf: "helft uitverkocht binnen",
    tSince: (date: string) => `bevestigde aanvullingen sinds ${date}`,
    tToday: "vandaag, tot nu toe",
    mostOften: (config: string, k: number, total: number) => `het vaakst ${config} (${n$(k)} van ${n$(total)})`,
    /** Dutch pages always say "lokale tijd"; US zone names are only for English. */
    zone: (tz: string | null): string => { void tz; return "lokale tijd"; },
    summary: (o: { pct: string; n: number; stores: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number; median: string | null; config: string | null; k: number; one: boolean }) =>
      `${o.pct} van de ${cnt(o.n, "iPhone Duo-aanvulling", "iPhone Duo-aanvullingen")} die PickupChecker sinds ${o.since} ${o.one ? o.label : o.stores === 1 ? `in de Apple Store ${o.label}` : `in de ${n$(o.stores)} Apple Stores ${o.label}`} bevestigde, viel tussen ${o.range} ${o.zone}; het drukste uur was ${o.busiest} (${n$(o.busiestN)}).${o.median ? ` De helft was binnen ${o.median} uitverkocht.` : ""}${o.config ? ` De ${o.config} kwam het vaakst terug (${n$(o.k)} van ${n$(o.n)}).` : ""}`,
    tooFew: (o: { n: number; label: string; since: string; one: boolean; stores: number }) => `${cnt(o.n, "bevestigde iPhone Duo-aanvulling", "bevestigde iPhone Duo-aanvullingen")} ${o.one ? o.label : o.stores === 1 ? `in de Apple Store ${o.label}` : `in de ${n$(o.stores)} Apple Stores ${o.label}`} sinds ${o.since} — te weinig om al een vast uur te noemen; ze staan hieronder allemaal.`,
    hourByHour: "Per uur, elke winkel →",
    lastThree: (k: number, label: string) => (k === 1 ? `De laatste iPhone Duo-aanvulling ${label}` : `De laatste ${n$(k)} iPhone Duo-aanvullingen ${label}`),
    secs: (x: number) => `${n$(x)} s`,
    mins: (x: number) => `${n$(x)} min`,
    listedRange: (low: string, high: string) => `${low}–${high} beschikbaar`,
    listedAbout: (x: string) => `ongeveer ${x} beschikbaar`,
    stillListed: (x: string) => `nog beschikbaar (${x})`,
    ago: (x: string) => `${x} geleden`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `In de afgelopen ${n$(o.days)} dagen stuurde PickupChecker leden ${cnt(o.sent, "alert", "alerts")} voor iPhone Duo-aanvullingen ${o.label}.`
      : `In de afgelopen ${n$(o.days)} dagen stuurde PickupChecker leden ${cnt(o.sent, "alert", "alerts")} voor iPhone Duo-aanvullingen in ${n$(o.stores)} van de ${n$(o.total)} Apple Store${o.total === 1 ? "" : "s"} ${o.label}.`),
    alertMe: (label: string) => `Waarschuw me ${label}`,
    unknown: "Het aanvulpatroon kon nu niet worden gelezen; de live voorraad op deze pagina werkt gewoon.",
    allModels: (o: { n: number; days: number; peak: string | null }) => `Alle drie de iPhones: ${cnt(o.n, "aanvulling", "aanvullingen")} in ${n$(o.days)} dagen${o.peak ? `, de meeste rond ${o.peak}` : ""}.`,
  },
};
