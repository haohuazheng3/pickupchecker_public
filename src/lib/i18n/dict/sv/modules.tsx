/**
 * Swedish strings: modules — the restock, store and stock modules. `label` arrives with its preposition
 * ("i Sverige", "på Apple Emporia", "här"); numbers arrive raw and are written Swedish style (12 345).
 * Check intervals are only ever 15 seconds (every store) and 5 seconds (stores with alerts).
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import { n, pl } from "./util";

export const modules: Dict["modules"] = {
  daily: {
    empty: (label: string, days: number) => `Ingen påfyllning och inget slutsålt har loggats ${label} de senaste ${days} dagarna – diagrammet fylls i från den första.`,
    summary: (restocks: number, soldouts: number, label: string, days: number, activeDays: number) =>
      `${pl(restocks, "påfyllning", "påfyllningar")} och ${n(soldouts)} slutsålda ${label} de senaste ${days} dagarna, på ${pl(activeDays, "dag", "olika dagar")}.`,
    busiest: (day: string, restocks: number) => <> Flest kom <b className="text-ink">{day}</b>: {n(restocks)}.</>,
    barAria: (day: string, restocks: number, soldouts: number) => `${day}: ${pl(restocks, "påfyllning", "påfyllningar")}, ${n(soldouts)} slutsålda`,
    barTitle: (day: string, restocks: number, soldouts: number) => `${day}: ${pl(restocks, "påfyllning", "påfyllningar")} · ${n(soldouts)} slutsålda`,
    legendRestocks: "påfyllningar",
    legendSoldouts: "slutsålda",
  },

  last24: {
    title: (label: string) => `Påfyllningar av iPhone Duo ${label} de senaste 24 timmarna`,
    asOf: (when: string) => `per ${when}`,
    localTime: (when: string) => `${when} lokal tid`,
    anAppleStore: "en Apple Store",
    unknown: "Antalet för de senaste 24 timmarna gick inte att läsa just nu; lagret live och påfyllningsloggen på sidan påverkas inte.",
    none: (label: string, asOf: string) => <><b className="text-ink">Ingen påfyllning av iPhone Duo {label} de senaste 24 timmarna</b> (per {asOf}).</>,
    some: (o: { restocks: number; one: boolean; label: string; withStores: number; allStores: number; config: string; store: ReactNode | null; when: string }) => (
      <>De senaste 24 timmarna har iPhone Duo fyllts på <b className="text-ink">{pl(o.restocks, "gång", "gånger")} {o.one ? o.label : `i ${o.withStores} av ${o.allStores} Apple Store-butiker ${o.label}`}</b>; senast: <b className="text-ink">{o.config}</b>{o.store != null && <> på {o.store}</>}, {o.when} lokal tid.</>
    ),
    tileRestocks: "bekräftade påfyllningar · 24 tim",
    tileConfigsBack: "konfigurationer som kom tillbaka",
    tileStores: (configs: number, allConfigs: number) => `butiker med påfyllning${configs ? ` · ${configs} av ${allConfigs} konfigurationer` : ""}`,
    tileLatest: (config: string, store: string | null) => <>senast · {config}{store != null && <> · {store}</>}</>,
    tileBefore: (config: string, store: string | null, day: string) => <>senast före det · {config}{store != null && <> · {store}</>} · {day}</>,
    tileNoEarlier: "ingen tidigare påfyllning registrerad",
    caption: (label: string, asOf: string) => `Bekräftade påfyllningar av varje iPhone Duo-konfiguration ${label}, senaste 24 timmarna, per ${asOf}`,
    thConfig: "Konfiguration",
    thRestocks: "Påfyllningar",
    thStores: "Butiker",
    thLast: "Senaste påfyllning (lokal tid)",
    thNow: "I lager nu",
    ofStores: (k: number, total: number) => `${k} av ${total}`,
    noneIn24: "ingen på 24 tim",
    yes: "ja",
    no: "nej",
    countedTitle: "Så räknas påfyllningar",
    counted: "PickupCheckers egna kontroller av hämtning i butik på apple.com: varje butik var 15:e sekund, butikerna med bevakning var 5:e. En påfyllning loggas bara när två kontroller stämmer överens; första gången en butik ses räknas inte, och andra bevakningstjänsters rapporter blandas aldrig in.",
    alert: (label: string | null) => `Bevaka${label != null ? ` ${label}` : ""} → nästa på några sekunder`,
  },

  clock: {
    none: (label: string, days: number) => `Inga påfyllningar registrerade ${label} de senaste ${days} dagarna ännu.`,
    thin: (total: number, label: string, days: number, dates: number | null) =>
      `${pl(total, "påfyllning", "påfyllningar")} ${label} de senaste ${days} dagarna${dates != null ? ` (på ${pl(dates, "dag", "dagar")})` : ""} – för få för att se ett mönster ännu.`,
    pattern: (total: number, label: string, days: number, hour: string, day: string | null) => (
      <>{pl(total, "påfyllning", "påfyllningar")} {label} de senaste {days} dagarna. De flesta kommer runt <b className="text-ink">{hour}</b> lokal tid{day ? <>, och flest blir det på <b className="text-ink">{day}ar</b></> : null}.</>
    ),
    byHour: (zone: string) => `Per timme · ${zone}`,
    byWeekday: "Per veckodag",
    barReported: (k: number) => ` (+${k} rapporterade av andra bevakningstjänster)`,
    barReportedTitle: (bar: string, k: number) => `${bar}: ${k} rapporterade av andra bevakningstjänster`,
    legendOurs: "Bekräftat av PickupChecker",
  },

  feed: {
    empty: "Inga påfyllningar registrerade ännu.",
    available: "Tillgänglig",
    soldOut: "Slutsåld",
    soldOutAt: (time: ReactNode) => <>slutsåld {time}</>,
    since: (time: ReactNode) => <>sedan {time}</>,
    restockedAt: (time: ReactNode) => <>påfylld {time}</>,
    mapAria: (store: string) => `Visa ${store} på kartan`,
    map: "Karta",
    buyAria: (model: string, config: string) => `Köp ${model} ${config} på apple.com`,
    buy: "Köp på apple.com",
  },

  byConfig: {
    empty: (label: string, days: number) => `Ingen konfiguration har fyllts på ${label} de senaste ${days} dagarna, så det finns ingen topplista ännu.`,
    intro: (label: string, days: number) => `Konfigurationerna som kom tillbaka ${label} de senaste ${days} dagarna, de vanligaste först.`,
    times: (k: number) => `${k}×`,
    alert: "Bevaka",
  },

  sellout: {
    typical: (label: string, band: string) => `En typisk påfyllning av iPhone Duo ${label} var slutsåld efter ungefär ${band}.`,
    half: (label: string, duration: string) => `Hälften av påfyllningarna ${label} var slutsålda inom ${duration}.`,
    none: (label: string, days: number) => `Ingen påfyllning ${label} har tagit slut de senaste ${days} dagarna ännu.`,
    whatDuo: "iPhone Duo",
    whatAll: "alla iPhone",
    tileHalf: (what: string) => <>hälften slut inom · {what}</>,
    tileWithin30: "slut inom 30 s",
    tileWithin60: "slut inom 1 min",
    tileFastest: (k: number, days: number) => <>snabbast · {pl(k, "slutsåld påfyllning", "slutsålda påfyllningar")}, {days} d</>,
    caption: (days: number) => `Per iPhone, senaste ${days} dagarna`,
    thIphone: "iPhone",
    thSoldOut: "Slutsålda",
    thHalf: "Hälften slut inom",
    thWithin30: "≤ 30 s",
    thWithin60: "≤ 1 min",
    thFastest: "Snabbast",
    each: "Påfyllning för påfyllning",
    barNote: (full: string) => `stapel = sekunder i lager · full vid ${full}`,
    stillListed: (duration: string) => `fortfarande i lager · ${duration}`,
    approx: (range: string) => `≈ ${range}`,
    measuredTitle: "Så mäts det",
    measured: (estimated: boolean) =>
      `”Slutsåld på 45–60 s” betyder att konfigurationen fortfarande fanns kvar vid vår kontroll 45 sekunder efter att vi först såg den och var borta vid kontrollen 60 sekunder efter. Butiker med bevakning kollas var 5:e sekund, alla andra var 15:e, och det är bredden på varje intervall${estimated ? "; ≈ markerar påfyllningar från innan vi sparade den senaste kontrollen, och där är 15-sekundersvarvet gränsen i stället" : ""}. Något som ligger ute kortare än en kontroll kan komma och gå mellan två av dem, så den verkliga andelen som tar slut inom 30 sekunder är högre än den som visas.`,
  },

  configTable: {
    title: "Alla konfigurationer i den här butiken",
    titleAt: (store: string) => `Alla konfigurationer på ${store}`,
    lookupOff: (hasRows: boolean) => `Apple erbjuder just nu ingen koll av hämtning i butik för den här butiken${hasRows ? " (de senaste svaren den gav visas nedan)" : ""}`,
    tracked: (k: number) => `${k} konfigurationer bevakas`,
    firstSweep: "Första kontrollen pågår – status visas inom en minut",
    inStock: (k: number, total: number) => `${k} av ${total} i lager`,
    available: "Tillgänglig",
    unavailable: "Inte tillgänglig",
    noLookup: "ingen koll av hämtning",
    notChecked: "inte kollad än",
    since: (ago: ReactNode) => <>sedan {ago}</>,
    lastAvailable: (ago: ReactNode) => <>senast tillgänglig {ago}</>,
    neverHere: "aldrig sedd i lager här",
    buy: "Köp",
    alertAria: (model: string, config: string, store: string) => `Bevaka ${model} ${config} på ${store}`,
    alert: "Bevaka →",
  },

  matrix: {
    store: "Butik",
    checked: "Kollad",
    cellTitle: (model: string, k: number, total: number) => `${model}: ${k} av ${total} konfigurationer tillgängliga`,
  },

  nearby: {
    duo: (short: string, k: number) => `${short} · ${k}`,
    noDuo: (short: string) => `ingen ${short}`,
  },

  stockByModel: {
    availableNow: (k: number, total: number) => `${k} av ${total} konfigurationer tillgängliga nu`,
    noneNow: (total: number) => `ingen av ${total} konfigurationer just nu`,
    lookupOff: "Apple erbjuder just nu ingen koll av hämtning här",
    notChecked: "inte kollad än",
    more: (k: number) => `+${k}`,
    checked: (ago: ReactNode) => <>kollad {ago}</>,
    alert: "Bevaka →",
  },

  storeBlock: {
    checked: (ago: ReactNode) => <>Kollad {ago} · var 15:e sekund, var 5:e med bevakning</>,
    map: "Visa på kartan",
    alert: "Bevaka här",
    alsoIn: (region: string) => `Också i ${region}`,
    acrossLine: "Närmaste butikerna på andra sidan delstatsgränsen",
    elsewhere: "Närmaste butikerna på andra håll",
  },

  hours: {
    title: "Öppettider",
    local: (zone: string) => `Lokal tid · ${zone}`,
    today: (hours: string, week: string) => ` · idag ${hours} · ${week}`,
    directions: "Vägbeskrivning",
    applePage: "Butikssidan på apple.com",
    liveMap: "Livekarta",
    storePage: "Butikssida",
    closed: "Stängt",
    everyDay: (hours: string) => `Alla dagar ${hours}`,
    openNow: (closes: string) => `Öppet nu · stänger kl. ${closes}`,
    opensAt: (opens: string) => `Öppnar kl. ${opens}`,
    closedToday: (next: string | null) => (next ? `Stängt idag · öppnar ${next}` : "Stängt idag"),
    closedNow: (next: string | null) => (next ? `Stängt nu · öppnar ${next}` : "Stängt nu"),
    nextOpen: (day: string | null, time: string) => `${day ?? "i morgon"} kl. ${time}`,
  },

  liveStats: {
    inStock: "I lager nu",
    storesWith: "Butiker med lager",
    lastCheck: "Senaste kontroll",
    none: "—",
  },

  board: {
    summary: (k: number, stores: number, short: string) => `${k} av ${stores} butiker har ${short} i lager`,
    lastCheck: (ago: ReactNode) => <>Senaste kontroll {ago}</>,
    firstSweep: "Första kontrollen pågår.",
    noneListed: (model: string, storage: string | null, color: string | null) => `Ingen butik har ${model}${storage ? ` ${storage}` : ""}${color ? ` i ${color}` : ""} just nu.`,
    more: (k: number) => `+${k}`,
    seen: (ago: ReactNode) => <>Sedd {ago}</>,
    loading: "Laddar lager",
  },

  duoNow: {
    eyebrow: (label: string) => `iPhone Duo ${label} just nu`,
    /** Verdict sentences. `stamp` is the local time stamp; `list` the in-stock stores (storeItem), joined. */
    notNow: (o: { stamp: string; n: number; label: string }) => <><b className="text-ink">Inte i lager, per {o.stamp}</b>: {o.n === 1 ? `Apple Store-butiken ${o.label} har ingen iPhone Duo för hämtning.` : `ingen av de ${n(o.n)} Apple Store-butikerna ${o.label} har någon iPhone Duo för hämtning.`}</>,
    notNowOne: (o: { stamp: string; name: string }) => <><b className="text-ink">Inte i lager, per {o.stamp}</b>: {o.name} har ingen iPhone Duo-konfiguration för hämtning.</>,
    inStock: (o: { stamp: string; k: number; n: number; label: string; list: ReactNode }) => <><b className="text-ink">I lager, per {o.stamp}</b>: {n(o.k)} av {o.n === 1 ? "1 Apple Store-butik" : `${n(o.n)} Apple Store-butiker`} {o.label} har iPhone Duo för hämtning – {o.list}.</>,
    inStockOne: (o: { stamp: string; k: number; total: number; name: string; list: ReactNode }) => <><b className="text-ink">I lager, per {o.stamp}</b>: {o.name} har {n(o.k)} av {pl(o.total, "iPhone Duo-konfiguration", "iPhone Duo-konfigurationer")} för hämtning – {o.list}.</>,
    /** One in-stock store in the list: its link, how many configurations, and since when. */
    storeItem: (store: ReactNode, configs: number, ago: string | null) => <>{store} ({pl(configs, "konfiguration", "konfigurationer")}{ago ? `, upplagd ${ago}` : ""})</>,
    configItem: (config: string, ago: string | null) => <>{config}{ago ? ` (upplagd ${ago})` : ""}</>,
    lastIn: (o: { config: string; store: ReactNode | null; when: string; lasted: string | null }) => <>Senast i lager: <b className="text-ink">{o.config}</b>{o.store != null && <> på {o.store}</>}, {o.when}{o.lasted ? <> ({o.lasted})</> : null}.</>,
    neverYet: (label: string, since: string) => `Ingen bekräftad påfyllning av iPhone Duo ${label} sedan bevakningen började ${since}.`,
    others: (o: { pro: number; max: number; one: boolean; configs: number }) => (o.one ? `iPhone 18 Pro finns här i ${n(o.pro)} av ${n(o.configs)} konfigurationer, 18 Pro Max i ${n(o.max)}.` : `iPhone 18 Pro finns i ${n(o.pro)} av dem, 18 Pro Max i ${n(o.max)}.`),
    updated: (stamp: string) => `Uppdaterad ${stamp}`,
    checked: (note: string) => `kontrolleras ${note}`,
    since: (date: string) => `data sedan ${date}`,
    method: "en påfyllning räknas bara när två kontroller stämmer överens; första observationer räknas inte",
    /* Tiles */
    tShare: (range: string) => `av påfyllningarna ${range}`,
    tBusiest: (count: number) => `timmen med flest · ${pl(count, "påfyllning", "påfyllningar")}`,
    tHalf: "hälften slutsålda inom",
    tSince: (date: string) => `bekräftade påfyllningar sedan ${date}`,
    tToday: "i dag hittills",
    mostOften: (config: string, k: number, total: number) => `oftast ${config} (${n(k)} av ${n(total)})`,
    /** Swedish pages always say "lokal tid"; US zone names are only for English. */
    zone: (tz: string | null): string => { void tz; return "lokal tid"; },
    summary: (o: { pct: string; n: number; stores: number; label: string; since: string; range: string; zone: string; busiest: string; busiestN: number; median: string | null; config: string | null; k: number; one: boolean }) =>
      `${o.pct} av de ${n(o.n)} ${o.n === 1 ? "påfyllningen" : "påfyllningarna"} av iPhone Duo som PickupChecker har bekräftat ${o.one ? o.label : o.stores === 1 ? `i Apple Store-butiken ${o.label}` : `i de ${n(o.stores)} Apple Store-butikerna ${o.label}`} sedan ${o.since} kom ${o.range} ${o.zone}; flest kom ${o.busiest} (${n(o.busiestN)}).${o.median ? ` Hälften var slutsålda inom ${o.median}.` : ""}${o.config ? ` ${o.config} kom tillbaka oftast (${n(o.k)} av ${n(o.n)}).` : ""}`,
    tooFew: (o: { n: number; label: string; since: string; one: boolean; stores: number }) => `${pl(o.n, "bekräftad påfyllning", "bekräftade påfyllningar")} av iPhone Duo ${o.one ? o.label : o.stores === 1 ? `i Apple Store-butiken ${o.label}` : `i de ${n(o.stores)} Apple Store-butikerna ${o.label}`} sedan ${o.since} – för få för att ange en vanlig tid ännu; alla listas nedan.`,
    hourByHour: "Timme för timme, varje butik →",
    lastThree: (k: number, label: string) => (k === 1 ? `Den senaste påfyllningen av iPhone Duo ${label}` : `De senaste ${n(k)} påfyllningarna av iPhone Duo ${label}`),
    secs: (x: number) => `${n(x)} s`,
    mins: (x: number) => `${n(x)} min`,
    listedRange: (low: string, high: string) => `ute ${low}–${high}`,
    listedAbout: (x: string) => `ute cirka ${x}`,
    stillListed: (x: string) => `fortfarande ute (${x})`,
    ago: (x: string) => `för ${x} sedan`,
    alerts: (o: { sent: number; stores: number; total: number; days: number; label: string; one: boolean }) => (o.one
      ? `De senaste ${n(o.days)} dagarna skickade PickupChecker ${pl(o.sent, "bevakningsnotis", "bevakningsnotiser")} till medlemmar om påfyllningar av iPhone Duo ${o.label}.`
      : `De senaste ${n(o.days)} dagarna skickade PickupChecker ${pl(o.sent, "bevakningsnotis", "bevakningsnotiser")} till medlemmar om påfyllningar av iPhone Duo i ${n(o.stores)} av ${o.total === 1 ? "1 Apple Store-butik" : `${n(o.total)} Apple Store-butiker`} ${o.label}.`),
    alertMe: (label: string) => `Bevaka ${label}`,
    unknown: "Påfyllningsmönstret gick inte att läsa just nu; lagret live på sidan påverkas inte.",
    allModels: (o: { n: number; days: number; peak: string | null }) => `Alla tre iPhone-modeller: ${pl(o.n, "påfyllning", "påfyllningar")} på ${n(o.days)} dagar${o.peak ? `, flest runt ${o.peak}` : ""}.`,
  },
};
