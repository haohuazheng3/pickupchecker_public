/**
 * Dutch strings: views — the product × place pages, the restock log, the live map, the iPhone Duo restock-times
 * answer page and the store index, as the Dutch versions (/nl-nl, /nl-be) print them. Same keys, arguments and
 * markup as English; `c: Country` is English data, named here in Dutch (places.countryLabel), and English place
 * or colour names inside product names are put into Dutch.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, storePath, storesOf, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, PlaceLevel, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, hourLabel as hourLabelIn, localStamp as localStampIn } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";
import { num, pct as pctIn, price, stamp, list, fitTitleW, hour, unit, secs, weekdays, distance } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";

const L = "nl" as const;
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const n$ = (v: number) => num(L, v);
const cnt = (n: number, one: string, many: string) => `${n$(n)} ${n === 1 ? one : many}`;
const ARTICLE: Partial<Record<CountryCode, string>> = { us: "de ", uk: "het ", ae: "de " };
const land = (cc: CountryCode) => countryLabel(cc, L);
/** "in Nederland", "in de Verenigde Staten". */
const inC = (c: Country | CountryCode) => { const cc = typeof c === "string" ? c : c.cc; return `in ${ARTICLE[cc] ?? ""}${land(cc)}`; };
const NOUN: Record<string, [string, string]> = {
  state: ["staat", "staten"], province: ["provincie", "provincies"], area: ["gebied", "gebieden"], department: ["departement", "departementen"],
  prefecture: ["prefectuur", "prefecturen"], emirate: ["emiraat", "emiraten"], canton: ["kanton", "kantons"], region: ["gewest", "gewesten"],
  county: ["provincie", "provincies"], city: ["stad", "steden"],
};
/** The country's word for its regions, in Dutch. */
const noun = (c: Country, many = false) => (NOUN[c.regionNoun ?? "area"] ?? NOUN.area)[many ? 1 : 0];
/** Apple's colour names in a product name ("iPhone Duo 512GB Night Sky" → "… Nachthemel"). */
const COLORS = ["Night Sky", "Star White", "Black", "Burgundy", "Glacier", "Silver"];
const tc = (s: string) => COLORS.reduce((a, col) => a.replace(new RegExp(`\\b${col}\\b`), colorLabel(col, L)), s);
const pname = (p: Product) => tc(p.name);
const pshort = (p: Product) => tc(p.short);
/** "2 dagen", "1 u 5 min", "minder dan een minuut". */
const dur = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return "minder dan een minuut";
  const m = Math.floor(s / 60);
  if (m < 60) return unit(L, m, "m");
  const h = Math.floor(m / 60);
  if (h < 24) return secs(L, m * 60);
  const d = Math.floor(h / 24);
  return h % 24 ? `${unit(L, d, "d")} ${unit(L, h % 24, "h")}` : unit(L, d, "d");
};
const fitT = (v: string[], max = 60) => fitTitleW(v, max);
const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
const appleOf = (s: Store) => appleStoreLabel(s, L);
/** A place of the product tree, named in Dutch. */
function placeNl(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return cc === "us" ? "de VS" : land(cc);
  if (place.level === "state") return regionLabel(cc, place.state!, L);
  if (place.level === "city") return cityLabel(cc, place.city!, L);
  return appleOf(place.store!);
}
const atPlace = (place: Place) => (place.level === "store" ? `bij ${placeNl(place)}` : `in ${placeNl(place)}`);
/** "€ 2.339" in the country's currency. */
const money = (cc: CountryCode, v: number) => price(L, COUNTRIES[cc], v);
/** "inclusief 21% btw", Canada and the US: "exclusief belasting", Hong Kong: "zonder btw". */
function taxNoteOf(c: Country): string {
  if (!c.pricesIncludeTax) return "exclusief belasting";
  const m = c.taxNote.match(/\((\d+(?:\.\d+)?)%\)/);
  if (!m) return "zonder btw";
  const word = /^VAT/.test(c.taxNote) ? "btw" : /^GST/.test(c.taxNote) ? "GST" : /^consumption/.test(c.taxNote) ? "consumptiebelasting" : "btw";
  return `inclusief ${pctIn(L, Number(m[1]))} ${word}`;
}

/* ---------------------------------------------------------------- restock-times helpers */

type RT = Dict["views"]["restockTimes"];
const rtN = (x: number) => n$(x);
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : pctIn(L, Math.round(x * 100)));
/** "di 3 nov" from a calendar day. */
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("nl-NL", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => stamp(L, iso, c.timeZone, true);
const localStamp = (iso: string, store: Parameters<typeof localStampIn>[1]) => localStampIn(iso, store, L);
const hourLabel = (h: number) => hourLabelIn(h, L);
/** "9:00–11:00" (tables, labels). */
const rangeLabel = (from: number, to: number) => `${hour(L, from)}–${hour(L, to % 24)}`;
/** "tussen 9:00 en 11:00" (sentences). */
const between = (from: number, to: number) => `tussen ${hour(L, from)} en ${hour(L, to % 24)}`;
/** One Apple Store in the country (Belgium). */
const oneIn = (c: Country | CountryCode) => storesOf(typeof c === "string" ? c : c.cc).length === 1;
const WEEKDAYS_NL = weekdays(L);
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "staat" : noun(x.c));
const rtRegions = (x: { us: boolean; c: Country }) => (x.us ? "staten" : noun(x.c, true));
/** "in Nederland", or the place of a place page: "in Noord-Holland", "in Amsterdam". */
const rtIn = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? `in ${x.place.name}` : inC(x.c));
/** What the "where" section breaks a page down by: the country's regions, a region's cities, a city's stores. */
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "stad" : "winkel") : rtRegion(x));
const rtUnits = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? "steden" : "winkels") : rtRegions(x));

/* ---------------------------------------------------------------- product copy (lib/seo/productCopy in Dutch) */

function productTitle(product: Product, place: Place, inStock: number): string {
  const n = place.stores.length;
  const name = pname(product);
  const short = pshort(product);
  if (place.level === "country" && ccOf(place) !== "us") {
    const w = inC(ccOf(place));
    return fitT([...(inStock > 0 ? [`${name} op voorraad in ${cnt(inStock, "Apple Store", "Apple Stores")} ${w}`, `${name} nu op voorraad ${w}`] : []), `${name}: voorraad om op te halen ${w}, live`, `${name}: voorraad ${w}`, `${short}: voorraad ${w}`, `${short}: voorraad`]);
  }
  if (place.level === "country") return fitT([...(inStock > 0 ? [`${name} nu op voorraad in ${cnt(inStock, "Apple Store", "Apple Stores")}`] : []), `${name}: voorraad om op te halen, live`, `${short}: voorraad, live`, `${short}: voorraad`]);
  if (place.level === "store") {
    const s = place.store!;
    const apple = appleOf(s);
    const now = inStock > 0 ? "nu op voorraad" : "voorraad om op te halen";
    const city = cityLabel(ccOf(place), s.city, L);
    return fitT([`${name} bij ${apple}: ${now}`, `${name} bij ${apple}`, ...(apple.includes(city) ? [] : [`${short} bij ${apple}, ${city}`]), `${short} bij ${apple}`, `${short} · ${apple.replace(/^Apple /, "")}`]);
  }
  const w = placeNl(place);
  return fitT([`${name} op voorraad in ${w}: ${n$(inStock)} van ${n$(n)}`, `${name} in ${w}: voorraad om op te halen`, `${short} op voorraad in ${w}`, `${short} in ${w}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = pname(product);
  const week = `${cnt(stats.week, "aanvulling", "aanvullingen")} deze week`;
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "nu op voorraad" : "nu niet op voorraad";
    return fitT([
      `${name}: voorraad om op te halen bij ${appleOf(s)}, ${cityLabel(ccOf(place), s.city, L)}: ${now}, ${week}. Live status, aanvultijden en alerts.`,
      `${name} bij ${appleOf(s)}: ${now}, ${week}. Live status en alerts.`,
    ], 155);
  }
  if (place.stores.length === 1) {
    const s = place.stores[0];
    return fitT([
      `${name}: ${inStock > 0 ? "nu op voorraad" : "nu niet op voorraad"} bij ${appleOf(s)}, ${week}. Live status, aanvultijden en alerts.`,
      `${name} bij ${appleOf(s)}: ${inStock > 0 ? "nu op voorraad" : "nu niet op voorraad"}, ${week}.`,
    ], 155);
  }
  const where = place.level === "country" ? (ccOf(place) === "us" ? "Apple Stores in de VS" : `Apple Stores ${inC(ccOf(place))}`) : `Apple Stores in ${placeNl(place)}`;
  const verb = inStock === 1 ? "heeft" : "hebben";
  return fitT([
    `${name}: ${n$(inStock)} van de ${n$(place.stores.length)} ${where} ${verb} hem nu om op te halen, ${week}. Live per winkel, aanvultijden en alerts.`,
    `${name}: ${n$(inStock)} van de ${n$(place.stores.length)} ${where} ${verb} hem nu, ${week}. Live per winkel en alerts.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const name = pname(product);
  const at = atPlace(place);
  const inStock = lines.filter((l) => l.available.length > 0);
  const near = nearest ? `${/^apple\b/i.test(nearest.name) ? nearest.name : `Apple ${nearest.name}`} in ${nearest.city}, op ${distance(L, ccOf(place), nearest.distance)} afstand` : null;
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `Is de ${name} op voorraad ${at}?`,
      a: l && l.available.length > 0
        ? `Ja${product.parts.length > 1 ? `, ${list(L, l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4, (k) => `nog ${n$(k)}`)}` : ""}, bij de laatste check.`
        : `Niet bij de laatste check${near ? `; de dichtstbijzijnde winkel met voorraad is ${near}` : ""}.`,
    });
  } else if (place.stores.length === 1) {
    const s = place.stores[0];
    out.push({
      q: `Heeft ${appleOf(s)} de ${name} nu?`,
      a: inStock.length > 0 ? "Ja, bij de laatste check." : `Niet bij de laatste check${near ? `; de dichtstbijzijnde winkel met voorraad is ${near}` : ""}.`,
    });
  } else {
    out.push({
      q: `Welke Apple Stores ${at} hebben de ${name}?`,
      a: inStock.length === 0
        ? `Geen bij de laatste check${near ? `; de dichtstbijzijnde met voorraad is ${near}` : ""}.`
        : `${cnt(inStock.length, "winkel", "winkels")} bij de laatste check: ${list(L, inStock.map((l) => appleOf(l.store)), 4, (k) => `nog ${n$(k)}`)}.`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `Hoe vaak is de ${name} weer op voorraad ${at}?`,
    a: stats.month === 0 ? `Geen aanvulling gelogd ${at} in de afgelopen ${n$(stats.days)} dagen.` : `${cnt(stats.month, "aanvulling", "aanvullingen")} in de afgelopen ${n$(stats.days)} dagen, ${n$(stats.week)} deze week${peak ? `, de meeste rond ${peak.hour} lokale tijd` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `Hoe lang blijft hij op voorraad ${at}?`, a: `Zo'n ${dur(stats.medianMs)} (mediaan) voordat hij weer uitverkocht is.` });
  return out;
}

function priceLabel(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => money(cc, v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => inC(c),
    liveMap: "Live kaart",
    restockLog: "Voorraadlogboek",
    alertMe: "Waarschuw me",
    lastDays: (days: number) => <>Laatste {n$(days)} dagen</>,
    since: "2 november 2026",
    sourcesWhere: (n: number, c: Country) => (n === 1 ? `de Apple Store ${inC(c)}` : `alle ${n$(n)} Apple Stores ${inC(c)}`),
    checker: (c: Country) => `iPhone-voorraadchecker ${land(c.cc)}`,
    appleStoresIn: (c: Country) => `Apple Stores ${inC(c)}`,
    storesWithIt: "winkels met voorraad",
    more: "Meer",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `bij ${name}` : `in ${name}`),
    h1Country: (model: string, c: Country) => `${tc(model)}: voorraad om op te halen ${inC(c)}`,
    h1Place: (model: string, where: string) => `${tc(model)} ${where}`,
    inStockNow: "Nu op voorraad",
    yes: "Ja",
    no: "Nee",
    pickup: "ophalen",
    configurations: "configuraties",
    ofStores: (n: number) => `van ${cnt(n, "winkel", "winkels")}`,
    restocks24h: "Aanvullingen 24 u",
    restocksHint: (week: number, month: number, days: number) => `${n$(week)} in 7 d · ${n$(month)} in ${n$(days)} d`,
    sellOuts: (days: number) => `Uitverkocht ${n$(days)} d`,
    stays: (ms: number) => `blijft ~${dur(ms)}`,
    noPairs: "nog geen paren",
    lastRestock: "Laatste aanvulling",
    noneYet: "nog geen",
    thisConfig: "deze configuratie",
    inDays: (days: number) => `in ${n$(days)} dagen`,
    notInStockNow: "Nu niet op voorraad",
    configsInStock: (n: number, of: number) => <span><b className="text-ink">{n$(n)}</b> van {n$(of)} configuraties op voorraad</span>,
    inStockAt: (n: number, of: number) => <span>Op voorraad in <b className="text-ink">{n$(n)}</b> van {n$(of)} {of === 1 ? "winkel" : "winkels"}</span>,
    checked: (live: ReactNode, price: string, tax: string) => <>Gecheckt {live} · {price}{tax}</>,
    taxNote: (c: Country) => taxNoteOf(c),
    beforeTax: "exclusief belasting",
    buyOnApple: "Kopen op apple.com",
    allStoresIn: (c: Country) => `Alle winkels ${inC(c)}`,
    everyIphoneHere: "Elke iPhone hier",
    everyIphone: (where: string) => `Elke iPhone ${where}`,
    panel: (model: string, where: string | null) => `Voor de ${tc(model)}${where ? ` ${where}` : ""}: vink de configuraties en winkels aan`,
    unitConfigs: "configuraties",
    unitStores: "winkels",
    otherConfigsHere: "Andere configuraties hier",
    byStorageColor: "Per opslag en kleur",
    nearestStores: "Dichtstbijzijnde winkels",
    closest: (link: ReactNode, dist: string) => <>Dichtstbij met voorraad nu: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Het laatst op voorraad",
    storesWithItNow: "Winkels met voorraad nu",
    storesIn: (where: string) => `Winkels ${where}`,
    colStatus: "status",
    colConfigs: "configuraties op voorraad",
    noStoreHasIt: "Geen enkele winkel heeft hem nu.",
    noStoreHereHasIt: "Geen enkele winkel hier heeft hem nu.",
    moreStores: (n: number) => <>+{n$(n)} winkels meer — bekijk ze per regio.</>,
    byRegion: (c: Country) => `Per ${noun(c)}`,
    byCity: "Per stad",
    nearbyStores: "Winkels in de buurt",
    latestChanges: "Laatste wijzigingen",
    nothingLogged: "Nog niets gelogd.",
    whenRestocks: "Wanneer er voorraad komt",
    howFast: "Hoe snel hij uitverkocht is",
    restocksByConfig: "Aanvullingen per configuratie",
    faqTitleCountry: (model: string, c: Country) => `${tc(model)} ${inC(c)}: veelgestelde vragen`,
    faqTitle: (model: string, where: string) => `${tc(model)} ${where}`,
    buySource: (model: string, c: Country) => `Apple: ${tc(model)} kopen (${land(c.cc)})`,
    nearby: "In de buurt",
    otherRegions: (c: Country) => `Andere ${noun(c, true)}`,
    elsewhereIn: (region: string) => `Elders in ${region}`,
    everyAppleStoreIn: (c: Country) => `Elke Apple Store ${inC(c)}`,
    across: (model: string, c: Country) => `${tc(model)} in ${c.cc === "us" ? "de hele VS" : `heel ${land(c.cc)}`}`,
    itemList: (model: string, where: string) => `${tc(model)} ${where}`,
    nearLead: (c: Country, model: string, inStock: number, n: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `${n === 1 ? `De Apple Store ${inC(c)} heeft` : `Geen enkele Apple Store ${inC(c)} heeft`} de ${tc(model)} nu om op te halen, dus "in de buurt" draait om welke winkel als eerste nieuwe voorraad krijgt. Stel een alert in bij de winkels waar je kunt komen, en de push gaat seconden nadat er een hem aanbiedt de deur uit.`
        : `${cnt(inStock, "winkel", "winkels")} van de ${n$(n)} ${inStock === 1 ? "heeft" : "hebben"} de ${tc(model)} nu: ${list(L, have.slice(0, 5).map((l) => `${l.store} in ${l.city} (${cnt(l.configs, "configuratie", "configuraties")})`), 5)}.`,
    nearHead: (c: Country) => [cap(noun(c)), "Winkels met voorraad nu"],
    nearCaption: (c: Country, model: string) => `Voorraad van de ${tc(model)} om op te halen per ${noun(c)}, bij de laatste check`,
    nearMe: (c: Country, model: string, alert: string) => `Wil je elke winkel gerangschikt zien vanaf waar je bent? Open de alert-instellingen op deze pagina en tik op In de buurt: afstanden zijn geschat over de weg, in kilometers, en elke winkel linkt naar een routebeschrijving. [Stel een ${tc(model)}-alert in](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => ({
      price: { q: `Wat kost de ${tc(model)} ${inC(c)}?`, a: `Van ${money(c.cc, low)} tot ${money(c.cc, high)} op apple.com (${taxNoteOf(c)}), afhankelijk van de opslag.` },
      reserve: { q: `Kan ik de ${tc(model)} reserveren om op te halen ${inC(c)}?`, a: `Nee; zodra een winkel een configuratie aanbiedt, koop je hem op apple.com met ophalen in de winkel, en dan wordt hij voor jouw tijdvak apart gelegd.${inStock === 0 ? " Nu biedt geen enkele winkel hem aan, dus met een alert ben je er als eerste bij." : ""}` },
    }),
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, n: number) => `iPhone-voorraadlogboek ${inC(c)}: ${n === 1 ? "de Apple Store" : `alle ${n$(n)} Apple Stores`}, live`,
    metaDescription: (c: Country, n: number) => `Elke aanvulling van de iPhone Duo, 18 Pro en Pro Max om op te halen ${n === 1 ? "in de Apple Store" : "in de Apple Stores"} ${inC(c)}, met exacte tijd, configuratie en kaart.`,
    h1: (c: Country) => `Voorraadlogboek ${inC(c)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{cnt(day, "aanvulling", "aanvullingen")} in 24 uur · {n$(week)} deze week{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. Tijden in jouw tijdzone.</>,
    allModels: "Alle modellen",
    restocks: "Aanvullingen",
    withSoldOut: "Aanvullingen + uitverkocht",
    regionLabel: (c: Country) => cap(noun(c)),
    allRegions: (c: Country) => `Alle ${noun(c, true)}`,
    filter: "Filteren",
    page: (k: number) => <>pagina {n$(k)}</>,
    newer: "← Nieuwer",
    older: "Ouder →",
    getAlerts: "Alerts instellen",
    byPlace: "Aanvullingen per plaats",
    byRegion: (c: Country) => `Per ${noun(c)}`,
    datasetName: (c: Country) => `Logboek van iPhone-aanvullingen om op te halen in Apple Stores ${inC(c)}`,
    datasetDescription: (c: Country) => `Elke bevestigde aanvulling en elk uitverkocht-moment van de iPhone Duo, iPhone 18 Pro en iPhone 18 Pro Max om op te halen in ${c.cc === "us" ? "alle 269 Apple Stores in de VS" : oneIn(c) ? `de Apple Store ${inC(c)}` : `de Apple Stores ${inC(c)}`}, met winkel, exacte configuratie en tijd. Een aanvulling wordt pas gelogd na twee overeenkomende antwoorden van apple.com, elke 15 seconden gecheckt (elke 5 bij winkels met alerts).`,
    datasetMeasured: ["Apple Store", "iPhone-model, opslag en kleur", "tijd van aanvulling", "tijd van uitverkocht"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, n: number) => `iPhone Duo-voorraadkaart: ${n === 1 ? "de Apple Store" : "elke Apple Store"} ${inC(c)}, live`,
    metaDescription: (c: Country, n: number) => `Live kaart van ${n === 1 ? "de Apple Store" : `alle ${n$(n)} Apple Stores`} ${inC(c)} met de voorraad van de iPhone Duo, 18 Pro en Pro Max om op te halen, per opslag en kleur.`,
    // regionNoun stays the English key: the map looks its Dutch word up in cdict map.nouns.
    country: (c: Country) => ({ name: land(c.cc), inName: inC(c), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Elke winkel",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, n: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` per ${noun(c)} en stad` : cities > 1 ? " per stad" : "";
      if (n === 1) return `Apple Store ${land(c.cc)}: ${appleOf(storesOf(c.cc)[0])} is de enige, met live voorraad van de iPhone Duo, 18 Pro en Pro Max om op te halen. Duo nu: ${duo ? "ja" : "nee"}; Pro Max: ${max ? "ja" : "nee"}.`;
      return `Apple Store ${land(c.cc)}: alle ${n$(n)} winkels${by}, met live voorraad van de iPhone Duo, 18 Pro en Pro Max om op te halen. Nu ${duo === 1 ? "heeft" : "hebben"} ${n$(duo)} de Duo, ${n$(max)} de Pro Max.`;
    },
    countAnswer: (n: number, spread: string, top: { name: string; count: number }[]) => `${n$(n)}, ${spread}${top.length ? `. ${top[0].name} heeft er de meeste (${n$(top[0].count)})${top[1] ? `, daarna ${top[1].name} (${n$(top[1].count)})` : ""}` : ""}.`,
    howMany: (c: Country) => <>Hoeveel Apple Stores zijn er {inC(c)}?</>,
    duoNow: (c: Country, n: number, have: Store[]): FaqItem => n === 1 ? ({
      q: `Heeft de Apple Store ${inC(c)} de iPhone Duo nu?`,
      a: have.length === 0 ? "Niet bij de laatste check. Deze pagina en de kaart worden bijgewerkt zodra de winkel hem aanbiedt, en een alert laat het je als eerste weten." : `Ja, bij de laatste check: ${appleOf(have[0])}.`,
    }) : ({
      q: `Welke Apple Stores ${inC(c)} hebben de iPhone Duo nu?`,
      a: have.length === 0 ? `Geen van de ${n$(n)} bij de laatste check. Deze pagina en de kaart worden bijgewerkt zodra er een hem aanbiedt, en een alert laat het je als eerste weten.` : `${n$(have.length)} van de ${n$(n)} bij de laatste check: ${have.slice(0, 6).map(appleOf).join(", ")}${have.length > 6 ? " en meer" : ""}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => `De snelste manier om er een te krijgen is een alert bij de winkels waar je kunt komen: [stel een iPhone Duo-alert in](${alert}). Elke winkel × exacte configuratie is één alert, en de push gaat seconden nadat een winkel hem aanbiedt de deur uit.`,
    intro: (c: Country, n: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => n === 1
      ? `Er is **1 Apple Store** ${inC(c)}: ${appleOf(storesOf(c.cc)[0])}, ${spread}. Nu op te halen: iPhone Duo **${now.duo ? "ja" : "nee"}**, iPhone 18 Pro Max **${now.max ? "ja" : "nee"}**, 18 Pro **${now.pro ? "ja" : "nee"}**. ${tax}`
      : `Er ${n === 1 ? "is" : "zijn"} **${cnt(n, "Apple Store", "Apple Stores")}** ${inC(c)}, ${spread}. Op dit moment ${now.duo === 1 ? "heeft" : "hebben"} **${n$(now.duo)}** daarvan een iPhone Duo om op te halen, **${n$(now.max)}** de iPhone 18 Pro Max en **${n$(now.pro)}** de 18 Pro. ${tax}${c.cc === "nl" ? "\n\nRotterdam en Utrecht hebben geen Apple Store: vanuit Rotterdam ligt Apple Den Haag het dichtstbij, vanuit Utrecht Apple Amsterdam." : ""}`,
    crumb: "Apple Stores",
    panel: (c: Country) => `Kies de iPhones en vink de winkels ${inC(c)} aan waar je kunt komen`,
    matrixLabel: "Voorraad per winkel",
    matrixH2: (c: Country) => <>Voorraad in elke Apple Store {inC(c)}</>,
    matrixHint: "Nu op voorraad / gevolgd, per model.",
    topCaption: (c: Country) => <>{cap(noun(c, true))} met de meeste Apple Stores (Apples winkellijst, zoals hier gevolgd)</>,
    regionHead: (c: Country) => cap(noun(c)),
    colStores: "Apple Stores",
    colCities: "Steden",
    locationsBy: (c: Country) => `Apple Stores per ${noun(c)}`,
    locationsIn: (c: Country) => `Apple Store-locaties ${inC(c)}`,
    storeCount: (n: number) => <>{cnt(n, "winkel", "winkels")}</>,
    storeCountAll: (n: number) => <>{n$(n)} winkels</>,
    whenRestock: (c: Country) => <>Wanneer krijgen winkels {inC(c)} nieuwe voorraad?</>,
    howFast: (c: Country) => <>Hoe snel is nieuwe voorraad {inC(c)} uitverkocht?</>,
    faqTitle: (c: Country) => `Apple Stores ${inC(c)}: veelgestelde vragen`,
    getApp: "Installeer de app",
    howItWorks: "Zo werkt het",
    pricing: "Prijzen",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: rtN,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: localStamp,
      hour: hourLabel,
      range: rangeLabel,
      weekday: (d: number) => WEEKDAYS_NL[d],
      store: (s: Store) => appleOf(s),
      storeWithPlace: (s: Store) => `${appleOf(s)} (${cityLabel(s.country ?? "us", s.city, L)})`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `Wanneer is de iPhone Duo weer op voorraad ${place ? `in ${place.name}` : inC(c)}?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = x.place ? (x.place.kind === "region" ? "stad" : null) : c.cc === "us" ? "staat" : c.regionNoun ? noun(c) : "winkel";
      const since = dateLabel(t.since, false);
      const where = rtIn(x);
      /** "uur, dag, provincie, winkel en configuratie"; a city page has no unit between day and store. */
      const by = region ? `${region}, winkel` : "winkel";
      const inStores = oneIn(c) ? `in de Apple Store ${where}` : `in Apple Stores ${where}`;
      return t.n > 0 && pattern
        ? fitT([
          `${rtN(t.n)} aanvullingen van de iPhone Duo ${inStores} sinds ${since}: ${rtPct(w.share)} ${between(w.from, w.to)} lokale tijd${t.sellout ? `, ${rtPct(t.sellout.within2min)} binnen 2 minuten weg` : ""}. Tabellen per uur, dag, ${by} en configuratie.`,
          `${rtN(t.n)} aanvullingen van de iPhone Duo ${inStores} sinds ${since}: ${rtPct(w.share)} ${between(w.from, w.to)} lokale tijd. Tabellen per uur, dag, ${region ?? "winkel"} en configuratie.`,
          `Aanvultijden iPhone Duo ${where}: ${rtN(t.n)} aanvullingen sinds ${since}, per uur, dag, ${region ?? "winkel"} en configuratie.`,
        ], 158)
        : t.n > 0
          ? fitT([
            `${rtN(t.n)} bevestigde aanvullingen van de iPhone Duo ${inStores} sinds ${since}, uit checks elke ${SPEED.checkSec} seconden: per lokaal uur, per dag, per ${by} en configuratie, en hoe lang elke bleef.`,
            `Aanvultijden iPhone Duo ${where}: ${rtN(t.n)} bevestigde aanvullingen sinds ${since}, per uur, dag, ${region ?? "winkel"} en configuratie.`,
          ], 158)
          : `Wanneer ${oneIn(c) ? "de Apple Store" : "de Apple Stores"} ${where} de iPhone Duo ${oneIn(c) ? "aanvult" : "aanvullen"}, uit de eigen checks van PickupChecker elke ${SPEED.checkSec} seconden sinds ${longDate(t.since)}: per uur, per dag, per winkel en configuratie.`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `Wanneer is de iPhone Duo weer op voorraad ${rtIn(x)}?`
      : x.t.n > 0
        ? `Vult Apple de iPhone Duo nog aan ${rtIn(x)}? Ja — hier zie je wanneer, uur voor uur`
        : `Vult Apple de iPhone Duo aan ${rtIn(x)}? Nog niet, volgens onze checks — dit is wat we volgen`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = rtIn(x);
      return t.unknown ? (
        <>Ons voorraadlogboek kon nu niet worden gelezen; de winkels {where} worden nog steeds elke {SPEED.checkSec} seconden gecheckt, en bij de volgende keer laden staan de cijfers hier weer.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Ja.</b> {one ? "De Apple Store" : "De Apple Stores"} {where} {one ? "heeft" : "hebben"} de iPhone Duo <b className="text-ink">{rtN(t.n)} keer aangevuld sinds {longDate(t.since)}</b>{tracked > 1 ? <>, op {rtN(t.days)} van de {rtN(tracked)} dagen</> : <> (we meten pas één dag)</>}
          {pattern && <>, <b className="text-ink">{rtPct(w.share)} daarvan {between(w.from, w.to)}</b> lokale tijd van de winkel</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Nog niet, volgens onze checks.</b> Sinds {longDate(t.since)} vraagt PickupChecker {one ? "de Apple Store" : `alle ${rtN(x.stores)} Apple Stores`} {where} elke {SPEED.checkSec} seconden naar de voorraad, en heeft nog geen nieuwe iPhone Duo-voorraad om op te halen bevestigd.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `bevestigde aanvullingen sinds ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${between(x.w.from, x.w.to)}, lokale tijd van de winkel`,
      days: "dagen met minstens één aanvulling",
      // English types this as its own two literals: the Dutch pair is cast to the same slot.
      now: ((one: boolean): string => (one ? "winkel heeft er nu een om op te halen" : "winkels hebben er nu een om op te halen")) as RT["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `vandaag (${dateLabel(today.date)})${x.one ? "" : `, in ${cnt(today.stores, "winkel", "winkels")}`}, tot nu toe`,
      weekday: "drukste weekdag tot nu toe",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>Laatste: <b className="text-ink">{latest.config}</b>{x.one ? null : <> bij <Link href={storePath(latest.store)} className="underline underline-offset-2">{appleOf(latest.store)}</Link></>}, {localStamp(latest.at, latest.store)} lokale tijd</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Het vaakst op <b className="text-ink">{WEEKDAYS_NL[x.t.peakWeekday]}</b></> }] : []),
      { text: <>Apple publiceert <b className="text-ink">geen schema</b> voor nieuwe voorraad; dit zijn onze eigen bevestigde checks, ongeveer elke vijf minuten bijgewerkt</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: x.one ? <>Nu heeft de winkel er <b className="text-ink">{x.duoNow ? "een" : "geen"}</b> om op te halen</> : <>Nu {x.duoNow === 1 ? "heeft" : "hebben"} <b className="text-ink">{rtN(x.duoNow)} van de {rtN(x.stores)}</b> er een om op te halen</> },
      { text: <>De tabellen hieronder vullen zich vanaf de eerste bevestigde aanvulling</>, step: true },
      { text: <>Uur- en weekdagpatronen, waar we de meeste data hebben: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">de pagina voor de VS</Link></>, step: true },
    ],
    keyFactsTitle: "De belangrijkste feiten",
    keyFacts: (x: RestockTimesView, k: { top: { label: string; restocks: number } | null; latest: { config: string; store: Store; at: string } | null }): string[] => {
      const { t, w, sell } = x;
      const wh = rtIn(x);
      const since = `sinds ${dateLabel(t.since, false)}`;
      const peak = t.peakHour;
      return [
        `PickupChecker heeft sinds ${longDate(t.since)} ${rtN(t.n)} ${t.n === 1 ? "aanvulling" : "aanvullingen"} van de iPhone Duo bevestigd ${x.one ? "in de Apple Store" : `in ${rtN(x.stores)} Apple Stores`} ${wh}, op ${t.days} van de ${rtN(x.tracked)} gevolgde dagen.`,
        ...(x.pattern
          ? [`${rtPct(w.share)} van de ${rtN(t.n)} aanvullingen van de iPhone Duo ${wh} ${since} kwam ${between(w.from, w.to)} lokale tijd van de winkel.`]
          : [`PickupChecker noemt een gebruikelijk aanvulmoment voor de iPhone Duo ${wh} pas vanaf ${PATTERN_MIN} aanvullingen op ${PATTERN_MIN_DAYS} verschillende dagen; de ${rtN(t.n)} tot nu toe halen dat niet.`]),
        ...(x.pattern && peak != null ? [`Het drukste losse uur voor aanvullingen van de iPhone Duo ${wh} was tot nu toe ${rangeLabel(peak, peak + 1)} lokale tijd, met ${rtN(t.byHour[peak])} van de ${rtN(t.n)} (${rtPct(t.byHour[peak] / t.n)}).`] : []),
        ...(sell ? [`Een aangevulde iPhone Duo ${wh} bleef een mediaan van ${rtN(sell.medianSec)} seconden op Apples ophaalpagina staan (${rtN(sell.n)} getimede aanvullingen ${since}); dat is hoe lang hij te koop stond, niet hoeveel er verkocht zijn.`] : []),
        ...(k.top && k.top.restocks > 0 ? [`De vaakst aangevulde iPhone Duo-configuratie ${wh} is ${k.top.label}: ${rtN(k.top.restocks)} van de ${rtN(t.n)} aanvullingen ${since} (${rtPct(k.top.restocks / t.n)}).`] : []),
        ...(k.latest ? [`De laatste bevestigde aanvulling van de iPhone Duo ${wh} was ${k.latest.config}${x.one ? "" : ` bij ${appleOf(k.latest.store)}`}, ${localStamp(k.latest.at, k.latest.store)} lokale tijd van de winkel.`] : []),
        `Stand ${zoneStamp(t.at, x.c)}: een aanvulling ${wh} telt pas na twee overeenkomende checks van Apples ophaalpagina, en de eerste keer dat iets opduikt na een onderbreking in het volgen telt nooit.`,
      ];
    },
    setUpAlert: "Stel een iPhone Duo-alert in",
    logLive: "Het voorraadlogboek, live",
    onThisPage: "Op deze pagina",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Tijdstip",
      "day-by-day": "Per dag",
      where: `Per ${rtUnit(x)}`,
      configuration: "Configuratie",
      "how-long": "Hoe lang het duurt",
      unavailable: "Waarom niet beschikbaar",
      reddit: "Reddit vs. data",
      method: "Zo tellen we",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `Hoe laat komt er nieuwe iPhone Duo-voorraad ${rtIn(x)}?`,
      "day-by-day": `Op welke dagen vulde Apple de iPhone Duo aan ${rtIn(x)}?`,
      where: `Welke Apple Stores ${rtIn(x)} krijgen het vaakst nieuwe iPhone Duo-voorraad?`,
      configuration: `Welke iPhone Duo-configuratie komt het vaakst terug ${rtIn(x)}?`,
      "how-long": `Hoe lang blijft nieuwe iPhone Duo-voorraad staan ${rtIn(x)}?`,
      unavailable: "Waarom zegt elke Apple Store “niet beschikbaar voor ophalen”?",
      reddit: "Wat Reddit zegt over nieuwe iPhone Duo-voorraad — en wat de data zegt",
      method: "Hoe telt PickupChecker een aanvulling?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtIn(x);
      const window = between(w.from, w.to);
      return [
        { q: `Wanneer is de iPhone Duo weer op voorraad ${where}?`, a: t.n > 0 && pattern
          ? `Vooral 's ochtends: ${rtPct(w.share)} van de ${rtN(t.n)} bevestigde aanvullingen sinds ${longDate(t.since)} kwam ${window} lokale tijd van de winkel, en ${rtPct(hourShare(t.byHour, 8, 12))} tussen 8:00 en 12:00. Apple publiceert geen schema; dit is het patroon dat PickupChecker ziet, ongeveer elke vijf minuten bijgewerkt.`
          : `Apple publiceert geen schema, en PickupChecker heeft ${where} ${cnt(t.n, "bevestigde aanvulling", "bevestigde aanvullingen")} gelogd sinds ${longDate(t.since)}${t.days ? `, op ${cnt(t.days, "dag", "dagen")}` : ""}. Een vast uur noemen we pas bij ${PATTERN_MIN} aanvullingen op ${PATTERN_MIN_DAYS} verschillende dagen, en deze pagina vult dat vanzelf in.` },
        { q: `Vult Apple de iPhone Duo ook in het weekend aan${us ? "" : ` ${where}`}?`, a: t.n > 0
          ? `${weekend > 0 ? "Tot nu toe wel" : "Nog niet in onze data"}: ${cnt(weekend, "aanvulling", "aanvullingen")} van de ${rtN(t.n)} ${weekend === 1 ? "viel" : "vielen"} op een zaterdag of zondag (${rtPct(weekend / t.n)}). ${t.peakWeekday != null ? `${cap(WEEKDAYS_NL[t.peakWeekday])} was tot nu toe de drukste weekdag.` : `Welke weekdag het drukst is, noemen we pas als de data ${WEEKDAY_MIN_SPAN} dagen beslaat; de onze beslaat er ${rtN(tracked)}.`}`
          : `Nog geen weekenddata ${where}; de tabel per dag op deze pagina vult zich zodra aanvullingen bevestigd zijn.` },
        { q: "Hoe laat moet ik beginnen met checken?", a: t.n > 0 && pattern
          ? `Check je zelf, zit dan vanaf ${hourLabel(w.from)} lokale tijd op apple.com met ophalen geselecteerd; dat venster van twee uur had ${rtPct(w.share)} van de aanvullingen. Een gemiddelde aanvulling ${sell ? `was bij de mediaan binnen ${sell.medianSec} seconden weg` : "duurt zo'n minuut"}, dus een alert die elke ${SPEED.fastSec} seconden checkt ([zo werken alerts](/iphone-duo-stock-alerts)) doet wat geen verversknop kan.`
          : `Tot er ${where} een duidelijk patroon is, laat je een alert het wachten doen: de winkels die je kiest worden elke ${SPEED.fastSec} seconden gecheckt, dag en nacht ([zo werken alerts](/iphone-duo-stock-alerts)).` },
        { q: "Waarom zeggen alle Apple Stores dat de iPhone Duo niet beschikbaar is?", a: sell
          ? `Omdat een aanvulling kort duurt: ${rtPct(sell.within2min)} van de ${rtN(sell.n)} uitverkochte aanvullingen die we ${where} maten, was binnen 2 minuten weg en ${rtPct(sell.within20min)} binnen 20. Nu ${x.duoNow === 1 ? "heeft" : "hebben"} ${rtN(x.duoNow)} van de ${rtN(x.stores)} winkels er een; op bijna elk ander moment is “niet beschikbaar” de eerlijke stand van apple.com, zelfs op een dag met tientallen aanvullingen ([wat “niet beschikbaar” betekent](/apple-store-pickup-availability-explained)).`
          : `Omdat ophaalvoorraad maar minuten tegelijk verschijnt. Nu ${x.duoNow === 1 ? "heeft" : "hebben"} ${rtN(x.duoNow)} van de ${cnt(x.stores, "winkel", "winkels")} ${where} er een ([wat “niet beschikbaar” betekent](/apple-store-pickup-availability-explained)).` },
        { q: "Hoe krijg ik een melding als mijn Apple Store de iPhone Duo aanvult?", a: `Stel een alert in voor de winkel en de exacte opslag en kleur: vanaf dan wordt die winkel elke ${SPEED.fastSec} seconden gecheckt en gaat er zo'n ${SPEED.alertSec} seconden na een bevestigde aanvulling een push de deur uit; wanneer die op je telefoon verschijnt, hangt af van het toestel en de verbinding ([alert instellen](${x.alert}); [zo werkt het](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: levering en ophalen (zo werkt beschikbaarheid voor ophalen in de winkel)",
      newsroom: "Apple Newsroom: iPhone Duo verkrijgbaar in Apple Stores wereldwijd (23 oktober 2026)",
      macRumors: "MacRumors: ophalen in de Apple Store voor de iPhone Duo weer live in de VS en Canada (24 oktober 2026)",
      reports: (tracker: string) => `${tracker}: meldingen van nieuwe iPhone Duo-voorraad in de lanceringsweek (hun waarnemingen, apart getoond, nooit meegeteld)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `Aanvultijden van de iPhone Duo in Apple Stores ${rtIn(x)}`,
      description: `Elke bevestigde aanvulling van de iPhone Duo om op te halen in Apple Stores ${rtIn(x)} sinds ${x.t.since}, met winkel, configuratie en tijd, uit de checks van PickupChecker elke ${SPEED.checkSec} seconden; samengevat per lokaal uur, dag, ${x.place?.kind === "city" ? "" : `${rtUnit(x)}, `}winkel en configuratie.`,
      spatial: `Apple Stores ${rtIn(x)}`,
      measured: ["tijd van aanvulling (lokale tijd van de winkel)", "Apple Store", "opslag en kleur van de iPhone Duo", "seconden tot uitverkocht"],
      size: `${cnt(x.t.n, "aanvulling", "aanvullingen")} in ${cnt(x.t.stores, "winkel", "winkels")}`,
    }),
    crumb: "Aanvultijden iPhone Duo",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{rtPct(x.w.share)} van de {rtN(x.t.n)} aanvullingen kwam {between(x.w.from, x.w.to)} lokale tijd van de winkel, en {rtPct(hourShare(x.t.byHour, 8, 12))} tussen 8:00 en 12:00.</b>,
    busiestHour: (count: number) => `drukste uur: ${cnt(count, "aanvulling", "aanvullingen")}`,
    morning: "tussen 8:00 en 12:00",
    evening: "na 17:00: de avond is niet dood",
    night: "tussen middernacht en 6:00",
    tooFew: (x: RestockTimesView) => <b>Te weinig dagen om {x.t.n > 0 ? "" : "al "}een uur te noemen: {cnt(x.t.n, "bevestigde aanvulling", "bevestigde aanvullingen")} op {cnt(x.t.days, "dag", "dagen")} sinds {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>Een vast uur vraagt <b className="text-ink">{PATTERN_MIN} aanvullingen op {PATTERN_MIN_DAYS} verschillende dagen</b></> },
      { text: <>Tien aanvullingen in één golf = één gebeurtenis, geen gewoonte</>, no: true },
      { text: <>De pagina herschrijft zichzelf naarmate de dagen zich opstapelen</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `Aanvullingen van de iPhone Duo ${rtIn(x)} per lokaal uur van de winkel, ${dateLabel(x.t.since, false)} tot vandaag (${cnt(x.t.n, "aanvulling", "aanvullingen")})`,
    hourHead: ["Lokaal uur", "Aanvullingen", "Aandeel"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>De ochtendpiek is <b className="text-ink">niet het openen van de deuren</b>{x.us ? ": de meeste Apple Stores in de VS gaan om 10:00 open" : ""}</> },
      { text: <>Ophaalvoorraad wordt <b className="text-ink">online</b> vrijgegeven, nog voor de rolluiken omhoog gaan</> },
      { text: <>Zelf checken: let op <b className="text-ink">{rangeLabel(x.w.from, x.w.to)}</b> op een doordeweekse ochtend</>, step: true },
      { text: <>Laat een <Link href={x.alert}>alert</Link> de <b className="text-ink">andere 22 uur</b> bewaken, waarin niemand zit te verversen</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Elke winkelpagina heeft een eigen grafiek, in de eigen tijdzone (<Link href={x.storesHref}>{x.us ? "Apple Stores per staat" : `winkels ${rtIn(x)}`}</Link>): een winkel die om 8:00 aanvult terwijl de rest om 9:00 komt, wil je kennen</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>We meten pas één dag, {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, met {cnt(t.n, "bevestigde aanvulling", "bevestigde aanvullingen")}{one ? "" : ` in ${cnt(t.stores, "winkel", "winkels")}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `Elke dag die we volgden, ${rtN(t.days)} van de ${rtN(t.days)}, had` : `${rtN(t.days)} van de ${rtN(tracked)} dagen sinds ${longDate(t.since)} ${t.days === 1 ? "had" : "hadden"}`} minstens één bevestigde aanvulling{t.peakWeekday != null ? `, en ${WEEKDAYS_NL[t.peakWeekday]} was de drukste weekdag` : ""}.</b>
      ) : (
        <b>Geen bevestigde aanvulling {rtIn(x)} sinds {longDate(t.since)}.</b>
      );
    },
    daysTracked: "gevolgde dagen met minstens één aanvulling",
    busiestDay: (x: RestockTimesView, day: DayRow) => `drukste dag, ${dateLabel(day.date)}${x.one ? "" : `, in ${cnt(day.stores, "winkel", "winkels")}`}`,
    busiestDayNone: "drukste dag",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `winkels die binnen één halfuur aanvulden, ${zoneStamp(drop.at, x.c)} (${cnt(drop.restocks, "configuratie", "configuraties")}): een landelijke golf, van buitenaf gezien`,
    weekend: (x: RestockTimesView) => `op een zaterdag of zondag (${cnt(x.weekend, "aanvulling", "aanvullingen")})`,
    dayCaption: (x: RestockTimesView) => `Aanvullingen van de iPhone Duo ${rtIn(x)}, per dag${x.t.reports.length ? "; de rijen met “gemeld” zijn gepubliceerde waarnemingen van andere trackers voor de dagen voordat onze eigen metingen begonnen, alleen getoond voor de tijdlijn" : ""}`,
    dayHead: { date: "Datum", restocks: "Aanvullingen", stores: "Winkels", busiest: "Drukste uur", source: "Bron" },
    soFar: " · tot nu toe",
    reportedBy: (names: string[]) => <>gemeld door {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: lanceringsdag, de eerste toestellen voor online bestellingen</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: reserveren om op te halen weer open{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Rijen met <b className="text-ink">gemeld</b>: waarnemingen van {x.reportNames.join(" en ")} uit de lanceringsweek, nooit meegeteld</> }
        : { text: <>Ons logboek van elke winkel {rtIn(x)} begint op <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Drukste weekdag: genoemd zodra de data <b className="text-ink">{WEEKDAY_MIN_SPAN} dagen</b> beslaat (de onze: {rtN(x.tracked)})</>, no: true }] : []),
      { text: <>Kijk naar de kolom <b className="text-ink">winkels</b>: dezelfde aanvullingen over meer winkels verspreid is een betere dag voor jou</>, step: true },
    ],

    // ---- where
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {cnt(hit[0].restocks, "aanvulling", "aanvullingen")} in {rtN(hit[0].stores)} van de {cnt(hit[0].storesTotal, "winkel", "winkels")} daar sinds {dateLabel(x.t.since, false)}{hit[1] ? <>, daarna {hit[1].name} ({rtN(hit[1].restocks)})</> : null}{hit[2] ? <> en {hit[2].name} ({rtN(hit[2].restocks)})</> : null}; {rtN(hit.length)} van de {rtN(total)} {rtUnits(x)} {hit.length === 1 ? "had" : "hadden"} minstens één aanvulling{total - hit.length > 0 ? ` en ${rtN(total - hit.length)} nog geen` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>Nog geen {rtUnit(x)} {rtIn(x)} heeft een bevestigde aanvulling; de tabel vult zich vanaf de eerste.</b>,
    regionCaption: (x: RestockTimesView) => `Bevestigde aanvullingen van de iPhone Duo per ${rtUnit(x)} ${rtIn(x)}, ${dateLabel(x.t.since, false)} tot vandaag`,
    regionHead: (x: RestockTimesView) => [cap(rtUnit(x)), "Aanvullingen", "Winkels aangevuld", "Laatste aanvulling (lokale tijd)"],
    ofN: (a: number, b: number) => <>{rtN(a)} van {rtN(b)}</>,
    storesCaption: (x: RestockTimesView) => `De winkels met de meeste aanvullingen van de iPhone Duo ${rtIn(x)}, ${dateLabel(x.t.since, false)} tot vandaag`,
    storesHead: ["Winkel", "Aanvullingen", "Dagen", "Meestal rond", "Laatste (lokale tijd)"],
    swaps: (x: RestockTimesView) => [
      { no: "De winkel met de meeste aanvullingen, waar die ook is", yes: `Twee of drie winkels die je ${x.pattern ? `rond ${hourLabel(x.w.from)}` : "'s ochtends"} binnen een uur kunt bereiken`, why: "Een aanvulling die je niet kunt halen, is geen aanvulling; zelfs de drukste winkel staat op een paar minuten per dag na op niet beschikbaar." },
      { no: "Eén winkel, en hopen", yes: "Een alert op elk van die winkels, en rijden naar de winkel die als eerste afgaat", why: "De telling vertelt je alleen naar welke van je winkels je als eerste rijdt." },
    ],
    nearMe: "Winkels met de Duo bij jou in de buurt, nu",

    // ---- configuration
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {rtN(top.restocks)} van de {rtN(x.t.n)} aanvullingen ({rtPct(top.restocks / x.t.n)}){rarest ? `; het zeldzaamst was de ${rarest.label}, met ${cnt(rarest.restocks, "aanvulling", "aanvullingen")}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: de configuratie die het vaakst terugkwam`,
    versus: (a: string, bCount: number, b: string) => `aanvullingen ${a}, tegen ${rtN(bCount)} voor ${b}`,
    restocksOf: (a: string) => `aanvullingen ${a}`,
    byStorage: "per opslag",
    byColour: "per kleur",
    configNone: (x: RestockTimesView) => <b>Nog geen enkele configuratie {rtIn(x)} heeft een bevestigde aanvulling; de acht configuraties staan er al, zodat de eerste aanvulling een rij heeft om in te landen.</b>,
    configCaption: (x: RestockTimesView) => `Bevestigde aanvullingen van de iPhone Duo ${rtIn(x)} per configuratie, ${dateLabel(x.t.since, false)} tot vandaag`,
    configHead: ["Configuratie", "Aanvullingen", "Aandeel", "Laatste aanvulling (lokale tijd)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>De keuze van configuratie weegt <b className="text-ink">zwaarder dan de keuze van winkel</b></> },
      x.storageRatio != null
        ? { text: <>De opslag die het vaakst terugkomt, kwam zo&apos;n <b className="text-ink">{num(L, x.storageRatio)}×</b> zo vaak terug als de volgende maat: meer eerdere ophaalvensters, geen belofte</> }
        : { text: <>De opslag die het vaakst terugkomt, had de meeste eerdere ophaalvensters; de tabel laat zien <b className="text-ink">hoeveel meer</b></> },
      { text: <>De <b className="text-ink">2TB</b>: een telefoon die je laat bezorgen, en waarop je wacht</>, no: true },
      { text: <>Prijzen en wat nu op voorraad is: <Link href="/which-iphone-duo-restocks-most">Welke iPhone Duo komt het vaakst terug?</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>De helft van de {rtN(sell.n)} uitverkochte aanvullingen {rtIn(x)} was binnen {sell.medianSec} seconden weg; {rtPct(sell.within2min)} binnen 2 minuten en {rtPct(sell.within20min)} binnen 20.</b>,
    secUnit: "sec.",
    medianListing: "gemiddeld te koop, van verschijnen tot weg (mediaan)",
    within2: "weg binnen 2 minuten",
    within20: "weg binnen 20 minuten",
    fastest: "snelste uitverkocht gemeten",
    howLongNone: (x: RestockTimesView) => <b>Nog te weinig uitverkochte aanvullingen {rtIn(x)} om te meten; we noemen deze cijfers vanaf tien, en de pagina voor de VS heeft het volledige beeld.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>Een venster van twee minuten vang je met een <b className="text-ink">alert</b>, niet door apple.com te verversen</> },
      { text: <>Dit is het getal dat al het andere op deze pagina verklaart</> },
      { text: <>Elke aanvulling met de seconden dat hij bleef, per configuratie en {rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">Hoe snel is een iPhone Duo-aanvulling uitverkocht?</Link></>, step: true },
    ],
    measured: "Elk getal is de tijd van de check die de configuratie voor het eerst zag tot de check die hem weg zag, dus een bovengrens; de echte duur is korter. Het is hoe lang Apples ophaalpagina de configuratie toonde, niet hoeveel toestellen er verkocht zijn.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>Omdat een aanvulling een flits is, geen toestand: {x.one ? "één winkel" : `${rtN(x.stores)} winkels`} × {rtN(x.configs)} configuraties = {rtN(x.pairs)} dingen die {rtIn(x)} op voorraad kunnen zijn, en op dit moment {x.duoNow === 1 ? "heeft 1 winkel" : `hebben ${rtN(x.duoNow)} winkels`} een iPhone Duo.</b>,
    pairs: "combinaties van winkel × configuratie die op voorraad kunnen zijn",
    listingNow: "met een iPhone Duo om op te halen, op dit moment",
    goneIn2: "van de aanvullingen binnen twee minuten weg",
    last24: "bevestigde aanvullingen in de afgelopen 24 uur",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Afgelopen 24 uur: <b className="text-ink">{cnt(x.recent.restocks, "bevestigde aanvulling", "bevestigde aanvullingen")}</b> in {cnt(x.recent.stores, "winkel", "winkels")} {rtIn(x)}</> }
        : today > 0
          ? { text: <>Vandaag: <b className="text-ink">{cnt(today, "bevestigde aanvulling", "bevestigde aanvullingen")}</b> {rtIn(x)}</> }
          : { text: <>De tabel per dag hierboven toont de aanvullingen die wél gebeurden</> },
      { text: <>Elke aanvulling staat <b className="text-ink">een minuut of twee</b> zichtbaar op apple.com</> },
      { text: <>“Overal niet beschikbaar” op dag vier, of dag veertien, betekent <b className="text-ink">niet</b> dat Apple ermee stopt</>, no: true },
    ],
    unavailableLinks: { explained: "Wat “niet beschikbaar voor ophalen” betekent", howToGet: "Zo krijg je een iPhone Duo" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>De meeste volkswijsheid op <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> en <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> is oprecht, gaat over één winkel en is binnen een dag achterhaald; hier zijn de vier beweringen die we het vaakst zien, naast {rtN(x.t.n)} bevestigde aanvullingen {rtIn(x)}.</b>,
    redditCaption: "Veelgehoorde Reddit-beweringen over nieuwe iPhone Duo-voorraad, getoetst aan de bevestigde aanvullingen van PickupChecker",
    redditHead: ["De bewering", "Wat de data zegt"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "“Winkels vullen 's nachts aan — check om 3 uur.”", answer: t.n > 0 ? <>{rtPct(hourShare(t.byHour, 0, 6))} van de aanvullingen viel tussen middernacht en 6:00 lokale tijd; {rtPct(w.share)} {between(w.from, w.to)}.</> : "Nog geen aanvulling gelogd om het aan te toetsen." },
        { claim: "“Apple vult maar op één weekdag aan.”", answer: t.n > 0 ? (t.peakWeekday != null ? <>{cap(WEEKDAYS_NL[t.peakWeekday])} is tot nu toe de drukste weekdag ({rtN(t.byWeekday[t.peakWeekday])} van {rtN(t.n)}), maar aanvullingen kwamen op {rtN(t.days)} van de {rtN(tracked)} dagen.</> : <>Aanvullingen kwamen op {rtN(t.days)} van de {rtN(tracked)} dagen die we volgden{t.days === tracked ? ", zonder één lege dag" : ""}; een drukste weekdag noemen we zodra de data {WEEKDAY_MIN_SPAN} dagen beslaat.</>) : "Nog geen aanvulling gelogd om het aan te toetsen." },
        { claim: "“Bel de winkel en vraag wanneer de vrachtwagen komt.”", answer: "Apple publiceert geen schema voor nieuwe voorraad; wat op apple.com verschijnt, is ophaalvoorraad die online wordt vrijgegeven, en die ziet de winkel op hetzelfde moment als iedereen." },
        { claim: "“Staat er niet beschikbaar, dan is hij voorgoed uitverkocht.”", answer: recent.restocks > 0 ? <>{cnt(recent.restocks, "bevestigde aanvulling", "bevestigde aanvullingen")} in {cnt(recent.stores, "winkel", "winkels")} in de afgelopen 24 uur {recent.restocks === 1 ? "zegt" : "zeggen"} iets anders; elke aanvulling stond binnen minuten weer op “niet beschikbaar”.</> : t.n > 0 ? <>{cnt(t.n, "bevestigde aanvulling", "bevestigde aanvullingen")} sinds {dateLabel(t.since, false)} {t.n === 1 ? "zegt" : "zeggen"} iets anders; elke aanvulling stond binnen minuten weer op “niet beschikbaar”.</> : "Nog niets om het aan te toetsen." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>Geruchten vullen het gat als er <b className="text-ink">geen data</b> is; deze pagina is de data, gratis te lezen</> },
      { text: <>Waar Reddit gelijk heeft: de <b className="text-ink">afrekentips</b> — ingelogd, Apple Pay klaar (<Link href="/how-to-grab-an-iphone-duo-restock">onze versie van 20 seconden</Link>)</> },
    ],

    // ---- method
    methodLead: <b>Een aanvulling telt als apple.com een configuratie aanbiedt om op te halen in een winkel waar hij eerst niet werd aangeboden, bevestigd door twee checks die het eens zijn.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "De Apple Store" : "Elke Apple Store"} {rtIn(x)} elke <b className="text-ink">{SPEED.checkSec} seconden</b>; de winkels met alerts elke <b className="text-ink">{SPEED.fastSec}</b></> },
      { text: <>Andere trackers noemen op hun eigen sites intervallen van <b className="text-ink">5 seconden tot 15 minuten</b>; we hebben ze niet gemeten, dus we vergelijken alleen wat ze zelf zeggen</> },
      { text: <>Een eerste “beschikbaar” wordt <b className="text-ink">zo&apos;n seconde later</b> opnieuw gevraagd voordat het telt</> },
      { text: <>Een aanbod dat verdwijnt, wordt bevestigd in de <b className="text-ink">volgende ronde</b></> },
      { text: <>De eerste keer dat we een winkel zien, een mislukte of verlopen aanvraag: <b className="text-ink">nooit</b> een aanvulling, nooit “niet op voorraad”</>, no: true },
      { text: <>Uren en datums in de <b className="text-ink">lokale tijd</b> van elke winkel; “golven” = hetzelfde halfuur over tijdzones heen</> },
      { text: <>Meldingen van andere trackers{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""}: eigen, gemarkeerde rijen, <b className="text-ink">nooit in een totaal</b></> },
      { text: <>Ongeveer elke vijf minuten bijgewerkt; <Link href={x.logHref}>het voorraadlogboek</Link> zelf is live</>, step: true },
    ],
    quote: "Je mag deze cijfers citeren met een link naar deze pagina; PickupChecker is onafhankelijk, niet verbonden aan Apple, en leest dezelfde beschikbaarheid voor ophalen die iedereen op apple.com kan zien, alleen veel vaker.",
    alertIn: (x: RestockTimesView) => <>iPhone Duo-alert instellen{x.one ? "" : ` ${rtIn(x)}`}</>,

    // ---- related, FAQ, sources
    related: "De andere vragen over de iPhone Duo",
    sameData: "Beantwoord met dezelfde data",
    questions: {
      sellOut: "Hoe snel is nieuwe voorraad uitverkocht?",
      alerts: "Snelste manier om een melding te krijgen",
      howToGet: "Zo krijg je er echt een",
      whichConfig: "Welke configuratie het vaakst terugkomt",
      nearMe: "Winkels met voorraad bij jou in de buurt, nu",
      unavailable: "Wat “niet beschikbaar” betekent",
    },
    otherCountries: ((us: boolean): string => (us ? "Dezelfde pagina voor andere landen" : "Andere landen")) as RT["otherCountries"],
    /** Place pages of another country (a region or city), and the country page's rows that lead to them. */
    place: {
      byCity: "Per stad",
      storesLive: (x: RestockTimesView) => `Apple Stores ${rtIn(x)}, live`,
      countryPage: (c: Country) => `Aanvultijden iPhone Duo ${inC(c)}`,
      sourcesWhere: (x: RestockTimesView) => `${x.stores === 1 ? "de Apple Store" : `alle ${rtN(x.stores)} Apple Stores`} ${rtIn(x)}`,
    },
    faqTitle: "Vragen",
  },
};
