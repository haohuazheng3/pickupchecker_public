/**
 * Italian strings: views — product × place pages, the restock log, the live map, the iPhone Duo restock-times page
 * and the store index. `Country`, `Store`, `Product` and `Place` arrive as English data and are named here in Italian;
 * string arguments (`name`, `place`, `region`, `where`, `config`) arrive already in Italian. Model names stay as Apple
 * writes them; a `model` that carries an English colour ("iPhone Duo 256GB Night Sky") is given Apple's Italian one.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, modelByKey, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, PlaceLevel, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { distance, fitTitleW, list, pct, price } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import {
  GIORNI, IT, Il, aLuogo, altre, cap, conFuso, dalle, dei, fascia, giorno, giornoLungo, il, ilGiorno, inPaese, inTutto, n as N, nessuna,
  ora, paese, pl, regione, tra, taxNoteIt, tutteLe,
} from "./util";

/* ---------------------------------------------------------------- helpers */

const COLORS = ["Night Sky", "Star White", "Burgundy", "Glacier", "Silver", "Black"];
/** "iPhone Duo 256GB Night Sky" → "iPhone Duo 256GB Cielo notturno". */
const itName = (s: string) => COLORS.reduce((a, c) => a.replace(new RegExp(`\\b${c}\\b`, "g"), colorLabel(c, IT)), s);
const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
const apple = (s: Store) => appleStoreLabel(s, IT);
/** Product names in Italian: model, storage, Apple's Italian colour. */
const pName = (p: Product) => [modelByKey(p.model)!.name, p.storage, p.color ? colorLabel(p.color, IT) : undefined].filter(Boolean).join(" ");
const pShort = (p: Product) => [modelByKey(p.model)!.short, p.storage, p.color ? colorLabel(p.color, IT) : undefined].filter(Boolean).join(" ");
/** A place in Italian (country, region, city or store). */
function placeIt(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return paese(cc);
  if (place.level === "state") return `${regionLabel(cc, place.state ?? place.name, IT)}${cc === "it" ? " e provincia" : ""}`;
  if (place.level === "city") return cityLabel(cc, place.city ?? place.label, IT);
  return apple(place.store!);
}
/** "in Italia", "a Roma", "da Apple Via del Corso". */
function atIt(place: Place): string {
  if (place.level === "country") return inPaese(ccOf(place));
  if (place.level === "store") return `da ${apple(place.store!)}`;
  return aLuogo(placeIt(place));
}
const ha = (k: number) => (k === 1 ? "ha" : "hanno");
/** Whole-percent share of 0–1; under half a percent "<1%", never a misleading "0%". */
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : pct(IT, Math.round(x * 100)));
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "stato" : regione(x.c));
const rtRegions = (x: { us: boolean; c: Country }) => (x.us ? "stati" : regione(x.c, true));
const nounOf = (x: { us: boolean; c: Country }) => (x.us ? { regionNoun: "state" } : x.c);
/**
 * "in Italia" on a country page; "a Milano", "a Roma", "a Firenze" on a place page. Italy's region pages are its
 * city-named provinces (Milano, Roma, Torino, Firenze), so a region reads "a {name}" too, as on the /stores pages.
 */
const rtIn = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? aLuogo(x.place.name) : inPaese(x.c.cc));
/** What the "where" section breaks a page down by: the country's regions, a region's cities, a city's stores. */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "città" : "negozio") : rtRegion(x));
const rtUnits = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "città" : "negozi") : rtRegions(x));

/* ---------------------------------------------------------------- product × place copy */

function productTitle(product: Product, place: Place, inStock: number): string {
  const n = place.stores.length;
  const name = pName(product), short = pShort(product);
  if (place.level === "country") {
    const where = inPaese(ccOf(place));
    return fitTitleW([...(inStock > 0 ? [`${name} disponibile in ${inStock === 1 ? "1 Apple Store" : `${N(inStock)} Apple Store`} ${where}`] : []), `${name}: disponibilità per il ritiro ${where}, in tempo reale`, `${name}: disponibilità per il ritiro ${where}`, `${name} ${where}: disponibilità`, `${short}: disponibilità per il ritiro ${where}`, `${short}: disponibilità per il ritiro`]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "disponibile ora" : "disponibilità per il ritiro";
    return fitTitleW([`${name} da ${apple(s)}: ${now}`, `${name} da ${apple(s)}: disponibilità`, `${short} da ${apple(s)}, ${cityLabel(s.country, s.city, IT)}`, `${short} da ${apple(s)}`, `${short} da ${storeLabel(s, IT)}`, `${short} · ${storeLabel(s, IT)}`]);
  }
  const at = aLuogo(placeIt(place));
  return fitTitleW([...(inStock > 0 ? [`${name} disponibile ${at}: ${N(inStock)} ${inStock === 1 ? "negozio" : "negozi"} su ${N(n)}`] : []), `${name} ${at}: disponibilità per il ritiro`, `${short} ${at}: disponibilità per il ritiro`, `${short} disponibile ${at}`, `${short} ${at}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = pName(product);
  const week = `${pl(stats.week, "rifornimento", "rifornimenti")} questa settimana`;
  if (place.level === "store") {
    const s = place.store!;
    const cc = ccOf(place);
    const loc = `${cityLabel(s.country, s.city, IT)}${cc === "us" ? ` ${s.stateCode ?? ""}`.trimEnd() : `, ${paese(cc)}`}`;
    return fitTitleW([
      `Disponibilità ${name} per il ritiro da ${apple(s)}, ${loc}: ${inStock > 0 ? "disponibile ora" : "non disponibile in questo momento"}, ${week}. Stato in tempo reale, orari dei rifornimenti e avvisi.`,
      `${name} da ${apple(s)}: ${inStock > 0 ? "disponibile ora" : "non disponibile ora"}, ${week}. Stato in tempo reale e avvisi.`,
    ], 155);
  }
  const where = atIt(place);
  const n = place.stores.length;
  return fitTitleW([
    `${name} per il ritiro: disponibile ora in ${N(inStock)} Apple Store su ${N(n)} ${where}, ${week}. Per negozio in tempo reale, orari dei rifornimenti e avvisi.`,
    `${name}: disponibile ora in ${N(inStock)} Apple Store su ${N(n)} ${where}, ${week}. Per negozio e avvisi.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const name = pName(product);
  const at = atIt(place);
  const cc = ccOf(place);
  const inStock = lines.filter((l) => l.available.length > 0);
  const near = nearest ? `${/^apple\b/i.test(nearest.name) ? nearest.name : `Apple ${nearest.name}`} a ${nearest.city}, a ${distance(IT, cc, nearest.distance)}` : "";
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `L'${name} è disponibile ${at}?`,
      a: l && l.available.length > 0
        ? `Sì${product.parts.length > 1 ? `: ${list(IT, l.available.map((i) => `${i.storage} ${colorLabel(i.color, IT)}`), 4, (k) => `altre ${N(k)}`)}` : ""}, all'ultimo controllo.`
        : `Non all'ultimo controllo${near ? `; il negozio più vicino che ce l'ha è ${near}` : ""}.`,
    });
  } else {
    out.push({
      q: `Quali Apple Store ${at} hanno l'${name}?`,
      a: inStock.length === 0
        ? `Nessuno all'ultimo controllo${near ? `; il più vicino che ce l'ha è ${near}` : ""}.`
        : `${pl(inStock.length, "negozio", "negozi")} all'ultimo controllo: ${list(IT, inStock.map((x) => apple(x.store)), 4, (k) => `altri ${N(k)}`)}.`,
    });
  }
  const peak = peakOf(clock, IT);
  out.push({
    q: `Ogni quanto torna disponibile l'${name} ${at}?`,
    a: stats.month === 0 ? `Nessun rifornimento registrato ${at} negli ultimi ${N(stats.days)} giorni.` : `${pl(stats.month, "rifornimento", "rifornimenti")} negli ultimi ${N(stats.days)} giorni, ${N(stats.week)} questa settimana${peak ? `, per lo più verso le ${peak.hour} (ora locale)` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `Quanto resta disponibile ${at}?`, a: `Circa ${fmtDuration(stats.medianMs, IT)} (mediana) prima di esaurirsi di nuovo.` });
  return out;
}

function priceLabel(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => price(IT, COUNTRIES[cc], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => inPaese(c.cc),
    liveMap: "Mappa in tempo reale",
    restockLog: "Registro dei rifornimenti",
    alertMe: "Avvisami",
    lastDays: (days: number) => <>Ultimi {N(days)} giorni</>,
    since: "2 novembre 2026",
    sourcesWhere: (n: number, c: Country) => (n === 1 ? `l'Apple Store ${inPaese(c.cc)}` : `tutti i ${N(n)} Apple Store ${inPaese(c.cc)}`),
    checker: (c: Country) => `Verifica disponibilità iPhone ${inPaese(c.cc)}`,
    appleStoresIn: (c: Country) => `Apple Store ${inPaese(c.cc)}`,
    storesWithIt: "negozi che ce l'hanno",
    more: "Altro",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    /** A region in Italy is a province: "a Roma e provincia". */
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `da ${name}` : level === "state" ? `${aLuogo(name)} e provincia` : aLuogo(name)),
    h1Country: (model: string, c: Country) => `Disponibilità ${itName(model)} per il ritiro ${inPaese(c.cc)}`,
    h1Place: (model: string, where: string) => `${itName(model)} ${where}`,
    inStockNow: "Disponibile ora",
    yes: "Sì",
    no: "No",
    pickup: "ritiro",
    configurations: "configurazioni",
    ofStores: (n: number) => `su ${N(n)} ${n === 1 ? "negozio" : "negozi"}`,
    restocks24h: "Rifornimenti 24 h",
    restocksHint: (week: number, month: number, days: number) => `${N(week)} in 7 g · ${N(month)} in ${N(days)} g`,
    sellOuts: (days: number) => `Esauriti ${N(days)} g`,
    stays: (ms: number) => `dura ~${fmtDuration(ms, IT)}`,
    noPairs: "ancora nessuna coppia",
    lastRestock: "Ultimo rifornimento",
    noneYet: "ancora nessuno",
    thisConfig: "questa configurazione",
    inDays: (days: number) => `in ${N(days)} giorni`,
    notInStockNow: "Non disponibile ora",
    configsInStock: (n: number, of: number) => <span><b className="text-ink">{N(n)}</b> configurazioni su {N(of)} disponibili</span>,
    inStockAt: (n: number, of: number) => <span>Disponibile in <b className="text-ink">{N(n)}</b> {n === 1 ? "negozio" : "negozi"} su {N(of)}</span>,
    checked: (live: ReactNode, p: string, tax: string) => <>Controllato {live} · {p}{tax}</>,
    taxNote: (c: Country) => taxNoteIt(c),
    beforeTax: "tasse escluse",
    buyOnApple: "Acquista su apple.com",
    allStoresIn: (c: Country) => `Tutti i negozi ${inPaese(c.cc)}`,
    everyIphoneHere: "Tutti gli iPhone qui",
    everyIphone: (where: string) => `Tutti gli iPhone ${where}`,
    panel: (model: string, where: string | null) => `Per l'${itName(model)}${where ? ` ${where}` : ""}: seleziona configurazioni e negozi`,
    unitConfigs: "configurazioni",
    unitStores: "negozi",
    otherConfigsHere: "Altre configurazioni qui",
    byStorageColor: "Per capacità e colore",
    nearestStores: "Negozi più vicini",
    closest: (link: ReactNode, dist: string) => <>Il più vicino che ce l&apos;ha ora: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Disponibili più di recente",
    storesWithItNow: "Negozi che ce l'hanno ora",
    storesIn: (where: string) => `Negozi ${where}`,
    colStatus: "stato",
    colConfigs: "configurazioni disponibili",
    noStoreHasIt: "In questo momento nessun negozio ce l'ha.",
    noStoreHereHasIt: "In questo momento nessun negozio qui ce l'ha.",
    moreStores: (n: number) => <>+{N(n)} altri negozi: li trovi nelle pagine delle province.</>,
    byRegion: (c: Country) => `Per ${regione(c)}`,
    byCity: "Per città",
    nearbyStores: "Negozi vicini",
    latestChanges: "Ultimi cambiamenti",
    nothingLogged: "Ancora nulla di registrato.",
    whenRestocks: "Quando torna disponibile",
    howFast: "In quanto tempo si esaurisce",
    restocksByConfig: "Rifornimenti per configurazione",
    faqTitleCountry: (model: string, c: Country) => `${itName(model)} ${inPaese(c.cc)}: domande frequenti`,
    faqTitle: (model: string, where: string) => `${itName(model)} ${where}`,
    buySource: (model: string, c: Country) => `Apple: acquista ${itName(model)} (${paese(c.cc)})`,
    nearby: "Vicini",
    otherRegions: (c: Country) => altre(c),
    elsewhereIn: (region: string) => `Altrove in provincia di ${region}`,
    everyAppleStoreIn: (c: Country) => `Tutti gli Apple Store ${inPaese(c.cc)}`,
    across: (model: string, c: Country) => `${itName(model)} ${inTutto(c.cc)}`,
    itemList: (model: string, where: string) => `${itName(model)} ${where}`,
    nearLead: (c: Country, model: string, inStock: number, n: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `In questo momento nessun Apple Store ${inPaese(c.cc)} ha l'${itName(model)} disponibile per il ritiro, quindi «vicino a me» vuol dire capire quale negozio torna ad averlo per primo. Imposta un avviso nei negozi che puoi raggiungere e la notifica arriva pochi secondi dopo che uno lo rende disponibile.`
        : `${inStock === 1 ? "1 negozio" : `${N(inStock)} negozi`} su ${N(n)} ${ha(inStock)} l'${itName(model)} in questo momento: ${list(IT, have.slice(0, 5).map((l) => `${l.store} a ${l.city} (${pl(l.configs, "configurazione", "configurazioni")})`), 5)}.`,
    nearHead: (c: Country) => [cap(regione(c)), "Negozi che ce l'hanno ora"],
    nearCaption: (c: Country, model: string) => `Disponibilità di ${itName(model)} per il ritiro per ${regione(c)}, all'ultimo controllo`,
    nearMe: (_c: Country, model: string, alert: string) => `Per ordinare tutti i negozi in base a dove ti trovi, apri la configurazione degli avvisi in questa pagina e tocca Vicino a me: le distanze sono su strada, in chilometri e stimate, e ogni negozio ha il link alle indicazioni. [Imposta un avviso per l'${itName(model)}](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => {
      const m = itName(model);
      return {
        price: { q: `Quanto costa l'${m} ${inPaese(c.cc)}?`, a: `Da ${price(IT, c, low)} a ${price(IT, c, high)} su apple.com, ${taxNoteIt(c)}, a seconda della capacità.` },
        reserve: { q: `Posso prenotare l'${m} per il ritiro ${inPaese(c.cc)}?`, a: `No: quando un negozio rende disponibile una configurazione la acquisti su apple.com scegliendo il Ritiro in negozio, e viene tenuta da parte per la tua fascia oraria.${inStock === 0 ? " In questo momento nessun negozio ce l'ha, quindi un avviso è il modo per arrivare primo." : ""}` },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, n: number) => fitTitleW([`Rifornimenti iPhone ${inPaese(c.cc)}: registro ${n === 1 ? "dell'Apple Store" : `${dei(n)} Apple Store`}`, `Registro dei rifornimenti iPhone ${inPaese(c.cc)}`, `Rifornimenti iPhone ${inPaese(c.cc)}`]),
    metaDescription: (c: Country, n: number) => `Ogni rifornimento di iPhone Duo, 18 Pro e Pro Max ${n === 1 ? "nell'Apple Store" : "negli Apple Store"} ${inPaese(c.cc)} per il Ritiro in negozio, con ora esatta, configurazione e mappa.`,
    h1: (c: Country) => `Registro dei rifornimenti ${inPaese(c.cc)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{pl(day, "rifornimento", "rifornimenti")} in 24 ore · {N(week)} questa settimana{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. Orari nel tuo fuso orario.</>,
    allModels: "Tutti i modelli",
    restocks: "Rifornimenti",
    withSoldOut: "Rifornimenti + esauriti",
    regionLabel: (c: Country) => cap(regione(c)),
    allRegions: (c: Country) => tutteLe(c),
    filter: "Filtra",
    page: (k: number) => <>pagina {N(k)}</>,
    newer: "← Più recenti",
    older: "Meno recenti →",
    getAlerts: "Ricevi avvisi",
    byPlace: "Rifornimenti per luogo",
    byRegion: (c: Country) => `Per ${regione(c)}`,
    datasetName: (c: Country) => `Registro dei rifornimenti iPhone per il ritiro negli Apple Store ${inPaese(c.cc)}`,
    datasetDescription: (c: Country) => `Ogni rifornimento ed esaurimento confermato di iPhone Duo, iPhone 18 Pro e iPhone 18 Pro Max per il Ritiro in negozio ${c.cc === "us" ? "in tutti i 269 Apple Store degli Stati Uniti" : `negli Apple Store ${inPaese(c.cc)}`}, con negozio, configurazione esatta e ora. Un rifornimento viene registrato solo dopo due risposte concordanti di apple.com, controllata ogni 15 secondi (ogni 5 per i negozi con avvisi).`,
    datasetMeasured: ["Apple Store", "modello, capacità e colore dell'iPhone", "ora del rifornimento", "ora dell'esaurimento"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, n: number) => fitTitleW([`Mappa disponibilità iPhone Duo: ${n === 1 ? "l'Apple Store" : "gli Apple Store"} ${inPaese(c.cc)}`, `Mappa disponibilità iPhone Duo ${inPaese(c.cc)}`, "Mappa disponibilità iPhone Duo"]),
    metaDescription: (c: Country, n: number) => `Mappa in tempo reale ${n === 1 ? "dell'Apple Store" : `${dei(n)} Apple Store`} ${inPaese(c.cc)} con la disponibilità di iPhone Duo, 18 Pro e Pro Max per il Ritiro in negozio adesso, per capacità e colore.`,
    /** regionNoun stays the English key: the map reads its Italian words from cdict map.nouns. */
    country: (c: Country) => ({ name: paese(c.cc), inName: inPaese(c.cc), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Tutti i negozi",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, n: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` per ${regione(c)} e città` : cities > 1 ? " per città" : "";
      return `Tutti i ${N(n)} Apple Store ${inPaese(c.cc)}${by}, con la disponibilità di iPhone Duo, 18 Pro e Pro Max per il ritiro in tempo reale: il Duo è disponibile in ${N(duo)}, il Pro Max in ${N(max)}.`;
    },
    countAnswer: (n: number, spread: string, top: { name: string; count: number }[]) => `${N(n)}, ${spread}${top.length ? `. In testa c'è ${top[0].name} (${N(top[0].count)})${top[1] ? `, poi ${top[1].name} (${N(top[1].count)})` : ""}` : ""}.`,
    howMany: (c: Country) => <>Quanti Apple Store ci sono {inPaese(c.cc)}?</>,
    duoNow: (c: Country, n: number, have: Store[]): FaqItem => ({
      q: `Quali Apple Store ${inPaese(c.cc)} hanno l'iPhone Duo in questo momento?`,
      a: have.length === 0 ? `Nessuno ${dei(n)} all'ultimo controllo. Questa pagina e la mappa si aggiornano appena uno lo rende disponibile, e un avviso te lo dice per primo.` : `${N(have.length)} su ${N(n)} all'ultimo controllo: ${have.slice(0, 6).map(apple).join(", ")}${have.length > 6 ? " e altri" : ""}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, IT),
    duoBlock: (alert: string) => `Il modo più rapido per averne uno è un avviso nei negozi che puoi raggiungere: [imposta un avviso per l'iPhone Duo](${alert}). Ogni negozio × configurazione esatta è un avviso, e la notifica arriva pochi secondi dopo che un negozio lo rende disponibile.`,
    intro: (c: Country, n: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `${n === 1 ? "C'è" : "Ci sono"} **${N(n)} Apple Store** ${inPaese(c.cc)}, ${spread}. In questo momento l'iPhone Duo è disponibile per il ritiro in **${N(now.duo)}** di questi, l'iPhone 18 Pro Max in **${N(now.max)}** e il 18 Pro in **${N(now.pro)}**. ${tax}`,
    crumb: "Apple Store",
    panel: (c: Country) => `Scegli gli iPhone e seleziona i negozi ${inPaese(c.cc)} che puoi raggiungere`,
    matrixLabel: "Disponibilità per negozio",
    matrixH2: (c: Country) => <>Disponibilità in ogni Apple Store {inPaese(c.cc)}</>,
    matrixHint: "Disponibili ora / monitorate, per modello.",
    topCaption: (c: Country) => <>{cap(regione(c, true))} con più Apple Store (elenco dei negozi Apple, come monitorato qui)</>,
    regionHead: (c: Country) => cap(regione(c)),
    colStores: "Apple Store",
    colCities: "Città",
    locationsBy: (c: Country) => `Apple Store per ${regione(c)}`,
    locationsIn: (c: Country) => `Apple Store ${inPaese(c.cc)}`,
    storeCount: (n: number) => <>{N(n)} {n > 1 ? "negozi" : "negozio"}</>,
    storeCountAll: (n: number) => <>{N(n)} negozi</>,
    whenRestock: (c: Country) => <>Quando tornano disponibili gli iPhone negli Apple Store {inPaese(c.cc)}?</>,
    howFast: (c: Country) => <>In quanto tempo si esauriscono i rifornimenti {inPaese(c.cc)}?</>,
    faqTitle: (c: Country) => `Apple Store ${inPaese(c.cc)}: domande frequenti`,
    getApp: "Installa l'app",
    howItWorks: "Come funziona",
    pricing: "Prezzi",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: N,
      pct: rtPct,
      date: giorno,
      longDate: giornoLungo,
      zoneStamp: conFuso,
      local: (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, IT),
      hour: ora,
      range: fascia,
      weekday: (d: number) => GIORNI[d],
      store: (s: Store) => apple(s),
      storeWithPlace: (s: Store) => `${apple(s)} (${cityLabel(s.country, s.city, IT)})`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `Quando torna disponibile l'iPhone Duo ${place ? aLuogo(place.name) : inPaese(c.cc)}?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const where = rtIn(x);
      const own = c.cc === "us" ? "stato" : c.regionNoun ? regione(c) : "negozio";
      /** A region page lists its cities; a city page has no unit before "negozio". */
      const region = x.place ? (x.place.kind === "region" ? "città" : "negozio") : own;
      const by = x.place?.kind === "city" ? "negozio" : `${region}, negozio`;
      const since = giorno(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `${pl(t.n, "rifornimento", "rifornimenti")} di iPhone Duo ${where} dal ${since}: ${il(rtPct(w.share))} ${tra(w.from, w.to)}${t.sellout ? `, ${il(rtPct(t.sellout.within2min))} sparito entro 2 minuti` : ""}. Per ora, giorno, ${by} e configurazione.`,
          `${pl(t.n, "rifornimento", "rifornimenti")} di iPhone Duo negli Apple Store ${where} dal ${since}: ${il(rtPct(w.share))} ${tra(w.from, w.to)}. Tabelle per ora, giorno, ${region} e configurazione.`,
          `Orari dei rifornimenti di iPhone Duo ${where}: ${N(t.n)} dal ${since}, per ora, giorno, ${region} e configurazione.`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `${pl(t.n, "rifornimento confermato", "rifornimenti confermati")} di iPhone Duo negli Apple Store ${where} dal ${since}, con controlli ogni 15 secondi: per ora locale, giorno per giorno, per ${by} e configurazione, e quanto è durato ognuno.`,
            `Orari dei rifornimenti di iPhone Duo ${where}: ${pl(t.n, "rifornimento confermato", "rifornimenti confermati")} dal ${since}, per ora, giorno, ${region} e configurazione.`,
          ], 158)
          : fitTitleW([
            `Quando gli Apple Store ${where} riforniscono l'iPhone Duo, dai controlli di PickupChecker ogni 15 secondi dal ${giornoLungo(t.since)}: ora per ora, giorno per giorno, per negozio e configurazione.`,
            `Quando gli Apple Store ${where} riforniscono l'iPhone Duo: controlli ogni 15 secondi dal ${since}, ora per ora, giorno per giorno, per negozio e configurazione.`,
          ], 158);
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `Quando torna disponibile l'iPhone Duo ${rtIn(x)}?`
      : x.t.n > 0
        ? `Apple sta ancora rifornendo l'iPhone Duo ${rtIn(x)}? Sì: ecco quando, ora per ora`
        : `Apple sta rifornendo l'iPhone Duo ${rtIn(x)}? Non ancora, secondo i nostri controlli: ecco cosa monitoriamo`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = rtIn(x);
      return t.unknown ? (
        <>Il nostro registro dei rifornimenti non è leggibile in questo momento; gli Apple Store {where} vengono comunque controllati ogni 15 secondi, e questa pagina torna con i suoi numeri al prossimo caricamento.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Sì.</b> {one ? "L'Apple Store" : "Gli Apple Store"} {where} {one ? "ha" : "hanno"} rifornito l&apos;iPhone Duo <b className="text-ink">{pl(t.n, "volta", "volte")} dal {giornoLungo(t.since)}</b>{tracked > 1 ? <>, in {N(t.days)} {dei(tracked)} giorni</> : <> (finora un solo giorno di monitoraggio)</>}
          {pattern && <>, <b className="text-ink">{il(rtPct(w.share))} {tra(w.from, w.to)}</b> nell&apos;ora locale del negozio</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Non ancora, secondo i nostri controlli.</b> Dal {giornoLungo(t.since)} PickupChecker interroga {one ? "l'Apple Store" : `tutti i ${N(x.stores)} Apple Store`} {where} ogni 15 secondi e non ha confermato alcun rifornimento di iPhone Duo per il ritiro.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `rifornimenti confermati dal ${giorno(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${tra(x.w.from, x.w.to)}, ora locale del negozio`,
      days: "giorni con almeno un rifornimento",
      /** English infers a literal union for this ternary; the cast widens it to Italian text. */
      now: ((one: boolean): string => (one ? "negozio lo ha disponibile per il ritiro adesso" : "negozi lo hanno disponibile per il ritiro adesso")) as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `oggi (${giorno(today.date)})${x.one ? "" : `, in ${pl(today.stores, "negozio", "negozi")}`}, finora`,
      weekday: "giorno della settimana più intenso finora",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>Ultimo: <b className="text-ink">{latest.config}</b>{x.one ? null : <> da <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}, {localStamp(latest.at, latest.store, IT)} ora locale</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Più spesso <b className="text-ink">{ilGiorno(x.t.peakWeekday)}</b></> }] : []),
      { text: <>Apple non pubblica <b className="text-ink">alcun calendario dei rifornimenti</b>; questi sono i nostri controlli confermati, aggiornati circa ogni cinque minuti</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>In questo momento <b className="text-ink">{N(x.duoNow)} su {N(x.stores)}</b> {x.one ? "lo ha" : "lo hanno"} disponibile per il ritiro</> },
      { text: <>Le tabelle qui sotto si riempiono dal primo rifornimento confermato</>, step: true },
      { text: <>Tendenze per ora e giorno della settimana, dove abbiamo più dati: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">la pagina degli Stati Uniti (in inglese)</Link></>, step: true },
    ],
    setUpAlert: "Imposta un avviso per l'iPhone Duo",
    logLive: "Il registro dei rifornimenti, in tempo reale",
    onThisPage: "In questa pagina",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Ora del giorno",
      "day-by-day": "Giorno per giorno",
      where: `Per ${rtUnit(x)}`,
      configuration: "Configurazione",
      "how-long": "Quanto dura",
      unavailable: "Perché «non disponibile»",
      reddit: "Reddit e dati",
      method: "Come contiamo",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `A che ora torna disponibile l'iPhone Duo ${rtIn(x)}?`,
      "day-by-day": `In quali giorni Apple ha rifornito l'iPhone Duo ${rtIn(x)}?`,
      where: `Quali Apple Store ${rtIn(x)} riforniscono più spesso l'iPhone Duo?`,
      configuration: `Quale configurazione di iPhone Duo torna disponibile più spesso ${rtIn(x)}?`,
      "how-long": `Quanto dura un rifornimento di iPhone Duo ${rtIn(x)}?`,
      unavailable: "Perché tutti gli Apple Store dicono «al momento non disponibile»?",
      reddit: "Cosa dice Reddit sui rifornimenti di iPhone Duo, e cosa dicono i dati",
      method: "Come conta un rifornimento PickupChecker?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtIn(x);
      return [
        { q: `Quando torna disponibile l'iPhone Duo ${where}?`, a: t.n > 0 && pattern
          ? `Soprattutto di mattina: ${il(rtPct(w.share))} ${dei(t.n)} rifornimenti confermati dal ${giornoLungo(t.since)} è arrivato ${tra(w.from, w.to)} nell'ora locale del negozio, e ${il(rtPct(hourShare(t.byHour, 8, 12)))} tra le 8:00 e mezzogiorno. Apple non pubblica alcun calendario; questa è la tendenza osservata da PickupChecker, aggiornata circa ogni cinque minuti.`
          : `Apple non pubblica alcun calendario, e PickupChecker ha registrato ${pl(t.n, "rifornimento confermato", "rifornimenti confermati")} ${where} dal ${giornoLungo(t.since)}${t.days ? ` in ${pl(t.days, "giorno", "giorni")}` : ""}. Un orario tipico viene indicato quando ci sono ${PATTERN_MIN} rifornimenti in ${PATTERN_MIN_DAYS} giorni diversi, e questa pagina si aggiorna da sola.` },
        { q: `Apple rifornisce l'iPhone Duo anche nel fine settimana${us ? "" : ` ${where}`}?`, a: t.n > 0
          ? `${weekend > 0 ? `Sì, finora: ${weekend === 1 ? "1 rifornimento" : `${N(weekend)} rifornimenti`} su ${N(t.n)} ${weekend === 1 ? "è arrivato" : "sono arrivati"} di sabato o di domenica (${rtPct(weekend / t.n)}).` : `Non ancora nei nostri dati: nessuno ${dei(t.n)} rifornimenti è arrivato di sabato o di domenica.`} ${t.peakWeekday != null ? `Il giorno più intenso della settimana è ${ilGiorno(t.peakWeekday)}.` : `Quale giorno della settimana sia il più intenso lo diciamo solo quando i dati coprono ${WEEKDAY_MIN_SPAN} giorni; i nostri ne coprono ${N(tracked)}.`}`
          : `Ancora nessun dato sul fine settimana ${where}; la tabella giorno per giorno di questa pagina si riempie man mano che i rifornimenti vengono confermati.` },
        { q: "A che ora conviene iniziare a controllare?", a: t.n > 0 && pattern
          ? `Se controlli a mano, stai su apple.com con il ritiro già selezionato ${dalle(w.from)} (ora locale): quella fascia di due ore ha raccolto ${il(rtPct(w.share))} dei rifornimenti. Un rifornimento tipico ${sell ? `è sparito entro ${N(sell.medianSec)} secondi (mediana)` : "dura circa un minuto"}, quindi un avviso che controlla ogni 5 secondi ([come funzionano gli avvisi](/iphone-duo-stock-alerts)) fa quello che nessun aggiornamento manuale può fare.`
          : `Finché una tendenza ${where} non è chiara, lascia che sia un avviso a controllare: i negozi che scegli vengono controllati ogni 5 secondi, giorno e notte ([come funzionano gli avvisi](/iphone-duo-stock-alerts)).` },
        { q: "Perché tutti gli Apple Store dicono che l'iPhone Duo non è disponibile?", a: sell
          ? `Perché un rifornimento dura poco: ${il(rtPct(sell.within2min))} ${dei(sell.n)} rifornimenti esauriti che abbiamo misurato ${where} è sparito entro 2 minuti, e ${il(rtPct(sell.within20min))} entro 20. In questo momento lo hanno disponibile ${N(x.duoNow)} negozi su ${N(x.stores)}; in quasi ogni altro momento la lettura onesta di apple.com è «non disponibile», anche in un giorno con decine di rifornimenti ([cosa significa «non disponibile»](/apple-store-pickup-availability-explained)).`
          : `Perché la disponibilità per il ritiro compare per pochi minuti alla volta. In questo momento lo hanno disponibile ${N(x.duoNow)} negozi su ${N(x.stores)} ${where} ([cosa significa «non disponibile»](/apple-store-pickup-availability-explained)).` },
        { q: "Come ricevo una notifica quando il mio Apple Store rifornisce l'iPhone Duo?", a: `Imposta un avviso per il negozio con capacità e colore esatti: da quel momento il negozio viene controllato ogni 5 secondi e il telefono riceve la notifica circa 3 secondi dopo un rifornimento confermato ([imposta un avviso](${x.alert}); [come funziona](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: Consegna e ritiro (come funziona la disponibilità del Ritiro in negozio)",
      newsroom: "Apple Newsroom (in inglese): iPhone Duo arriva negli Apple Store di tutto il mondo (23 ottobre 2026)",
      macRumors: "MacRumors (in inglese): il sistema di ritiro negli Apple Store per l'iPhone Duo torna attivo negli Stati Uniti e in Canada (24 ottobre 2026)",
      reports: (tracker: string) => `${tracker}: segnalazioni di rifornimenti di iPhone Duo nella settimana del lancio (osservazioni loro, mostrate a parte, mai conteggiate)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `Orari dei rifornimenti di iPhone Duo negli Apple Store ${rtIn(x)}`,
      description: `Ogni rifornimento confermato di iPhone Duo per il Ritiro in negozio negli Apple Store ${rtIn(x)} dal ${giornoLungo(x.t.since)}, con negozio, configurazione e ora, dai controlli di PickupChecker ogni 15 secondi; riassunto per ora locale, giorno, ${x.place?.kind === "city" ? "" : `${rtUnit(x)}, `}negozio e configurazione.`,
      spatial: `Apple Store ${rtIn(x)}`,
      measured: ["ora del rifornimento (ora locale del negozio)", "Apple Store", "capacità e colore dell'iPhone Duo", "secondi prima dell'esaurimento"],
      size: `${pl(x.t.n, "rifornimento", "rifornimenti")} in ${pl(x.t.stores, "negozio", "negozi")}`,
    }),
    crumb: "Orari dei rifornimenti iPhone Duo",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{Il(rtPct(x.w.share))} {dei(x.t.n)} rifornimenti è arrivato {tra(x.w.from, x.w.to)} nell&apos;ora locale del negozio, e {il(rtPct(hourShare(x.t.byHour, 8, 12)))} tra le 8:00 e mezzogiorno.</b>,
    busiestHour: (count: number) => `l'ora più intensa: ${pl(count, "rifornimento", "rifornimenti")}`,
    morning: "tra le 8:00 e mezzogiorno",
    evening: "dopo le 17:00: la sera non è morta",
    night: "tra mezzanotte e le 6:00",
    tooFew: (x: RestockTimesView) => (x.t.n > 0
      ? <b>Troppo pochi giorni per indicare un orario: {pl(x.t.n, "rifornimento confermato", "rifornimenti confermati")} in {pl(x.t.days, "giorno", "giorni")} dal {giornoLungo(x.t.since)}.</b>
      : <b>Ancora troppo pochi giorni per indicare un orario: nessun rifornimento confermato dal {giornoLungo(x.t.since)}.</b>),
    tooFewKeys: (): Point[] => [
      { text: <>Per un orario tipico servono <b className="text-ink">{PATTERN_MIN} rifornimenti in {PATTERN_MIN_DAYS} giorni diversi</b></> },
      { text: <>Dieci rifornimenti in una sola raffica = un evento, non un&apos;abitudine</>, no: true },
      { text: <>La pagina si riscrive da sola man mano che i giorni si accumulano</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `Rifornimenti di iPhone Duo ${rtIn(x)} per ora locale del negozio, dal ${giorno(x.t.since, false)} a oggi (${pl(x.t.n, "rifornimento", "rifornimenti")})`,
    hourHead: ["Ora locale", "Rifornimenti", "Quota"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>Il picco del mattino <b className="text-ink">non è l&apos;apertura delle porte</b>{x.us ? ": quasi tutti gli Apple Store degli Stati Uniti aprono alle 10:00" : ""}</> },
      { text: <>La disponibilità per il ritiro viene rilasciata <b className="text-ink">online</b>, prima che si alzino le saracinesche</> },
      { text: <>A mano: tieni d&apos;occhio la fascia <b className="text-ink">{fascia(x.w.from, x.w.to)}</b> la mattina di un giorno feriale</>, step: true },
      { text: <>Lascia che un <Link href={x.alert}>avviso</Link> controlli le <b className="text-ink">altre 22 ore</b>, quando nessuno sta ricaricando la pagina</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Ogni pagina di negozio ha il suo grafico, nel suo fuso orario (<Link href={x.storesHref}>{x.us ? "Apple Store per stato" : `negozi ${rtIn(x)}`}</Link>): vale la pena sapere se un negozio rifornisce alle 8:00 dove di solito succede alle 9:00</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      if (t.n > 0 && tracked === 1) return <b>Finora un solo giorno di monitoraggio, {giorno(t.daily[t.daily.length - 1]?.date ?? t.since)}, con {pl(t.n, "rifornimento confermato", "rifornimenti confermati")}{one ? "" : ` in ${pl(t.stores, "negozio", "negozi")}`}.</b>;
      if (t.n > 0) {
        const days = t.days === tracked ? `Ogni giorno monitorato (${N(t.days)} su ${N(t.days)}) ha avuto` : `${N(t.days)} ${dei(tracked)} giorni dal ${giornoLungo(t.since)} ${t.days === 1 ? "ha" : "hanno"} avuto`;
        return <b>{days} almeno un rifornimento confermato{t.peakWeekday != null ? `, e il giorno più intenso della settimana è ${ilGiorno(t.peakWeekday)}` : ""}.</b>;
      }
      return <b>Nessun rifornimento confermato {rtIn(x)} dal {giornoLungo(t.since)}.</b>;
    },
    daysTracked: "giorni monitorati con almeno un rifornimento",
    busiestDay: (x: RestockTimesView, day: DayRow) => `giorno più intenso, ${giorno(day.date)}${x.one ? "" : `, in ${pl(day.stores, "negozio", "negozi")}`}`,
    busiestDayNone: "giorno più intenso",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `negozi riforniti nella stessa mezz'ora, ${conFuso(drop.at, x.c)} (${pl(drop.restocks, "configurazione", "configurazioni")}): un rilascio nazionale visto da fuori`,
    weekend: (x: RestockTimesView) => `di sabato o di domenica (${pl(x.weekend, "rifornimento", "rifornimenti")})`,
    dayCaption: (x: RestockTimesView) => `Rifornimenti di iPhone Duo ${rtIn(x)}, giorno per giorno${x.t.reports.length ? "; le righe «segnalato» sono osservazioni pubblicate da altri tracker per i giorni prima dell'inizio del nostro monitoraggio, mostrate solo per la cronologia" : ""}`,
    dayHead: { date: "Data", restocks: "Rifornimenti", stores: "Negozi", busiest: "Ora più intensa", source: "Fonte" },
    soFar: " · finora",
    reportedBy: (names: string[]) => <>segnalato da {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{giorno(launch)}</b>: giorno del lancio, le prime unità per gli ordini online</> },
      { text: <><b className="text-ink">{giorno(resumed)}</b>: riaprono le prenotazioni per il ritiro{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Righe <b className="text-ink">«segnalato»</b>: osservazioni di {list(IT, x.reportNames)} nella settimana del lancio, mai conteggiate</> }
        : { text: <>Il nostro registro di ogni negozio {rtIn(x)} parte dal <b className="text-ink">{giornoLungo(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Giorno della settimana più intenso: lo indichiamo quando i dati coprono <b className="text-ink">{WEEKDAY_MIN_SPAN} giorni</b> (i nostri ne coprono {N(x.tracked)})</>, no: true }] : []),
      { text: <>Guarda la colonna <b className="text-ink">negozi</b>: gli stessi rifornimenti distribuiti su più negozi sono un giorno migliore per te</>, step: true },
    ],

    // ---- where
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {pl(hit[0].restocks, "rifornimento", "rifornimenti")} {hit[0].storesTotal === 1 ? "nel suo unico negozio" : `in ${N(hit[0].stores)} su ${N(hit[0].storesTotal)} negozi`} dal {giorno(x.t.since, false)}{hit[1] ? <>, poi {hit[1].name} ({N(hit[1].restocks)})</> : null}{hit[2] ? <> e {hit[2].name} ({N(hit[2].restocks)})</> : null}; {hit.length === 1 ? `1 ${rtUnit(x)} su ${N(total)} ha avuto` : `${N(hit.length)} ${rtUnits(x)} su ${N(total)} hanno avuto`} almeno un rifornimento{total - hit.length > 0 ? ` e ${N(total - hit.length)} ancora nessuno` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{x.place ? (x.place.kind === "region" ? "Nessuna città" : "Nessun negozio") : cap(nessuna(nounOf(x)))} {rtIn(x)} ha ancora un rifornimento confermato; la tabella si riempie dal primo.</b>,
    regionCaption: (x: RestockTimesView) => `Rifornimenti confermati di iPhone Duo per ${rtUnit(x)} ${rtIn(x)}, dal ${giorno(x.t.since, false)} a oggi`,
    regionHead: (x: RestockTimesView) => [cap(rtUnit(x)), "Rifornimenti", "Negozi riforniti", "Ultimo rifornimento (ora locale)"],
    ofN: (a: number, b: number) => <>{N(a)} su {N(b)}</>,
    storesCaption: (x: RestockTimesView) => `I negozi con più rifornimenti di iPhone Duo ${rtIn(x)}, dal ${giorno(x.t.since, false)} a oggi`,
    storesHead: ["Negozio", "Rifornimenti", "Giorni", "Di solito verso", "Ultimo (ora locale)"],
    swaps: (x: RestockTimesView) => [
      { no: "Il negozio con più rifornimenti, ovunque sia", yes: `Due o tre negozi che puoi raggiungere entro un'ora, pronti ${x.pattern ? dalle(x.w.from) : "dal mattino"}`, why: "Un rifornimento che non puoi raggiungere non è un rifornimento; anche il negozio più attivo risulta non disponibile per tutto il giorno, tranne pochi minuti." },
      { no: "Un solo negozio, e sperare", yes: "Un avviso su ciascuno, poi vai in quello che scatta", why: "La tabella dei conteggi ti dice solo in quale dei tuoi negozi andare per primo." },
    ],
    nearMe: "Negozi con il Duo vicino a me, adesso",

    // ---- configuration
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {N(top.restocks)} {dei(x.t.n)} rifornimenti ({rtPct(top.restocks / x.t.n)}){rarest ? `; la più rara: ${rarest.label}, con ${pl(rarest.restocks, "rifornimento", "rifornimenti")}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: la configurazione rifornita più spesso`,
    versus: (a: string, bCount: number, b: string) => `rifornimenti di ${a}, contro ${N(bCount)} di ${b}`,
    restocksOf: (a: string) => `rifornimenti di ${a}`,
    byStorage: "per capacità",
    byColour: "per colore",
    configNone: (x: RestockTimesView) => <b>{x.t.n > 0 ? "Nessuna" : "Ancora nessuna"} configurazione {rtIn(x)} ha un rifornimento confermato; le {N(x.configs)} configurazioni sono elencate così il primo rifornimento ha già la sua riga.</b>,
    configCaption: (x: RestockTimesView) => `Rifornimenti confermati di iPhone Duo ${rtIn(x)} per configurazione, dal ${giorno(x.t.since, false)} a oggi`,
    configHead: ["Configurazione", "Rifornimenti", "Quota", "Ultimo rifornimento (ora locale)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>La scelta della configurazione conta <b className="text-ink">più della scelta del negozio</b></> },
      x.storageRatio != null
        ? { text: <>Accontentati della capacità rifornita più spesso: circa <b className="text-ink">{N(x.storageRatio)}×</b> le probabilità della capacità successiva</> }
        : { text: <>Accontentati della capacità rifornita più spesso: le probabilità migliorano <b className="text-ink">nettamente</b></> },
      { text: <>Il <b className="text-ink">2TB</b>: un telefono da ordinare con consegna, e aspettare</>, no: true },
      { text: <>Prezzi e disponibilità in questo momento: <Link href="/which-iphone-duo-restocks-most">Quale iPhone Duo torna disponibile più spesso?</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>Metà {dei(sell.n)} rifornimenti esauriti {rtIn(x)} è sparita entro {N(sell.medianSec)} secondi; {il(rtPct(sell.within2min))} entro 2 minuti e {il(rtPct(sell.within20min))} entro 20.</b>,
    secUnit: "s",
    medianListing: "durata tipica, dall'arrivo all'esaurimento (mediana)",
    within2: "esauriti entro 2 minuti",
    within20: "esauriti entro 20 minuti",
    fastest: "l'esaurimento più rapido misurato",
    howLongNone: (x: RestockTimesView) => <b>{x.t.n > 0 ? "Troppo" : "Ancora troppo"} pochi rifornimenti esauriti {rtIn(x)} per misurarlo; diamo questi numeri a partire da dieci, e la pagina degli Stati Uniti ha il quadro completo.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>Una finestra di due minuti si prende con un <b className="text-ink">avviso</b>, non ricaricando apple.com</> },
      { text: <>È il numero che spiega tutto il resto di questa pagina</> },
      { text: <>Ogni rifornimento con i secondi che è durato, per configurazione e {rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">In quanto tempo si esaurisce un rifornimento di iPhone Duo?</Link></>, step: true },
    ],
    measured: "Ogni dato è il tempo tra il controllo che ha visto per primo la configurazione disponibile e quello che l'ha vista sparita, quindi è un limite superiore: le durate reali sono più brevi.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>Perché un rifornimento è un lampo, non uno stato: {x.one ? "un negozio" : `${N(x.stores)} negozi`} × {N(x.configs)} configurazioni = {N(x.pairs)} cose che possono essere disponibili {rtIn(x)}, e in questo momento {x.duoNow === 1 ? "1 negozio ha" : `${N(x.duoNow)} negozi hanno`} un iPhone Duo disponibile.</b>,
    pairs: "coppie negozio × configurazione che possono essere disponibili",
    listingNow: "con un iPhone Duo disponibile per il ritiro in questo momento",
    goneIn2: "dei rifornimenti spariti entro due minuti",
    last24: "rifornimenti confermati nelle ultime 24 ore",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Ultime 24 ore: <b className="text-ink">{pl(x.recent.restocks, "rifornimento confermato", "rifornimenti confermati")}</b> in {pl(x.recent.stores, "negozio", "negozi")} {rtIn(x)}</> }
        : today > 0
          ? { text: <>Oggi: <b className="text-ink">{pl(today, "rifornimento confermato", "rifornimenti confermati")}</b> {rtIn(x)}</> }
          : { text: <>La tabella giorno per giorno qui sopra mostra i rifornimenti che ci sono stati</> },
      { text: <>Ognuno visibile su apple.com per <b className="text-ink">un minuto o due</b></> },
      { text: <>«Non disponibile ovunque» al quarto giorno, o al quattordicesimo, <b className="text-ink">non</b> significa che Apple ha smesso</>, no: true },
    ],
    unavailableLinks: { explained: "Cosa significa «al momento non disponibile per il ritiro»", howToGet: "Come avere un iPhone Duo" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>Quasi tutta la saggezza popolare di <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> e <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> è sincera, riferita a un solo negozio e superata nel giro di un giorno; ecco le quattro affermazioni che vediamo più spesso, a confronto con {pl(x.t.n, "rifornimento confermato", "rifornimenti confermati")} {rtIn(x)}.</b>,
    redditCaption: "Affermazioni comuni su Reddit sui rifornimenti di iPhone Duo, verificate con i rifornimenti confermati da PickupChecker",
    redditHead: ["L'affermazione", "Cosa dicono i dati"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "«I negozi riforniscono di notte: controlla alle 3.»", answer: t.n > 0 ? <>{Il(rtPct(hourShare(t.byHour, 0, 6)))} dei rifornimenti è arrivato tra mezzanotte e le 6:00 ora locale; {il(rtPct(w.share))} {tra(w.from, w.to)}.</> : "Ancora nessun rifornimento registrato per verificarlo." },
        { claim: "«Apple rifornisce solo in un giorno della settimana.»", answer: t.n > 0 ? (t.peakWeekday != null ? <>Finora il giorno più intenso è {ilGiorno(t.peakWeekday)} ({N(t.byWeekday[t.peakWeekday])} su {N(t.n)}), ma i rifornimenti sono arrivati in {N(t.days)} giorni su {N(tracked)}.</> : <>I rifornimenti sono arrivati in {N(t.days)} {dei(tracked)} giorni monitorati{t.days === tracked ? ", senza un giorno vuoto" : ""}; il giorno più intenso lo indichiamo quando i dati coprono {WEEKDAY_MIN_SPAN} giorni.</>) : "Ancora nessun rifornimento registrato per verificarlo." },
        { claim: "«Chiama il negozio e chiedi quando arriva il camion.»", answer: "Apple non pubblica alcun calendario dei rifornimenti; quello che arriva su apple.com è disponibilità per il ritiro rilasciata online, che il negozio vede nello stesso momento di tutti gli altri." },
        { claim: "«Se dice non disponibile, è esaurito per sempre.»", answer: recent.restocks > 0 ? <>{pl(recent.restocks, "rifornimento confermato", "rifornimenti confermati")} in {pl(recent.stores, "negozio", "negozi")} nelle ultime 24 ore {recent.restocks === 1 ? "lo smentisce; è tornato" : "lo smentiscono; ognuno è tornato"} «non disponibile» nel giro di pochi minuti.</> : t.n > 0 ? <>{pl(t.n, "rifornimento confermato", "rifornimenti confermati")} dal {giorno(t.since, false)} {t.n === 1 ? "lo smentisce; è tornato" : "lo smentiscono; ognuno è tornato"} «non disponibile» nel giro di pochi minuti.</> : "Ancora niente con cui verificarlo." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>Il passaparola è ciò a cui ci si affida quando <b className="text-ink">non ci sono dati</b>; questa pagina sono i dati, gratis da leggere</> },
      { text: <>Dove Reddit ha ragione: i <b className="text-ink">consigli per il pagamento</b>, cioè accesso già fatto e Apple Pay pronto (<Link href="/how-to-grab-an-iphone-duo-restock">la nostra versione in 20 secondi</Link>)</> },
    ],

    // ---- method
    methodLead: <b>Un rifornimento viene contato quando apple.com rende disponibile una configurazione per il Ritiro in negozio in un negozio dove prima non lo era, con la conferma di due controlli concordanti.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "L'Apple Store" : "Ogni Apple Store"} {rtIn(x)} ogni <b className="text-ink">15 secondi</b>; i negozi dei tuoi avvisi ogni <b className="text-ink">5</b></> },
      { text: <>Gli altri tracker dichiarano <b className="text-ink">da 8 secondi a 15 minuti</b>; confrontiamo solo i numeri pubblicati</> },
      { text: <>Un primo «disponibile» viene ricontrollato <b className="text-ink">circa un secondo dopo</b> prima di contare</> },
      { text: <>Una disponibilità che sparisce viene confermata al <b className="text-ink">giro successivo</b></> },
      { text: <>La prima volta che vediamo un negozio, una richiesta fallita o scaduta: <b className="text-ink">mai</b> un rifornimento, mai «esaurito»</>, no: true },
      { text: <>Ore e date nell&apos;<b className="text-ink">ora locale</b> di ogni negozio; «ondate» = la stessa mezz&apos;ora in fusi diversi</> },
      { text: <>Segnalazioni di altri tracker{x.t.reports.length ? ` (${list(IT, x.reportNames)})` : ""}: righe proprie, etichettate, <b className="text-ink">mai in un totale</b></> },
      { text: <>Aggiornato circa ogni cinque minuti; <Link href={x.logHref}>il registro dei rifornimenti</Link> è in tempo reale</>, step: true },
    ],
    quote: "Puoi citare questi numeri con un link a questa pagina; PickupChecker è indipendente, non è affiliato ad Apple e legge la stessa disponibilità per il ritiro che chiunque vede su apple.com, solo molto più spesso.",
    alertIn: (x: RestockTimesView) => <>Imposta un avviso per l&apos;iPhone Duo{x.one ? "" : ` ${rtIn(x)}`}</>,

    // ---- related, FAQ, sources
    related: "Le altre domande sull'iPhone Duo",
    sameData: "Risposte con gli stessi dati",
    questions: {
      sellOut: "In quanto tempo si esaurisce un rifornimento?",
      alerts: "Il modo più rapido per ricevere una notifica",
      howToGet: "Come averne davvero uno",
      whichConfig: "Quale configurazione torna disponibile più spesso",
      nearMe: "Negozi che ce l'hanno vicino a me, adesso",
      unavailable: "Cosa significa «non disponibile»",
    },
    otherCountries: ((us: boolean): string => (us ? "La stessa pagina per altri paesi" : "Altri paesi")) as Dict["views"]["restockTimes"]["otherCountries"],
    place: {
      byCity: "Per città",
      storesLive: (x: RestockTimesView) => `Apple Store ${rtIn(x)}, in tempo reale`,
      countryPage: (c: Country) => `Orari dei rifornimenti di iPhone Duo ${inPaese(c.cc)}`,
      sourcesWhere: (x: RestockTimesView) => (x.stores === 1 ? `l'Apple Store ${rtIn(x)}` : `tutti i ${N(x.stores)} Apple Store ${rtIn(x)}`),
    },
    faqTitle: "Domande",
  },
};

