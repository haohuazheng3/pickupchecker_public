/**
 * Swedish strings: views — the product × place pages, the restock log, the live map, the iPhone Duo restock-times
 * answer page and the store index. `c: Country` is English data: Sweden is named with countryLabel ("Sverige").
 * Store and Place objects are English data too; names are written with Apple Sweden's forms (places.ts).
 * Check intervals are only ever 15 and 5 seconds; no refund wording.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, storePath, storesOf, type Store } from "@/lib/apple/catalog";
import type { Country, CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, PlaceLevel, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { SPEED } from "@/lib/plans";
import { distance, stamp, weekdays } from "@/lib/i18n/format";
import { cityLabel, regionLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesView } from "../en/views";
import { SV, apple, between, cap, color, dur, fit, klock, kr, land, n, noun, pl, prod, range, share, taxNote, words } from "./util";

/* ---------------------------------------------------------------- helpers */

const WD = weekdays(SV);
/** "tors 29 okt." from a calendar day, or "29 okt." without the weekday. */
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("sv-SE", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
/** "29 oktober 2026". */
const longDate = (ymd: string) => new Intl.DateTimeFormat("sv-SE", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "27 okt. 9:30 CET": an instant in the country's reference zone. */
const zoneStamp = (iso: string, c: Country) => stamp(SV, iso, c.timeZone, true);
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "delstat" : noun(x.c));
const rtRegions = (x: { us: boolean; c: Country }) => (x.us ? "delstater" : noun(x.c, true));
const rtYet = (x: RestockTimesMeta) => (x.t.n > 0 ? "" : " ännu");
/** "Ingen"/"Inget" before a region word (område, departement and emirat are neuter). */
const none = (word: string) => (/^(område|departement|emirat)/.test(word) ? "Inget" : "Ingen");
const restocksN = (k: number) => pl(k, "påfyllning", "påfyllningar");
const confirmedN = (k: number) => pl(k, "bekräftad påfyllning", "bekräftade påfyllningar");
const storesN = (k: number) => pl(k, "butik", "butiker");
const inLand = (c: Country) => `i ${land(c.cc)}`;
/** "Apple X" from a bare store name. */
const appleOf = (name: string) => (/^apple\b/i.test(name) ? name : `Apple ${name}`);
/** A place in Swedish (Place objects carry English names). */
function placeName(place: Place): string {
  const cc: CountryCode = place.country ?? "us";
  if (place.level === "country") return land(cc);
  if (place.level === "state") return regionLabel(cc, place.state!, SV);
  if (place.level === "city") return cityLabel(cc, place.city!, SV);
  return apple(place.store!);
}

/* ---------------------------------------------------------------- product × place */

function productTitle(product: Product, place: Place, inStock: number): string {
  const k = place.stores.length;
  const cc: CountryCode = place.country ?? "us";
  const name = prod(product.name);
  const short = prod(product.short);
  if (place.level === "country") {
    const w = land(cc);
    return fit([
      ...(inStock > 0 ? [`${name} i lager i ${pl(inStock, "Apple Store", "Apple Store-butiker")} i ${w}`] : []),
      `${name} att hämta i ${w}, live`,
      `${short} att hämta i ${w}`,
      `${short} att hämta`,
    ]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const a = apple(s);
    return fit([`${name} på ${a}: ${inStock > 0 ? "i lager nu" : "lager för hämtning"}`, `${short} på ${a}, ${cityLabel(cc, s.city, SV)}`, `${short} på ${a}`, `${short} på ${s.name}`, `${short} · ${s.name}`]);
  }
  const w = placeName(place);
  return fit([`${name} i lager i ${w}: ${inStock} av ${k}`, `${name} i ${w}: lager för hämtning`, `${short} i lager i ${w}`, `${short} i ${w}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const cc: CountryCode = place.country ?? "us";
  const name = prod(product.name);
  const week = `${restocksN(stats.week)} den här veckan`;
  if (place.level === "store") {
    const s = place.store!;
    const a = apple(s);
    return fit([
      `${name} att hämta på ${a}, ${cityLabel(cc, s.city, SV)}: ${inStock > 0 ? "i lager nu" : "inte i lager just nu"}, ${week}. Status live, påfyllningstider och bevakningar.`,
      `${name} på ${a}: ${inStock > 0 ? "i lager nu" : "inte i lager nu"}, ${week}. Status live och bevakningar.`,
    ], 155);
  }
  const where = place.level === "country" ? `Apple Store-butiker i ${land(cc)}` : `Apple Store-butiker i ${placeName(place)}`;
  return fit([
    `${name} att hämta: ${inStock} av ${place.stores.length} ${where} har den nu, ${week}. Live per butik, påfyllningstider och bevakningar.`,
    `${name}: ${inStock} av ${place.stores.length} ${where} har den nu, ${week}. Live per butik och bevakningar.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const cc: CountryCode = place.country ?? "us";
  const out: FaqItem[] = [];
  const name = prod(product.name);
  const at = place.level === "store" ? `på ${apple(place.store!)}` : `i ${placeName(place)}`;
  const away = nearest ? `${appleOf(nearest.name)} i ${nearest.city}, ${distance(SV, cc, nearest.distance)} bort` : "";
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `Finns ${name} i lager ${at}?`,
      a: l && l.available.length > 0
        ? `Ja${product.parts.length > 1 ? `, ${words(l.available.map((i) => `${i.storage} ${color(i.color)}`), 4)}` : ""}, vid senaste kontrollen.`
        : `Inte vid senaste kontrollen${nearest ? `; närmaste butik som har den är ${away}` : ""}.`,
    });
  } else {
    out.push({
      q: `Vilka Apple Store-butiker ${at} har ${name}?`,
      a: inStock.length === 0
        ? `Inga vid senaste kontrollen${nearest ? `; närmaste som har den är ${away}` : ""}.`
        : `${storesN(inStock.length)} vid senaste kontrollen: ${words(inStock.map((l) => apple(l.store)), 4)}.`,
    });
  }
  const peak = peakOf(clock, SV);
  out.push({
    q: `Hur ofta kommer ${name} tillbaka i lager ${at}?`,
    a: stats.month === 0 ? `Ingen påfyllning loggad ${at} de senaste ${stats.days} dagarna.` : `${restocksN(stats.month)} de senaste ${stats.days} dagarna, ${n(stats.week)} den här veckan${peak ? `, de flesta runt ${peak.hour} lokal tid` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `Hur länge finns den kvar i lager ${at}?`, a: `Ungefär ${dur(stats.medianMs)} (median) innan den tar slut igen.` });
  return out;
}

function priceLabel(product: Product): string {
  const cc: CountryCode = product.country ?? "us";
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return lo === hi ? kr(cc, lo) : `${kr(cc, lo)}–${kr(cc, hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => inLand(c),
    liveMap: "Livekarta",
    restockLog: "Påfyllningslogg",
    alertMe: "Bevaka",
    lastDays: (days: number) => <>Senaste {days} dagarna</>,
    since: "2 november 2026",
    sourcesWhere: (k: number, c: Country) => (k === 1 ? `Apple Store-butiken ${inLand(c)}` : `alla ${k} Apple Store-butiker ${inLand(c)}`),
    checker: (c: Country) => `iPhone-lagerkoll ${land(c.cc)}`,
    appleStoresIn: (c: Country) => `Apple Store-butiker ${inLand(c)}`,
    storesWithIt: "butiker med den",
    more: "Mer",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `på ${name}` : `i ${name}`),
    h1Country: (model: string, c: Country) => `${prod(model)} att hämta ${inLand(c)}`,
    h1Place: (model: string, where: string) => `${prod(model)} ${where}`,
    inStockNow: "I lager nu",
    yes: "Ja",
    no: "Nej",
    pickup: "hämtning",
    configurations: "konfigurationer",
    ofStores: (k: number) => `av ${storesN(k)}`,
    restocks24h: "Påfyllningar 24 tim",
    restocksHint: (week: number, month: number, days: number) => `${n(week)} på 7 d · ${n(month)} på ${days} d`,
    sellOuts: (days: number) => `Slutsålda ${days} d`,
    stays: (ms: number) => `ligger ute ~${dur(ms)}`,
    noPairs: "inga par ännu",
    lastRestock: "Senaste påfyllning",
    noneYet: "ingen ännu",
    thisConfig: "den här konfigurationen",
    inDays: (days: number) => `på ${days} dagar`,
    notInStockNow: "Inte i lager nu",
    configsInStock: (k: number, of: number) => <span><b className="text-ink">{k}</b> av {of} konfigurationer i lager</span>,
    inStockAt: (k: number, of: number) => <span>I lager i <b className="text-ink">{k}</b> av {of} {of === 1 ? "butik" : "butiker"}</span>,
    checked: (live: ReactNode, price: string, tax: string) => <>Kollad {live} · {price}{tax}</>,
    taxNote: (c: Country) => taxNote(c),
    beforeTax: "före skatt",
    buyOnApple: "Köp på apple.com",
    allStoresIn: (c: Country) => `Alla butiker ${inLand(c)}`,
    everyIphoneHere: "Alla iPhone här",
    everyIphone: (where: string) => `Alla iPhone ${where}`,
    panel: (model: string, where: string | null) => `För ${prod(model)}${where ? ` ${where}` : ""}: bocka i konfigurationer och butiker`,
    unitConfigs: "konfigurationer",
    unitStores: "butiker",
    otherConfigsHere: "Andra konfigurationer här",
    byStorageColor: "Per lagring och färg",
    nearestStores: "Närmaste butiker",
    closest: (link: ReactNode, dist: string) => <>Närmast med den nu: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Senast i lager",
    storesWithItNow: "Butiker med den nu",
    storesIn: (where: string) => `Butiker ${where}`,
    colStatus: "status",
    colConfigs: "konfig. i lager",
    noStoreHasIt: "Ingen butik har den just nu.",
    noStoreHereHasIt: "Ingen butik här har den just nu.",
    moreStores: (k: number) => <>+{k} butiker till – se dem per delstat.</>,
    byRegion: (c: Country) => `Per ${noun(c)}`,
    byCity: "Per stad",
    nearbyStores: "Butiker i närheten",
    latestChanges: "Senaste ändringarna",
    nothingLogged: "Inget loggat än.",
    whenRestocks: "När den fylls på",
    howFast: "Hur snabbt den tar slut",
    restocksByConfig: "Påfyllningar per konfiguration",
    faqTitleCountry: (model: string, c: Country) => `${prod(model)} ${inLand(c)}: vanliga frågor`,
    faqTitle: (model: string, where: string) => `${prod(model)} ${where}`,
    buySource: (model: string, c: Country) => `Apple: Köp ${prod(model)} (${land(c.cc)})`,
    nearby: "I närheten",
    otherRegions: (c: Country) => `Andra ${noun(c, true)}`,
    elsewhereIn: (region: string) => `På andra håll i ${region}`,
    everyAppleStoreIn: (c: Country) => `Alla Apple Store-butiker ${inLand(c)}`,
    across: (model: string, c: Country) => `${prod(model)} i hela ${land(c.cc)}`,
    itemList: (model: string, where: string) => `${prod(model)} ${where}`,
    nearLead: (c: Country, model: string, inStock: number, k: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `Ingen Apple Store ${inLand(c)} har ${model} att hämta just nu, så ”nära mig” handlar om vilken butik som fyller på först. Bevaka butikerna du kan ta dig till, så kommer notisen sekunder efter att någon av dem listar den.`
        : `${inStock} av ${k} butiker har ${model} just nu: ${words(have.slice(0, 5).map((l) => `${l.store} i ${l.city} (${pl(l.configs, "konfiguration", "konfigurationer")})`), 5)}.`,
    nearHead: (c: Country) => [cap(noun(c)), "Butiker med den nu"],
    nearCaption: (c: Country, model: string) => `${model} att hämta per ${noun(c)}, vid senaste kontrollen`,
    nearMe: (_c: Country, model: string, alert: string) => `Vill du se alla butiker rangordnade från där du är: öppna bevakningen på sidan och tryck på Nära mig – avstånden är uppskattade längs vägen i kilometer, och varje butik har en vägbeskrivning. [Bevaka ${model}](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => ({
      price: { q: `Vad kostar ${model} ${inLand(c)}?`, a: `Från ${kr(c.cc, low)} till ${kr(c.cc, high)} på apple.com, ${taxNote(c)}, beroende på lagring.` },
      reserve: { q: `Kan jag reservera ${model} för hämtning ${inLand(c)}?`, a: `Nej; när en butik listar en konfiguration köper du den på apple.com och väljer Hämta i butik, så hålls den åt dig till din tid.${inStock === 0 ? " Just nu har ingen butik den, så en bevakning är sättet att vara först." : ""}` },
    }),
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, k: number) => `Påfyllningslogg för iPhone ${inLand(c)} – ${k === 1 ? "Apple Store" : `alla ${k} butiker`}, live`,
    metaDescription: (c: Country, k: number) => `Varje påfyllning av iPhone Duo, 18 Pro och Pro Max för hämtning i ${k === 1 ? "Apple Store-butiken" : "Apple Store-butikerna"} ${inLand(c)}, med exakt tid, konfiguration och karta.`,
    h1: (c: Country) => `Påfyllningslogg: ${land(c.cc)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{restocksN(day)} senaste dygnet · {n(week)} den här veckan{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. Tider i din tidszon.</>,
    allModels: "Alla modeller",
    restocks: "Påfyllningar",
    withSoldOut: "Påfyllningar + slutsålda",
    regionLabel: (c: Country) => cap(noun(c)),
    allRegions: (c: Country) => `Alla ${noun(c, true)}`,
    filter: "Filtrera",
    page: (k: number) => <>sida {k}</>,
    newer: "← Nyare",
    older: "Äldre →",
    getAlerts: "Få notiser",
    byPlace: "Påfyllningar per plats",
    byRegion: (c: Country) => `Per ${noun(c)}`,
    datasetName: (c: Country) => `Påfyllningslogg för iPhone att hämta i Apple Store, ${land(c.cc)}`,
    datasetDescription: (c: Country) => `Varje bekräftad påfyllning av iPhone Duo, iPhone 18 Pro och iPhone 18 Pro Max för hämtning i butik, och när den tog slut, i ${c.cc === "us" ? "alla 269 Apple Store-butiker i USA" : `Apple Store-butikerna ${inLand(c)}`}, med butik, exakt konfiguration och tid. En påfyllning loggas först efter två samstämmiga svar från apple.com, som kollas var 15:e sekund (var 5:e för butiker med bevakning).`,
    datasetMeasured: ["Apple Store", "iPhone-modell, lagring och färg", "tid för påfyllning", "tid då den tog slut"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, k: number) => `Livekarta: iPhone Duo att hämta i ${k === 1 ? "Apple Store" : "alla butiker"} ${inLand(c)}`,
    metaDescription: (c: Country, k: number) => `Livekarta över ${k === 1 ? "Apple Store-butiken" : `alla ${k} Apple Store-butiker`} ${inLand(c)} med iPhone Duo, 18 Pro och Pro Max att hämta just nu, per lagring och färg.`,
    // Data for the map component (it looks the region word up by this English key).
    country: (c: Country) => ({ name: c.name, inName: c.inName, regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Alla butiker",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const named = words(storesOf(c.cc).map((s) => { const nm = apple(s).replace(/^Apple /, ""); const city = cityLabel(c.cc, s.city, SV); return nm.includes(city) ? nm : `${nm} (${city})`; }));
      const by = c.regionNoun && regions > 1 ? ` per ${noun(c)} och stad` : cities > 1 ? " per stad" : "";
      return fit([
        ...(k <= 4 ? [`Alla ${k} Apple Store-butiker ${inLand(c)}: ${named}. iPhone att hämta live – ${duo} har iPhone Duo nu, ${max} har Pro Max.`] : []),
        `Alla ${k} Apple Store-butiker ${inLand(c)}${by}, med iPhone Duo, 18 Pro och Pro Max att hämta live: ${duo} har Duo nu, ${max} har Pro Max.`,
      ], 160);
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) => {
      const most = top.length && top[0].count > 1 && (!top[1] || top[0].count > top[1].count) ? `. Flest finns i ${top[0].name} (${top[0].count})${top[1] ? `, därefter ${top[1].name} (${top[1].count})` : ""}` : "";
      const sthlm = /Solna/.test(spread) && /Täby/.test(spread) ? ". Stockholms två butiker ligger i Solna (Mall of Scandinavia) och Täby (Täby Centrum) – inne i stan finns ingen" : "";
      return `${k}, ${spread}${most}${sthlm}.`;
    },
    howMany: (c: Country) => <>Hur många Apple Store finns det {inLand(c)}?</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: `Vilka Apple Store-butiker ${inLand(c)} har iPhone Duo just nu?`,
      a: have.length === 0
        ? `Ingen av de ${k} vid senaste kontrollen. Sidan och kartan uppdateras i samma stund som någon listar den, och en bevakning säger till dig först.`
        : `${have.length} av de ${k} vid senaste kontrollen: ${have.length > 6 ? `${have.slice(0, 6).map((x) => apple(x)).join(", ")} med flera` : words(have.map((x) => apple(x)))}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, SV),
    duoBlock: (alert: string) => `Snabbaste sättet att få en är en bevakning i butikerna du kan ta dig till: [bevaka iPhone Duo](${alert}). Varje butik × exakt konfiguration är en bevakning, och notisen kommer sekunder efter att en butik listar den.`,
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) =>
      `Det finns **${pl(k, "Apple Store", "Apple Store-butiker")}** ${inLand(c)}, ${spread}${/Solna/.test(spread) && /Täby/.test(spread) ? " – Solna och Täby är Stockholms två" : ""}. Just nu har **${now.duo}** av dem iPhone Duo att hämta, **${now.max}** har iPhone 18 Pro Max och **${now.pro}** har 18 Pro. ${tax}`,
    crumb: "Apple Store-butiker",
    panel: (c: Country) => `Välj telefoner och bocka i butikerna ${inLand(c)} som du kan ta dig till`,
    matrixLabel: "Lager per butik",
    matrixH2: (c: Country) => <>Lager i varje Apple Store {inLand(c)}</>,
    matrixHint: "I lager nu / bevakade, per modell.",
    topCaption: (c: Country) => <>{cap(noun(c, true))} med flest Apple Store-butiker (Apples butikslista, så som den bevakas här)</>,
    regionHead: (c: Country) => cap(noun(c)),
    colStores: "Apple Store-butiker",
    colCities: "Städer",
    locationsBy: (c: Country) => `Apple Store per ${noun(c)}`,
    locationsIn: (c: Country) => `Apple Store ${inLand(c)}`,
    storeCount: (k: number) => <>{k} {k > 1 ? "butiker" : "butik"}</>,
    storeCountAll: (k: number) => <>{k} butiker</>,
    whenRestock: (c: Country) => <>När fyller butikerna {inLand(c)} på?</>,
    howFast: (c: Country) => <>Hur snabbt tar påfyllningarna slut {inLand(c)}?</>,
    faqTitle: (c: Country) => `Apple Store ${inLand(c)}: vanliga frågor`,
    getApp: "Skaffa appen",
    howItWorks: "Så funkar det",
    pricing: "Priser",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n,
      pct: share,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">) => localStamp(iso, store, SV),
      hour: (h: number) => klock(h),
      range,
      weekday: (d: number) => WD[d],
      store: (s: Store) => apple(s),
      storeWithPlace: (s: Store) => `${apple(s)} (${cityLabel(s.country, s.city, SV)})`,
    },
    title: (c: Country) => `När fyller Apple på iPhone Duo ${inLand(c)}?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = c.cc === "us" ? "delstat" : c.regionNoun ? noun(c) : "butik";
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fit([
          `${restocksN(t.n)} av iPhone Duo i Apple Store-butiker ${inLand(c)} sedan ${since}: ${share(w.share)} ${between(w.from, w.to)} lokal tid${t.sellout ? `, ${share(t.sellout.within2min)} borta inom 2 minuter` : ""}. Tabeller per timme, dag, ${region}, butik och konfiguration.`,
          `${restocksN(t.n)} av iPhone Duo i Apple Store-butiker ${inLand(c)} sedan ${since}: ${share(w.share)} ${between(w.from, w.to)} lokal tid. Tabeller per timme, dag, ${region} och konfiguration.`,
          `När iPhone Duo fylls på ${inLand(c)}: ${restocksN(t.n)} sedan ${since}, per timme, dag, ${region} och konfiguration.`,
        ], 158)
        : t.n > 0
          ? fit([
            `${confirmedN(t.n)} av iPhone Duo i Apple Store-butiker ${inLand(c)} sedan ${since}, från kontroller var ${SPEED.checkSec}:e sekund: per lokal timme, dag för dag, per ${region}, butik och konfiguration, och hur länge varje varade.`,
            `När iPhone Duo fylls på ${inLand(c)}: ${confirmedN(t.n)} sedan ${since}, per timme, dag, ${region} och konfiguration.`,
          ], 158)
          : fit([`När Apple Store-butikerna ${inLand(c)} fyller på iPhone Duo, enligt våra egna kontroller var ${SPEED.checkSec}:e sekund sedan ${dateLabel(t.since, false)}: timme för timme, dag för dag och per butik.`, `När iPhone Duo fylls på ${inLand(c)}: kontroller var ${SPEED.checkSec}:e sekund sedan ${dateLabel(t.since, false)}, timme för timme och per butik.`], 158);
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `När fyller Apple på iPhone Duo ${inLand(x.c)}?`
      : x.t.n > 0
        ? `Fyller Apple fortfarande på iPhone Duo ${inLand(x.c)}? Ja – här är när, timme för timme`
        : `Fyller Apple på iPhone Duo ${inLand(x.c)}? Inte än enligt våra kontroller – det här bevakar vi`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const where = inLand(x.c);
      return t.unknown ? (
        <>Vår påfyllningslogg gick inte att läsa just nu; butikerna {where} kollas fortfarande var {SPEED.checkSec}:e sekund, och sidan kommer tillbaka med sina siffror vid nästa laddning.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Ja.</b> {one ? "Apple Store-butiken" : "Apple Store-butikerna"} {where} har fyllt på iPhone Duo <b className="text-ink">{pl(t.n, "gång", "gånger")} sedan {longDate(t.since)}</b>{tracked > 1 ? <>, på {t.days} av {tracked} dagar</> : <> (en dags bevakning hittills)</>}
          {pattern && <>, <b className="text-ink">{share(w.share)} av dem {between(w.from, w.to)}</b> i butikens lokala tid</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Inte än, enligt våra kontroller.</b> Sedan {longDate(t.since)} har PickupChecker frågat {one ? "Apple Store-butiken" : `alla ${x.stores} Apple Store-butiker`} {where} var {SPEED.checkSec}:e sekund utan att bekräfta någon påfyllning av iPhone Duo för hämtning.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `bekräftade påfyllningar sedan ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${between(x.w.from, x.w.to)}, butikens lokala tid`,
      days: "dagar med minst en påfyllning",
      // English infers a literal return type here; the Swedish words are the same shape.
      now: ((one: boolean) => (one ? "butik har en att hämta just nu" : "butiker har en att hämta just nu")) as unknown as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `idag (${dateLabel(today.date)})${x.one ? "" : `, i ${storesN(today.stores)}`}, hittills`,
      weekday: "vanligaste veckodagen hittills",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>Senast: <b className="text-ink">{latest.config}</b>{x.one ? null : <> på <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}, {localStamp(latest.at, latest.store, SV)} lokal tid</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Oftast på <b className="text-ink">{WD[x.t.peakWeekday]}ar</b></> }] : []),
      { text: <>Apple publicerar <b className="text-ink">inget schema för påfyllningar</b>; det här är våra egna bekräftade kontroller, uppdaterade ungefär var femte minut</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>Just nu har <b className="text-ink">{x.duoNow} av {x.stores}</b> en att hämta</> },
      { text: <>Tabellerna nedan fylls i från första bekräftade påfyllningen</>, step: true },
      { text: <>Mönster per timme och veckodag, där vi har mest data: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">sidan för USA (på engelska)</Link></>, step: true },
    ],
    setUpAlert: "Bevaka iPhone Duo",
    logLive: "Påfyllningsloggen, live",
    onThisPage: "På den här sidan",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Tid på dygnet",
      "day-by-day": "Dag för dag",
      where: `Per ${rtRegion(x)}`,
      configuration: "Konfiguration",
      "how-long": "Hur länge den finns kvar",
      unavailable: "Varför ”inte tillgänglig”",
      reddit: "Reddit mot data",
      method: "Så räknar vi",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `Vilken tid på dygnet fylls iPhone Duo på ${inLand(x.c)}?`,
      "day-by-day": `Vilka dagar har Apple fyllt på iPhone Duo ${inLand(x.c)}?`,
      where: `Vilka Apple Store-butiker fyller på iPhone Duo oftast ${inLand(x.c)}?`,
      configuration: `Vilken konfiguration av iPhone Duo fylls på oftast ${inLand(x.c)}?`,
      "how-long": `Hur länge varar en påfyllning av iPhone Duo ${inLand(x.c)}?`,
      unavailable: "Varför säger alla Apple Store ”inte tillgänglig”?",
      reddit: "Vad Reddit säger om påfyllningar av iPhone Duo – och vad datan säger",
      method: "Hur räknar PickupChecker en påfyllning?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = inLand(x.c);
      const window = between(w.from, w.to);
      return [
        { q: `När fyller Apple på iPhone Duo ${where}?`, a: t.n > 0 && pattern
          ? `${w.from < 12 ? "Mest på förmiddagen: " : ""}${share(w.share)} av de ${n(t.n)} bekräftade påfyllningarna sedan ${longDate(t.since)} kom ${window} i butikens lokala tid, och ${share(hourShare(t.byHour, 8, 12))} mellan kl. 8 och 12. Apple publicerar inget schema; det här är mönstret PickupChecker har sett, uppdaterat ungefär var femte minut.`
          : `Apple publicerar inget schema, och PickupChecker har loggat ${confirmedN(t.n)} ${where} sedan ${longDate(t.since)}${t.days ? ` på ${pl(t.days, "dag", "dagar")}` : ""}. En vanlig tid anges först när det finns ${PATTERN_MIN} påfyllningar på ${PATTERN_MIN_DAYS} olika dagar, och sidan fyller i den av sig själv.` },
        { q: `Fyller Apple på iPhone Duo på helger${us ? "" : ` ${where}`}?`, a: t.n > 0
          ? `${weekend > 0 ? "Ja, hittills" : "Inte än i vår data"}: ${restocksN(weekend)} av ${n(t.n)} kom på en lördag eller söndag (${share(weekend / t.n)}). ${t.peakWeekday != null ? `${cap(WD[t.peakWeekday])} har varit den vanligaste veckodagen.` : `Vilken veckodag som är vanligast anger vi inte förrän datan sträcker sig över ${WEEKDAY_MIN_SPAN} dagar; vår täcker ${tracked}.`}`
          : `Ingen helgdata ${where} än; tabellen dag för dag på sidan fylls i allt eftersom påfyllningar bekräftas.` },
        { q: "När ska jag börja kolla?", a: t.n > 0 && pattern
          ? `Kollar du själv: var inne på apple.com med Hämta i butik valt från ${klock(w.from)} lokal tid; det tvåtimmarsfönstret har stått för ${share(w.share)} av påfyllningarna. En typisk påfyllning ${sell ? `var borta inom ${sell.medianSec} sekunder (median)` : "varar ungefär en minut"}, så en bevakning som kollar var ${SPEED.fastSec}:e sekund ([så funkar bevakningar, på engelska](/iphone-duo-stock-alerts)) gör det som ingen uppdatering kan.`
          : `Tills ett mönster ${where} syns: låt en bevakning hålla utkik. Butikerna du väljer kollas var ${SPEED.fastSec}:e sekund, dygnet runt ([så funkar bevakningar, på engelska](/iphone-duo-stock-alerts)).` },
        { q: "Varför säger alla Apple Store att iPhone Duo inte är tillgänglig?", a: sell
          ? `För att en påfyllning är kort: ${share(sell.within2min)} av de ${n(sell.n)} slutsålda påfyllningarna vi mätt ${where} var borta inom 2 minuter och ${share(sell.within20min)} inom 20. Just nu har ${x.duoNow} av ${x.stores} butiker en; nästan alla andra stunder är den ärliga läsningen av apple.com ”inte tillgänglig”, även en dag med dussintals påfyllningar ([vad ”inte tillgänglig” betyder, på engelska](/apple-store-pickup-availability-explained)).`
          : `För att lager för hämtning dyker upp några minuter i taget. Just nu har ${x.duoNow} av ${storesN(x.stores)} ${where} en ([vad ”inte tillgänglig” betyder, på engelska](/apple-store-pickup-availability-explained)).` },
        { q: "Hur får jag en notis när min Apple Store fyller på iPhone Duo?", a: `Skapa en bevakning för butiken och exakt lagring och färg: från och med då kollas den butiken var ${SPEED.fastSec}:e sekund, och din telefon får besked ungefär ${SPEED.alertSec} sekunder efter att en påfyllning bekräftats ([skapa en bevakning](${x.alert}); [så funkar det, på engelska](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: Leverans och hämtning (så fungerar tillgänglighet för hämtning i butik)",
      newsroom: "Apple Newsroom: iPhone Duo kommer till Apple Store-butiker världen över (23 oktober 2026)",
      macRumors: "MacRumors: Apples system för hämtning i butik av iPhone Duo öppnade igen i USA och Kanada (24 oktober 2026)",
      reports: (tracker: string) => `${tracker}: rapporter om påfyllningar av iPhone Duo under lanseringsveckan (deras observationer, visas separat, räknas aldrig)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `Påfyllningstider för iPhone Duo i Apple Store-butiker ${inLand(x.c)}`,
      description: `Varje bekräftad påfyllning av iPhone Duo för hämtning i butik i Apple Store-butikerna ${inLand(x.c)} sedan ${x.t.since}, med butik, konfiguration och tid, från PickupCheckers kontroller var ${SPEED.checkSec}:e sekund; sammanställt per lokal timme, dag, ${rtRegion(x)}, butik och konfiguration.`,
      spatial: `Apple Store-butiker ${inLand(x.c)}`,
      measured: ["tid för påfyllning (butikens lokala tid)", "Apple Store", "lagring och färg för iPhone Duo", "sekunder tills den var slutsåld"],
      size: `${restocksN(x.t.n)} i ${storesN(x.t.stores)}`,
    }),
    crumb: "När iPhone Duo fylls på",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{share(x.w.share)} av de {n(x.t.n)} påfyllningarna kom {between(x.w.from, x.w.to)} i butikens lokala tid, och {share(hourShare(x.t.byHour, 8, 12))} mellan kl. 8 och 12.</b>,
    busiestHour: (count: number) => `vanligaste enskilda timmen: ${restocksN(count)}`,
    morning: "mellan kl. 8 och 12",
    evening: "efter kl. 17: kvällarna är inte döda",
    night: "mellan midnatt och kl. 6",
    tooFew: (x: RestockTimesView) => <b>För få dagar för att peka ut en timme{rtYet(x)}: {confirmedN(x.t.n)} på {pl(x.t.days, "dag", "dagar")} sedan {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>En vanlig tid kräver <b className="text-ink">{PATTERN_MIN} påfyllningar på {PATTERN_MIN_DAYS} olika dagar</b></> },
      { text: <>Tio påfyllningar i en enda våg = en händelse, inte en vana</>, no: true },
      { text: <>Sidan skriver om sig själv allt eftersom dagarna blir fler</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `Påfyllningar av iPhone Duo ${inLand(x.c)} per lokal timme i butiken, ${dateLabel(x.t.since, false)} till idag (${restocksN(x.t.n)})`,
    hourHead: ["Lokal timme", "Påfyllningar", "Andel"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>Morgontoppen är <b className="text-ink">inte när dörrarna öppnar</b>{x.us ? ": de flesta Apple Store i USA öppnar kl. 10" : ""}</> },
      { text: <>Lagret för hämtning släpps <b className="text-ink">online</b>, innan butiken öppnar</> },
      { text: <>Kollar du själv: håll koll <b className="text-ink">{range(x.w.from, x.w.to)}</b> på vardagar</>, step: true },
      { text: <>Låt en <Link href={x.alert}>bevakning</Link> ta <b className="text-ink">de andra 22 timmarna</b>, som ingen sitter och uppdaterar</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Varje butikssida har sitt eget diagram, i sin egen tidszon (<Link href={x.storesHref}>{x.us ? "Apple Store per delstat" : `butikerna ${inLand(x.c)}`}</Link>): en butik som fyller på kl. 8 där andra fyller på kl. 9 är värd att känna till</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>En dags bevakning hittills, {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, med {confirmedN(t.n)}{one ? "" : ` i ${storesN(t.stores)}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `Varje dag vi har bevakat, ${t.days} av ${t.days},` : `${t.days} av de ${tracked} dagarna sedan ${longDate(t.since)}`} hade minst en bekräftad påfyllning{t.peakWeekday != null ? `, och ${WD[t.peakWeekday]} har varit den vanligaste veckodagen` : ""}.</b>
      ) : (
        <b>Ingen bekräftad påfyllning {inLand(x.c)} sedan {longDate(t.since)}.</b>
      );
    },
    daysTracked: "bevakade dagar med minst en påfyllning",
    busiestDay: (x: RestockTimesView, day: DayRow) => `dagen med flest, ${dateLabel(day.date)}${x.one ? "" : `, i ${storesN(day.stores)}`}`,
    busiestDayNone: "dagen med flest",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `butiker fyllde på inom samma halvtimme, ${zoneStamp(drop.at, x.c)} (${pl(drop.restocks, "konfiguration", "konfigurationer")}): en nationell påfyllning sedd utifrån`,
    weekend: (x: RestockTimesView) => `på en lördag eller söndag (${restocksN(x.weekend)})`,
    dayCaption: (x: RestockTimesView) => `Påfyllningar av iPhone Duo ${inLand(x.c)}, dag för dag${x.t.reports.length ? "; raderna märkta ”rapporterad” är andra bevakningstjänsters publicerade observationer för dagarna innan vår egen bevakning startade, och visas bara för tidslinjen" : ""}`,
    dayHead: { date: "Datum", restocks: "Påfyllningar", stores: "Butiker", busiest: "Vanligaste timmen", source: "Källa" },
    soFar: " · hittills",
    reportedBy: (names: string[]) => <>rapporterad av {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: lanseringsdagen, de första exemplaren för onlinebeställningar</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: bokning för hämtning öppnade igen{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Rader märkta <b className="text-ink">rapporterad</b>: observationer från {words(x.reportNames)} under lanseringsveckan, räknas aldrig</> }
        : { text: <>Vår logg över varje butik {inLand(x.c)} börjar <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Vanligaste veckodagen: anges när datan sträcker sig över <b className="text-ink">{WEEKDAY_MIN_SPAN} dagar</b> (vår täcker {x.tracked})</>, no: true }] : []),
      { text: <>Titta på kolumnen <b className="text-ink">butiker</b>: lika många påfyllningar i fler butiker är en bättre dag för dig</>, step: true },
    ],

    // ---- where
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {restocksN(hit[0].restocks)} {hit[0].storesTotal === 1 ? "i sin enda butik" : `i ${hit[0].stores} av sina ${hit[0].storesTotal} butiker`} sedan {dateLabel(x.t.since, false)}{hit[1] ? <>, därefter {hit[1].name} ({n(hit[1].restocks)})</> : null}{hit[2] ? <> och {hit[2].name} ({n(hit[2].restocks)})</> : null}; {hit.length} av {total} {rtRegions(x)} har haft minst en påfyllning{total - hit.length > 0 ? ` och ${total - hit.length} ingen än` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{none(rtRegion(x))} {rtRegion(x)} {inLand(x.c)} har en bekräftad påfyllning än; tabellen fylls i från den första.</b>,
    regionCaption: (x: RestockTimesView) => `Bekräftade påfyllningar av iPhone Duo per ${rtRegion(x)} ${inLand(x.c)}, ${dateLabel(x.t.since, false)} till idag`,
    regionHead: (x: RestockTimesView) => [cap(rtRegion(x)), "Påfyllningar", "Butiker med påfyllning", "Senaste påfyllning (lokal tid)"],
    ofN: (a: number, b: number) => <>{a} av {b}</>,
    storesCaption: (x: RestockTimesView) => `Butikerna med flest påfyllningar av iPhone Duo ${inLand(x.c)}, ${dateLabel(x.t.since, false)} till idag`,
    storesHead: ["Butik", "Påfyllningar", "Dagar", "Oftast runt", "Senast (lokal tid)"],
    swaps: (x: RestockTimesView) => [
      { no: "Butiken med flest påfyllningar, var den än ligger", yes: `Två eller tre butiker du hinner till inom en timme runt ${x.pattern ? klock(x.w.from) : "morgonen"}`, why: "En påfyllning du inte hinner till är ingen påfyllning; även den mest aktiva butiken visar ”inte tillgänglig” nästan hela dagen." },
      { no: "En butik, och hopp", yes: "En bevakning på var och en, och åk till den som slår till", why: "Topplistan säger bara vilken av dina butiker du ska åka till först." },
    ],
    nearMe: "Butiker med Duo nära mig, just nu",

    // ---- configuration
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {n(top.restocks)} av de {n(x.t.n)} påfyllningarna ({share(top.restocks / x.t.n)}){rarest ? `; ovanligast var ${rarest.label}, med ${restocksN(rarest.restocks)}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: den konfiguration som fylls på oftast`,
    versus: (a: string, bCount: number, b: string) => `påfyllningar av ${a}, mot ${n(bCount)} för ${b}`,
    restocksOf: (a: string) => `påfyllningar av ${a}`,
    byStorage: "per lagring",
    byColour: "per färg",
    configNone: (x: RestockTimesView) => <b>Ingen konfiguration {inLand(x.c)} har en bekräftad påfyllning{rtYet(x)}; alla åtta konfigurationerna listas så att den första påfyllningen har en rad att hamna på.</b>,
    configCaption: (x: RestockTimesView) => `Bekräftade påfyllningar av iPhone Duo ${inLand(x.c)} per konfiguration, ${dateLabel(x.t.since, false)} till idag`,
    configHead: ["Konfiguration", "Påfyllningar", "Andel", "Senaste påfyllning (lokal tid)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>Valet av konfiguration betyder <b className="text-ink">mer än valet av butik</b></> },
      x.storageRatio != null
        ? { text: <>Nöj dig med den lagring som fylls på oftast: ungefär <b className="text-ink">{n(x.storageRatio)}×</b> chansen mot nästa storlek</> }
        : { text: <>Nöj dig med den lagring som fylls på oftast: dina chanser ökar <b className="text-ink">rejält</b></> },
      { text: <><b className="text-ink">2TB</b>: en telefon du beställer för leverans och väntar på</>, no: true },
      { text: <>Priser och vad som finns i lager just nu: <Link href="/which-iphone-duo-restocks-most">Vilken iPhone Duo fylls på oftast? (på engelska)</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>Hälften av de {n(sell.n)} slutsålda påfyllningarna {inLand(x.c)} var borta inom {sell.medianSec} sekunder; {share(sell.within2min)} inom 2 minuter och {share(sell.within20min)} inom 20.</b>,
    secUnit: "s",
    medianListing: "typisk tid i lager, från listad till borta (median)",
    within2: "borta inom 2 minuter",
    within20: "borta inom 20 minuter",
    fastest: "snabbast uppmätta tid till slutsåld",
    howLongNone: (x: RestockTimesView) => <b>För få slutsålda påfyllningar {inLand(x.c)} för att mäta{rtYet(x)}; vi anger de här siffrorna från tio, och sidan för USA har hela bilden.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>Ett tvåminutersfönster fångas av en <b className="text-ink">bevakning</b>, inte genom att uppdatera apple.com</> },
      { text: <>Det här är siffran som förklarar allt annat på sidan</> },
      { text: <>Varje påfyllning med antalet sekunder den varade, per konfiguration och {rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">Hur snabbt tar en påfyllning av iPhone Duo slut? (på engelska)</Link></>, step: true },
    ],
    measured: "Varje siffra är tiden från kontrollen som först såg konfigurationen listad till kontrollen som såg den borta, så den är en övre gräns; de verkliga tiderna är kortare.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>För att en påfyllning är ett ögonblick, inte ett tillstånd: {x.one ? "en butik" : `${n(x.stores)} butiker`} × {x.configs} konfigurationer = {n(x.pairs)} saker som kan finnas i lager {inLand(x.c)}, och just nu har {x.duoNow === 1 ? "1 butik" : `${x.duoNow} butiker`} någon iPhone Duo.</b>,
    pairs: "kombinationer av butik × konfiguration som kan finnas i lager",
    listingNow: "har en iPhone Duo att hämta just nu",
    goneIn2: "av påfyllningarna borta inom två minuter",
    last24: "bekräftade påfyllningar de senaste 24 timmarna",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Senaste 24 timmarna: <b className="text-ink">{confirmedN(x.recent.restocks)}</b> i {storesN(x.recent.stores)} {inLand(x.c)}</> }
        : today > 0
          ? { text: <>Idag: <b className="text-ink">{confirmedN(today)}</b> {inLand(x.c)}</> }
          : { text: <>Tabellen dag för dag ovan visar påfyllningarna som faktiskt skedde</> },
      { text: <>Var och en syns på apple.com i <b className="text-ink">en minut eller två</b></> },
      { text: <>”Inte tillgänglig överallt” dag fyra, eller dag fjorton, betyder <b className="text-ink">inte</b> att Apple har slutat</>, no: true },
    ],
    unavailableLinks: { explained: "Vad ”inte tillgänglig för hämtning” betyder (på engelska)", howToGet: "Så får du tag på en iPhone Duo (på engelska)" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>Det mesta av folkvisdomen i <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> och <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> är uppriktigt menat, bygger på en enda butik och är inaktuellt inom ett dygn; här är de fyra påståenden vi ser oftast, mot {n(x.t.n)} bekräftade påfyllningar {inLand(x.c)}.</b>,
    redditCaption: "Vanliga påståenden på Reddit om påfyllningar av iPhone Duo, jämförda med PickupCheckers bekräftade påfyllningar",
    redditHead: ["Påståendet", "Vad datan säger"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "”Butikerna fylls på under natten – kolla kl. 3.”", answer: t.n > 0 ? <>{share(hourShare(t.byHour, 0, 6))} av påfyllningarna kom mellan midnatt och kl. 6 lokal tid; {share(w.share)} kom {between(w.from, w.to)}.</> : "Ingen påfyllning loggad än att testa det mot." },
        { claim: "”Apple fyller bara på en viss veckodag.”", answer: t.n > 0 ? (t.peakWeekday != null ? <>{cap(WD[t.peakWeekday])} är den vanligaste veckodagen hittills ({n(t.byWeekday[t.peakWeekday])} av {n(t.n)}), men påfyllningar kom på {t.days} av {tracked} dagar.</> : <>Påfyllningar kom på {t.days} av de {tracked} dagar vi har bevakat{t.days === tracked ? ", utan en enda tom dag" : ""}; en vanligaste veckodag anges när datan sträcker sig över {WEEKDAY_MIN_SPAN} dagar.</>) : "Ingen påfyllning loggad än att testa det mot." },
        { claim: "”Ring butiken och fråga när lastbilen kommer.”", answer: "Apple publicerar inget schema för påfyllningar; det som når apple.com är lager för hämtning som släpps online, och butiken ser det i samma ögonblick som alla andra." },
        { claim: "”Står det inte tillgänglig är den slut för gott.”", answer: recent.restocks > 0 ? <>{confirmedN(recent.restocks)} i {storesN(recent.stores)} de senaste 24 timmarna säger något annat; var och en var ”inte tillgänglig” igen inom några minuter.</> : t.n > 0 ? <>{confirmedN(t.n)} sedan {dateLabel(t.since, false)} säger något annat; var och en var ”inte tillgänglig” igen inom några minuter.</> : "Inget att testa det mot än." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>Rykten är vad folk tar till när det <b className="text-ink">saknas data</b>; den här sidan är datan, fri att läsa</> },
      { text: <>Där Reddit har rätt: <b className="text-ink">tipsen för kassan</b> – inloggad, Apple Pay redo (<Link href="/how-to-grab-an-iphone-duo-restock">vår version på 20 sekunder, på engelska</Link>)</> },
    ],

    // ---- method
    methodLead: <b>En påfyllning räknas när apple.com listar en konfiguration för hämtning i butik i en butik där den inte var listad, bekräftat av två kontroller som stämmer överens.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "Apple Store-butiken" : "Varje Apple Store"} {inLand(x.c)} var <b className="text-ink">{SPEED.checkSec}:e sekund</b>; butikerna med bevakning var <b className="text-ink">{SPEED.fastSec}:e</b></> },
      { text: <>Andra bevakningstjänster uppger <b className="text-ink">från 8 sekunder till 15 minuter</b>; vi jämför bara publicerade siffror</> },
      { text: <>Ett första ”tillgänglig” kontrolleras igen <b className="text-ink">ungefär en sekund senare</b> innan det räknas</> },
      { text: <>Något som försvinner bekräftas vid <b className="text-ink">nästa varv</b></> },
      { text: <>Första gången en butik ses, en misslyckad eller avbruten förfrågan: <b className="text-ink">aldrig</b> en påfyllning, aldrig ”slutsåld”</>, no: true },
      { text: <>Timmar och datum i varje butiks <b className="text-ink">lokala tid</b>; ”vågor” = samma halvtimme över flera tidszoner</> },
      { text: <>Andra bevakningstjänsters rapporter{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""}: egna märkta rader, <b className="text-ink">aldrig med i en summa</b></> },
      { text: <>Uppdateras ungefär var femte minut; <Link href={x.logHref}>påfyllningsloggen</Link> är live</>, step: true },
    ],
    quote: "Citera gärna siffrorna med en länk till den här sidan; PickupChecker är fristående, inte knutet till Apple, och läser samma tillgänglighet för hämtning som vem som helst kan se på apple.com – bara mycket oftare.",
    alertIn: (x: RestockTimesView) => <>Bevaka iPhone Duo{x.one ? "" : ` ${inLand(x.c)}`}</>,

    // ---- related, FAQ, sources
    related: "De andra frågorna om iPhone Duo",
    sameData: "Besvarade med samma data",
    questions: {
      sellOut: "Hur snabbt tar en påfyllning slut?",
      alerts: "Snabbaste sättet att få notis",
      howToGet: "Så får du faktiskt tag på en",
      whichConfig: "Vilken konfiguration fylls på oftast",
      nearMe: "Butiker med den nära mig, just nu",
      unavailable: "Vad ”inte tillgänglig” betyder",
    },
    otherCountries: ((us: boolean) => (us ? "Samma sida för andra länder" : "Andra länder")) as unknown as Dict["views"]["restockTimes"]["otherCountries"],
    faqTitle: "Frågor",
  },
};

