/**
 * German strings: views — the product × place pages, the restock log, the live map, the iPhone Duo
 * restock-times answer page and the store index. `c: Country` is English data: named here in German
 * (util.land / inLand); place names passed as strings are already German.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesView } from "../en/views";
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
import { SPEED } from "@/lib/plans";
import { distance, list, stamp, weekdays } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import { LANG, cap, dativ, fitDe, ganzIn, inLand, inOrt, land, modelDe, money, n, pct, plural, regionWord, span, taxNote, uhr, zwischen } from "./util";

const apple = (s: Store) => appleStoreLabel(s, LANG);
const words = (items: string[], max = 6) => list(LANG, items, max, (k) => `${n(k)} weitere`);
const hat = (k: number) => (k === 1 ? "hat" : "haben");
const restocks = (k: number) => plural(k, "Restock", "Restocks");
const confirmed = (k: number) => plural(k, "bestätigter Restock", "bestätigte Restocks");
const storesN = (k: number) => plural(k, "Store", "Stores");
const dayN = (k: number) => (k === 1 ? "einem Tag" : `${n(k)} Tagen`);
const wd = (d: number) => weekdays(LANG)[d];
/** "Montag" → "montags". */
const wdAdv = (d: number) => `${wd(d).toLowerCase()}s`;

/* ---------------------------------------------------------------- restock-times helpers */

const rtN = (x: number) => n(x);
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1 %" : pct(Math.round(x * 100)));
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("de-DE", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => stamp(LANG, iso, c.timeZone, true);
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "Bundesstaat" : regionWord(x.c));
const rtRegions = (x: { us: boolean; c: Country }) => (x.us ? "Bundesstaaten" : regionWord(x.c, true));
const where = (c: Country) => inLand(c.cc);

/* ---------------------------------------------------------------- product × place helpers */

const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
/** "iPhone Duo 512GB Nachthimmel" / "Duo 512GB Nachthimmel": the product in German. */
const prodName = (p: Product) => [modelByKey(p.model)!.name, p.storage, p.color ? colorLabel(p.color, LANG) : null].filter(Boolean).join(" ");
const prodShort = (p: Product) => [modelByKey(p.model)!.short, p.storage, p.color ? colorLabel(p.color, LANG) : null].filter(Boolean).join(" ");
/** The place in German: the country, region, city or "Apple …" store. */
function placeN(place: Place): string {
  const cc = ccOf(place);
  if (cc === "us") return place.level === "country" ? "USA" : place.name;
  if (place.level === "country") return land(cc);
  if (place.level === "state") return `${cc === "ch" ? "Kanton " : ""}${regionLabel(cc, place.state!, LANG)}`;
  if (place.level === "city") return cityLabel(cc, place.city!, LANG);
  return apple(place.store!);
}
/** "in München", "bei Apple Rosenstraße", "in Deutschland". */
const atPlace = (place: Place) => (place.level === "store" ? `bei ${placeN(place)}` : place.level === "country" ? inLand(ccOf(place)) : inOrt(placeN(place)));
const withApple = (name: string) => (/^apple\b/i.test(name) ? name : `Apple ${name}`);

function productTitle(product: Product, place: Place, inStock: number): string {
  const name = prodName(product), short = prodShort(product);
  const cc = ccOf(place);
  if (place.level === "country") {
    return fitDe([
      ...(inStock > 0 ? [`${name} vorrätig in ${plural(inStock, "Apple Store", "Apple Stores")} ${inLand(cc)}`] : []),
      `${name}: Abhol-Verfügbarkeit ${inLand(cc)}, live`,
      `${short}: Verfügbarkeit ${inLand(cc)}`,
      `${short}: Verfügbarkeit`,
    ], 60, cc);
  }
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "jetzt vorrätig" : "Verfügbarkeit";
    const city = cityLabel(cc, s.city, LANG);
    const withCity = apple(s).toLowerCase().includes(city.toLowerCase()) ? [] : [`${short} bei ${apple(s)}, ${city}`];
    return fitDe([`${name} bei ${apple(s)}: ${now}`, ...withCity, `${short} bei ${apple(s)}`, `${short} bei ${storeLabel(s, LANG)}`, `${short} · ${storeLabel(s, LANG)}`], 60, cc);
  }
  const k = place.stores.length;
  const w = inOrt(placeN(place));
  return fitDe([`${name} ${w}: ${inStock} von ${n(k)} vorrätig`, `${name} ${w}: Abhol-Verfügbarkeit`, `${short} ${w} vorrätig`, `${short} ${w}`], 60, cc);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = prodName(product);
  const week = `${restocks(stats.week)} diese Woche`;
  const cc = ccOf(place);
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "jetzt vorrätig" : "gerade nicht vorrätig";
    return fitDe([
      `${name} zur Abholung bei ${apple(s)}, ${cityLabel(cc, s.city, LANG)}: ${now}, ${week}. Live-Status, Restock-Zeiten und Alarme.`,
      `${name} bei ${apple(s)}: ${now}, ${week}. Live-Status und Alarme.`,
    ], 155, cc);
  }
  const w = place.level === "country" ? `Apple Stores ${inLand(cc)}` : `Apple Stores ${inOrt(placeN(place))}`;
  const k = place.stores.length;
  return fitDe([
    `${name} zur Abholung: ${inStock} von ${n(k)} ${w} ${hat(inStock)} es jetzt, ${week}. Live je Store, Restock-Zeiten und Alarme.`,
    `${name}: ${inStock} von ${n(k)} ${w} ${hat(inStock)} es jetzt, ${week}. Live je Store und Alarme.`,
  ], 155, cc);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const name = prodName(product);
  const at = atPlace(place);
  const cc = ccOf(place);
  const dist = (miles: number) => distance(LANG, cc, miles);
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `Ist das ${name} ${at} vorrätig?`,
      a: l && l.available.length > 0
        ? `Ja${product.parts.length > 1 ? `: ${words(l.available.map((i) => `${i.storage} ${colorLabel(i.color, LANG)}`), 4)}` : ""}, bei der letzten Prüfung.`
        : `Bei der letzten Prüfung nicht${nearest ? `; der nächste Store mit Bestand ist ${withApple(nearest.name)} in ${nearest.city}, ${dist(nearest.distance)} entfernt` : ""}.`,
    });
  } else {
    out.push({
      q: `Welche Apple Stores ${at} haben das ${name}?`,
      a: inStock.length === 0
        ? `Bei der letzten Prüfung keiner${nearest ? `; am nächsten mit Bestand ist ${withApple(nearest.name)} in ${nearest.city}, ${dist(nearest.distance)} entfernt` : ""}.`
        : `${storesN(inStock.length)} bei der letzten Prüfung: ${words(inStock.map((l) => apple(l.store)), 4)}.`,
    });
  }
  const peak = peakOf(clock, LANG);
  out.push({
    q: `Wie oft ist das ${name} ${at} wieder vorrätig?`,
    a: stats.month === 0 ? `Kein Restock ${at} in den letzten ${stats.days} Tagen.` : `${restocks(stats.month)} in den letzten ${stats.days} Tagen, ${n(stats.week)} davon diese Woche${peak ? `, die meisten gegen ${peak.hour} Ortszeit` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `Wie lange bleibt es ${at} vorrätig?`, a: `Im Median etwa ${fmtDuration(stats.medianMs, LANG)}, bevor es wieder ausverkauft ist.` });
  return out;
}

function priceLabel(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => money(COUNTRIES[cc], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => inLand(c.cc),
    liveMap: "Live-Karte",
    restockLog: "Restock-Protokoll",
    alertMe: "Alarm stellen",
    lastDays: (days: number) => <>Letzte {days} Tage</>,
    since: "2. November 2026",
    sourcesWhere: (k: number, c: Country) => `${k === 1 ? "der Apple Store" : `alle ${n(k)} Apple Stores`} ${where(c)}`,
    checker: (c: Country) => `iPhone-Verfügbarkeit ${where(c)}`,
    appleStoresIn: (c: Country) => `Apple Stores ${where(c)}`,
    storesWithIt: "Stores mit Bestand",
    more: "Mehr",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `bei ${name}` : inOrt(name)),
    h1Country: (model: string, c: Country) => `${modelDe(model)}: Abhol-Verfügbarkeit ${where(c)}`,
    h1Place: (model: string, w: string) => `${modelDe(model)} ${w}`,
    inStockNow: "Jetzt vorrätig",
    yes: "Ja",
    no: "Nein",
    pickup: "Abholung",
    configurations: "Konfigurationen",
    ofStores: (k: number) => `von ${storesN(k)}`,
    restocks24h: "Restocks 24 Std.",
    restocksHint: (week: number, month: number, days: number) => `${n(week)} in 7 Tg. · ${n(month)} in ${days} Tg.`,
    sellOuts: (days: number) => `Ausverkäufe ${days} Tg.`,
    stays: (ms: number) => `bleibt ~${fmtDuration(ms, LANG)}`,
    noPairs: "noch keine Paare",
    lastRestock: "Letzter Restock",
    noneYet: "noch keiner",
    thisConfig: "diese Konfiguration",
    inDays: (days: number) => `in ${days} Tagen`,
    notInStockNow: "Gerade nicht vorrätig",
    configsInStock: (k: number, of: number) => <span><b className="text-ink">{n(k)}</b> von {n(of)} Konfigurationen vorrätig</span>,
    inStockAt: (k: number, of: number) => <span>Vorrätig in <b className="text-ink">{n(k)}</b> von {storesN(of)}</span>,
    checked: (live: ReactNode, price: string, tax: string) => <>Geprüft {live} · {price}{tax}</>,
    taxNote: (c: Country) => taxNote(c),
    beforeTax: "vor Steuern",
    buyOnApple: "Auf apple.com kaufen",
    allStoresIn: (c: Country) => `Alle Stores ${where(c)}`,
    everyIphoneHere: "Alle iPhones hier",
    everyIphone: (w: string) => `Alle iPhones ${w}`,
    panel: (model: string, w: string | null) => `Für das ${modelDe(model)}${w ? ` ${w}` : ""}: Konfigurationen und Stores ankreuzen`,
    unitConfigs: "Konfigurationen",
    unitStores: "Stores",
    otherConfigsHere: "Weitere Konfigurationen hier",
    byStorageColor: "Nach Speicher und Farbe",
    nearestStores: "Nächste Stores",
    closest: (link: ReactNode, dist: string) => <>Am nächsten mit Bestand: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Zuletzt vorrätig",
    storesWithItNow: "Stores mit Bestand jetzt",
    storesIn: (w: string) => `Stores ${w}`,
    colStatus: "Status",
    colConfigs: "Konfig. vorrätig",
    noStoreHasIt: "Gerade hat es kein Store.",
    noStoreHereHasIt: "Gerade hat es hier kein Store.",
    moreStores: (k: number) => <>+{n(k)} weitere Stores – nach Region ansehen.</>,
    byRegion: (c: Country) => `Nach ${regionWord(c)}`,
    byCity: "Nach Stadt",
    nearbyStores: "Stores in der Nähe",
    latestChanges: "Neueste Änderungen",
    nothingLogged: "Noch nichts erfasst.",
    whenRestocks: "Wann es wiederkommt",
    howFast: "Wie schnell es ausverkauft ist",
    restocksByConfig: "Restocks nach Konfiguration",
    faqTitleCountry: (model: string, c: Country) => `${modelDe(model)} ${where(c)}: häufige Fragen`,
    faqTitle: (model: string, w: string) => `${modelDe(model)} ${w}`,
    buySource: (model: string, c: Country) => `Apple: ${modelDe(model)} kaufen (${land(c.cc)})`,
    nearby: "In der Nähe",
    otherRegions: (c: Country) => `Weitere ${regionWord(c, true)}`,
    elsewhereIn: (region: string) => `Weitere ${inOrt(region)}`,
    everyAppleStoreIn: (c: Country) => `Alle Apple Stores ${where(c)}`,
    across: (model: string, c: Country) => `${modelDe(model)} ${ganzIn(c.cc)}`,
    itemList: (model: string, w: string) => `${modelDe(model)} ${w}`,
    nearLead: (c: Country, model: string, inStock: number, k: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `Kein Apple Store ${where(c)} hat das ${modelDe(model)} gerade zur Abholung – „in meiner Nähe“ heißt also: Welcher Store füllt zuerst auf? Stellen Sie einen Alarm für die Stores, die Sie erreichen; der Push kommt Sekunden, nachdem einer es anbietet.`
        : `${n(inStock)} von ${storesN(k)} ${hat(inStock)} das ${modelDe(model)} gerade: ${words(have.slice(0, 5).map((l) => `${l.store} in ${l.city} (${plural(l.configs, "Konfiguration", "Konfigurationen")})`), 5)}.`,
    nearHead: (c: Country) => [cap(regionWord(c)), "Stores mit Bestand jetzt"],
    nearCaption: (c: Country, model: string) => `${modelDe(model)}: Abhol-Verfügbarkeit nach ${regionWord(c)}, Stand letzte Prüfung`,
    nearMe: (_c: Country, model: string, alert: string) => `Um jeden Store nach Ihrem Standort zu sortieren, öffnen Sie die Alarm-Einrichtung auf dieser Seite und tippen auf „In der Nähe“: Entfernungen per Straße in Kilometern, geschätzt, und jeder Store verlinkt die Route. [Alarm für das ${modelDe(model)} einrichten](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => ({
      price: { q: `Was kostet das ${modelDe(model)} ${where(c)}?`, a: `Auf apple.com ${money(c, low)} bis ${money(c, high)} (${taxNote(c)}), je nach Speicher.` },
      reserve: { q: `Kann ich das ${modelDe(model)} ${where(c)} zur Abholung reservieren?`, a: `Nein. Sobald ein Store eine Konfiguration anbietet, kaufen Sie sie auf apple.com mit Abholung im Store; sie wird dann für Ihr Zeitfenster zurückgelegt.${inStock === 0 ? " Gerade bietet sie kein Store an – mit einem Alarm sind Sie zuerst dran." : ""}` },
    }),
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c: Country, k: number) => `iPhone-Restock-Protokoll ${where(c)} – ${k === 1 ? "der Apple Store" : `alle ${n(k)} Apple Stores`}, live`,
    metaDescription: (c: Country, k: number) => `Jeder Restock von iPhone Duo, 18 Pro und Pro Max zur Abholung ${k === 1 ? "im Apple Store" : "in den Apple Stores"} ${where(c)} – mit genauer Uhrzeit, Konfiguration und Karte.`,
    h1: (c: Country) => `Restock-Protokoll ${where(c)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{restocks(day)} in 24 Stunden · {n(week)} diese Woche{model ? ` · ${modelDe(model)}` : ""}{region ? ` · ${region}` : ""}. Zeiten in Ihrer Zeitzone.</>,
    allModels: "Alle Modelle",
    restocks: "Restocks",
    withSoldOut: "Restocks + ausverkauft",
    regionLabel: (c: Country) => cap(regionWord(c)),
    allRegions: (c: Country) => `Alle ${regionWord(c, true)}`,
    filter: "Filtern",
    page: (k: number) => <>Seite {k}</>,
    newer: "← Neuer",
    older: "Älter →",
    getAlerts: "Alarme einrichten",
    byPlace: "Restocks nach Ort",
    byRegion: (c: Country) => `Nach ${regionWord(c)}`,
    datasetName: (c: Country) => `Restock-Protokoll für iPhones zur Abholung in Apple Stores ${where(c)}`,
    datasetDescription: (c: Country) => `Jeder bestätigte Restock und Ausverkauf von iPhone Duo, iPhone 18 Pro und iPhone 18 Pro Max zur Abholung ${c.cc === "us" ? "in allen 269 Apple Stores in den USA" : `in den Apple Stores ${where(c)}`}, mit Store, genauer Konfiguration und Uhrzeit. Ein Restock wird erst nach zwei übereinstimmenden Antworten von apple.com erfasst, geprüft alle 15 Sekunden (Stores mit Alarm alle 5).`,
    datasetMeasured: ["Apple Store", "iPhone-Modell, Speicher und Farbe", "Zeitpunkt des Restocks", "Zeitpunkt des Ausverkaufs"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c: Country, k: number) => `iPhone-Duo-Verfügbarkeit auf der Karte – ${k === 1 ? "der Apple Store" : "jeder Apple Store"} ${where(c)}, live`,
    metaDescription: (c: Country, k: number) => `Live-Karte ${k === 1 ? "des Apple Store" : `aller ${n(k)} Apple Stores`} ${where(c)}: Abhol-Verfügbarkeit von iPhone Duo, 18 Pro und Pro Max jetzt gerade, nach Speicher und Farbe.`,
    // The map looks up its region words by the English key (cdict map.nouns), so the keys stay English.
    country: (c: Country) => ({ name: land(c.cc), inName: where(c), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Jeder Store",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` nach ${regionWord(c)} und Stadt` : cities > 1 ? " nach Stadt" : "";
      return `Alle ${n(k)} Apple Stores ${where(c)}${by}, mit Live-Verfügbarkeit von iPhone Duo, 18 Pro und Pro Max zur Abholung: ${duo} ${hat(duo)} das Duo jetzt, ${max} das Pro Max.`;
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) => `${n(k)}, ${spread}${top.length ? `. ${top[0].name} hat die meisten (${top[0].count})${top[1] ? `, dann ${top[1].name} (${top[1].count})` : ""}` : ""}.`,
    howMany: (c: Country) => <>Wie viele Apple Stores gibt es {where(c)}?</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: `Welche Apple Stores ${where(c)} haben das iPhone Duo gerade?`,
      a: have.length === 0 ? `Bei der letzten Prüfung keiner der ${n(k)}. Diese Seite und die Karte aktualisieren sich, sobald einer es anbietet – ein Alarm sagt es Ihnen zuerst.` : `${have.length} von ${n(k)} bei der letzten Prüfung: ${words(have.map(apple), 6)}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, LANG),
    duoBlock: (alert: string) => `Am schnellsten kommen Sie per Alarm an eins – in den Stores, die Sie erreichen: [iPhone-Duo-Alarm einrichten](${alert}). Jeder Store × jede exakte Konfiguration ist ein Alarm, und der Push kommt Sekunden, nachdem ein Store sie anbietet.`,
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `Es gibt **${k === 1 ? "einen Apple Store" : `${n(k)} Apple Stores`}** ${where(c)}, ${spread}. Gerade ${hat(now.duo)} **${now.duo}** davon ein iPhone Duo zur Abholung, **${now.max}** das iPhone 18 Pro Max und **${now.pro}** das 18 Pro. ${tax}`,
    crumb: "Apple Stores",
    panel: (c: Country) => `iPhones wählen und die Stores ${where(c)} ankreuzen, die Sie erreichen`,
    matrixLabel: "Verfügbarkeit nach Store",
    matrixH2: (c: Country) => <>Verfügbarkeit in jedem Apple Store {where(c)}</>,
    matrixHint: "Jetzt vorrätig / erfasst, je Modell.",
    topCaption: (c: Country) => <>{cap(regionWord(c, true))} mit den meisten Apple Stores (Apples Store-Liste, wie hier erfasst)</>,
    regionHead: (c: Country) => cap(regionWord(c)),
    colStores: "Apple Stores",
    colCities: "Städte",
    locationsBy: (c: Country) => `Apple-Store-Standorte nach ${regionWord(c)}`,
    locationsIn: (c: Country) => `Apple-Store-Standorte ${where(c)}`,
    storeCount: (k: number) => <>{storesN(k)}</>,
    storeCountAll: (k: number) => <>{n(k)} Stores</>,
    whenRestock: (c: Country) => <>Wann sind die Stores {where(c)} wieder vorrätig?</>,
    howFast: (c: Country) => <>Wie schnell sind Restocks {where(c)} ausverkauft?</>,
    faqTitle: (c: Country) => `Apple Stores ${where(c)}: häufige Fragen`,
    getApp: "App holen",
    howItWorks: "So funktioniert’s",
    pricing: "Preise",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: rtN,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Pick<Store, "storeNumber" | "country" | "timeZone" | "state">) => localStamp(iso, store, LANG),
      hour: (h: number) => uhr(h),
      range: span,
      weekday: wd,
      store: apple,
      storeWithPlace: (s: Store) => `${apple(s)} (${cityLabel(s.country ?? "us", s.city, LANG)})`,
    },
    title: (c: Country) => `Wann ist das iPhone Duo ${where(c)} wieder verfügbar?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const region = c.cc === "us" ? "Bundesstaat" : c.regionNoun ? regionWord(c) : "Store";
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitDe([
          `${rtN(t.n)} iPhone-Duo-Restocks in Apple Stores ${where(c)} seit ${since}: ${rtPct(w.share)} ${zwischen(w.from, w.to)} Ortszeit${t.sellout ? `, ${rtPct(t.sellout.within2min)} binnen 2 Minuten weg` : ""}. Tabellen nach Stunde, Tag, ${region}, Store und Konfiguration.`,
          `${rtN(t.n)} iPhone-Duo-Restocks in Apple Stores ${where(c)} seit ${since}: ${rtPct(w.share)} ${zwischen(w.from, w.to)} Ortszeit. Nach Stunde, Tag, ${region} und Konfiguration.`,
          `Wann das iPhone Duo ${where(c)} wieder verfügbar ist: ${rtN(t.n)} Restocks seit ${since}, nach Stunde, Tag, ${region} und Konfiguration.`,
        ], 158, c.cc)
        : t.n > 0
          ? fitDe([
            `${rtN(t.n)} bestätigte iPhone-Duo-Restocks in Apple Stores ${where(c)} seit ${since}, aus Prüfungen alle ${SPEED.checkSec} Sekunden: nach Ortszeit, Tag, ${region}, Store und Konfiguration – und wie lange jeder hielt.`,
            `Wann das iPhone Duo ${where(c)} wieder verfügbar ist: ${rtN(t.n)} bestätigte Restocks seit ${since}, nach Stunde, Tag, ${region} und Konfiguration.`,
          ], 158, c.cc)
          : `Wann die Apple Stores ${where(c)} das iPhone Duo wieder vorrätig haben – aus PickupCheckers eigenen Prüfungen alle ${SPEED.checkSec} Sekunden seit dem ${longDate(t.since)}: Stunde für Stunde, Tag für Tag, je Store und Konfiguration.`;
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `Wann ist das iPhone Duo ${where(x.c)} wieder verfügbar?`
      : x.t.n > 0
        ? `Kommt beim iPhone Duo ${where(x.c)} noch Nachschub? Ja – hier steht, wann, Stunde für Stunde`
        : `Kommt beim iPhone Duo ${where(x.c)} Nachschub? Laut unseren Prüfungen noch nicht – das beobachten wir`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const wh = where(x.c);
      return t.unknown ? (
        <>Unser Restock-Protokoll ließ sich gerade nicht lesen; die Stores {wh} werden weiter alle {SPEED.checkSec} Sekunden geprüft, und beim nächsten Laden sind die Zahlen wieder da.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Ja.</b> {one ? "Der Apple Store" : "Die Apple Stores"} {wh} {one ? "hatte" : "hatten"} das iPhone Duo <b className="text-ink">seit dem {longDate(t.since)} {t.n === 1 ? "einmal" : `${rtN(t.n)}-mal`}</b> wieder vorrätig{tracked > 1 ? <>, an {t.days} von {tracked} Tagen</> : <> (bisher ein Tag Erfassung)</>}
          {pattern && <>, <b className="text-ink">{rtPct(w.share)} davon {zwischen(w.from, w.to)}</b> Ortszeit des Stores</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Noch nicht, laut unseren Prüfungen.</b> Seit dem {longDate(t.since)} fragt PickupChecker {one ? "den Apple Store" : `alle ${n(x.stores)} Apple Stores`} {wh} alle {SPEED.checkSec} Sekunden ab und hat noch keinen iPhone-Duo-Restock zur Abholung bestätigt.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `bestätigte Restocks seit ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${zwischen(x.w.from, x.w.to)}, Ortszeit des Stores`,
      days: "Tage mit mindestens einem Restock",
      now: (one: boolean) => (one ? "Store mit iPhone Duo zur Abholung, jetzt" : "Stores mit iPhone Duo zur Abholung, jetzt"),
      today: (x: RestockTimesView, today: DayRow) => `heute (${dateLabel(today.date)})${x.one ? "" : `, in ${storesN(today.stores)}`}, bisher`,
      weekday: "stärkster Wochentag bisher",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>Zuletzt: <b className="text-ink">{latest.config}</b>{x.one ? null : <> bei <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}, {localStamp(latest.at, latest.store, LANG)} Ortszeit</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Am häufigsten <b className="text-ink">{wdAdv(x.t.peakWeekday)}</b></> }] : []),
      { text: <>Apple veröffentlicht <b className="text-ink">keinen Restock-Plan</b>; das sind unsere eigenen bestätigten Prüfungen, etwa alle fünf Minuten aktualisiert</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>Gerade {hat(x.duoNow)} <b className="text-ink">{x.duoNow} von {x.stores}</b> eins zur Abholung</> },
      { text: <>Die Tabellen unten füllen sich ab dem ersten bestätigten Restock</>, step: true },
      { text: <>Muster nach Stunde und Wochentag, wo wir die meisten Daten haben: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">die US-Seite</Link></>, step: true },
    ],
    setUpAlert: "iPhone-Duo-Alarm einrichten",
    logLive: "Das Restock-Protokoll, live",
    onThisPage: "Auf dieser Seite",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Uhrzeit",
      "day-by-day": "Tag für Tag",
      where: `Nach ${rtRegion(x)}`,
      configuration: "Konfiguration",
      "how-long": "Wie lange",
      unavailable: "Warum „nicht verfügbar“",
      reddit: "Reddit vs. Daten",
      method: "So zählen wir",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `Zu welcher Uhrzeit ist das iPhone Duo ${where(x.c)} wieder verfügbar?`,
      "day-by-day": `An welchen Tagen hatte Apple das iPhone Duo ${where(x.c)} wieder vorrätig?`,
      where: `Welche Apple Stores ${where(x.c)} haben das iPhone Duo am häufigsten wieder?`,
      configuration: `Welche iPhone-Duo-Konfiguration ist ${where(x.c)} am häufigsten wieder da?`,
      "how-long": `Wie lange bleibt ein iPhone-Duo-Restock ${where(x.c)} verfügbar?`,
      unavailable: "Warum steht bei jedem Apple Store „derzeit nicht verfügbar“?",
      reddit: "Was Reddit über iPhone-Duo-Restocks sagt – und was die Daten sagen",
      method: "Wie zählt PickupChecker einen Restock?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const wh = where(x.c);
      const window = zwischen(w.from, w.to);
      return [
        { q: `Wann ist das iPhone Duo ${wh} wieder verfügbar?`, a: t.n > 0 && pattern
          ? `Meist vormittags: ${rtPct(w.share)} der ${rtN(t.n)} bestätigten Restocks seit dem ${longDate(t.since)} kamen ${window} Ortszeit des Stores, ${rtPct(hourShare(t.byHour, 8, 12))} zwischen 8 und 12 Uhr. Apple veröffentlicht keinen Plan; das ist das von PickupChecker beobachtete Muster, etwa alle fünf Minuten aktualisiert.`
          : `Apple veröffentlicht keinen Plan, und PickupChecker hat ${wh} seit dem ${longDate(t.since)} ${confirmed(t.n)}${t.days ? ` an ${dayN(t.days)}` : ""} erfasst. Eine typische Uhrzeit nennen wir ab ${PATTERN_MIN} Restocks an ${PATTERN_MIN_DAYS} verschiedenen Tagen – diese Seite füllt sich von selbst.` },
        { q: `Gibt es das iPhone Duo${us ? "" : ` ${wh}`} auch am Wochenende wieder?`, a: t.n > 0
          ? `${weekend > 0 ? "Bisher ja" : "In unseren Daten noch nicht"}: ${restocks(weekend)} von ${rtN(t.n)} fielen auf einen Samstag oder Sonntag (${rtPct(weekend / t.n)}). ${t.peakWeekday != null ? `Der ${wd(t.peakWeekday)} war bisher der stärkste Wochentag.` : `Den stärksten Wochentag nennen wir erst, wenn die Daten ${WEEKDAY_MIN_SPAN} Tage umfassen; unsere umfassen ${tracked}.`}`
          : `Noch keine Wochenend-Daten ${wh}; die Tag-für-Tag-Tabelle auf dieser Seite füllt sich mit jedem bestätigten Restock.` },
        { q: "Ab wann sollte ich nachsehen?", a: t.n > 0 && pattern
          ? `Wer von Hand prüft, sollte ab ${uhr(w.from)} Ortszeit auf apple.com sein, Abholung schon gewählt; dieses Zwei-Stunden-Fenster brachte ${rtPct(w.share)} der Restocks. Ein typischer Restock ${sell ? `war im Median nach ${sell.medianSec} Sekunden weg` : "hält etwa eine Minute"} – ein Alarm, der alle ${SPEED.fastSec} Sekunden prüft ([so funktionieren Alarme](/iphone-duo-stock-alerts)), schafft, was kein Neuladen schafft.`
          : `Solange ${wh} kein Muster erkennbar ist, lassen Sie einen Alarm aufpassen: Ihre gewählten Stores werden rund um die Uhr alle ${SPEED.fastSec} Sekunden geprüft ([so funktionieren Alarme](/iphone-duo-stock-alerts)).` },
        { q: "Warum ist das iPhone Duo in allen Apple Stores „nicht verfügbar“?", a: sell
          ? `Weil ein Restock kurz ist: ${rtPct(sell.within2min)} der ${rtN(sell.n)} gemessenen ausverkauften Restocks ${wh} waren binnen 2 Minuten weg, ${rtPct(sell.within20min)} binnen 20. Gerade ${hat(x.duoNow)} ${x.duoNow} von ${x.stores} Stores eins; fast zu jedem anderen Zeitpunkt zeigt apple.com ehrlich „nicht verfügbar“ – selbst an einem Tag mit Dutzenden Restocks ([was „nicht verfügbar“ bedeutet](/apple-store-pickup-availability-explained)).`
          : `Weil Abhol-Ware jeweils nur Minuten auftaucht. Gerade ${hat(x.duoNow)} ${x.duoNow} von ${storesN(x.stores)} ${wh} eins ([was „nicht verfügbar“ bedeutet](/apple-store-pickup-availability-explained)).` },
        { q: "Wie werde ich benachrichtigt, wenn mein Apple Store das iPhone Duo wieder hat?", a: `Stellen Sie einen Alarm für den Store und genau Speicher und Farbe: Ab dann wird der Store alle ${SPEED.fastSec} Sekunden geprüft, und Ihr Handy erfährt es etwa ${SPEED.alertSec} Sekunden nach einem bestätigten Restock ([Alarm einrichten](${x.alert}); [so funktioniert’s](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: Lieferung und Abholung (so funktioniert die Verfügbarkeit zur Abholung im Store)",
      newsroom: "Apple Newsroom: Das iPhone Duo kommt in die Apple Stores weltweit (23. Oktober 2026)",
      macRumors: "MacRumors: Apples Abholsystem für das iPhone Duo ist in den USA und Kanada wieder live (24. Oktober 2026)",
      reports: (tracker: string) => `${tracker}: gemeldete iPhone-Duo-Restocks der Launch-Woche (deren Beobachtungen, separat gezeigt, nie mitgezählt)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `iPhone-Duo-Restock-Zeiten in den Apple Stores ${where(x.c)}`,
      description: `Jeder bestätigte Restock des iPhone Duo zur Abholung in den Apple Stores ${where(x.c)} seit ${x.t.since}, mit Store, Konfiguration und Uhrzeit, aus PickupCheckers Prüfungen alle ${SPEED.checkSec} Sekunden; zusammengefasst nach Ortszeit, Tag, ${rtRegion(x)}, Store und Konfiguration.`,
      spatial: `Apple Stores ${where(x.c)}`,
      measured: ["Restock-Zeit (Ortszeit des Stores)", "Apple Store", "iPhone Duo Speicher und Farbe", "Sekunden bis ausverkauft"],
      size: `${restocks(x.t.n)} in ${storesN(x.t.stores)}`,
    }),
    crumb: "iPhone-Duo-Restock-Zeiten",

    // ---- time of day
    timeLead: (x: RestockTimesView) => <b>{rtPct(x.w.share)} der {rtN(x.t.n)} Restocks kamen {zwischen(x.w.from, x.w.to)} Ortszeit des Stores, {rtPct(hourShare(x.t.byHour, 8, 12))} zwischen 8 und 12 Uhr.</b>,
    busiestHour: (k: number) => `stärkste Einzelstunde: ${restocks(k)}`,
    morning: "zwischen 8 und 12 Uhr",
    evening: "nach 17 Uhr: abends ist nicht tot",
    night: "zwischen Mitternacht und 6 Uhr",
    tooFew: (x: RestockTimesView) => <b>Noch zu wenige Tage, um eine Uhrzeit zu nennen: {confirmed(x.t.n)} an {dayN(x.t.days)} seit dem {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>Eine typische Uhrzeit braucht <b className="text-ink">{PATTERN_MIN} Restocks an {PATTERN_MIN_DAYS} verschiedenen Tagen</b></> },
      { text: <>Zehn Restocks in einem Schwung = ein Ereignis, keine Gewohnheit</>, no: true },
      { text: <>Die Seite schreibt sich neu, sobald sich die Tage sammeln</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `iPhone-Duo-Restocks ${where(x.c)} nach Ortszeit des Stores, ${dateLabel(x.t.since, false)} bis heute (${restocks(x.t.n)})`,
    hourHead: ["Uhrzeit (lokal)", "Restocks", "Anteil"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>Die Häufung am Morgen ist <b className="text-ink">nicht die Ladenöffnung</b>{x.us ? ": Die meisten US-Apple-Stores öffnen um 10 Uhr" : ""}</> },
      { text: <>Abhol-Ware wird <b className="text-ink">online</b> freigegeben, bevor die Türen aufgehen</> },
      { text: <>Von Hand: <b className="text-ink">{span(x.w.from, x.w.to)}</b> an einem Werktagmorgen beobachten</>, step: true },
      { text: <>Einen <Link href={x.alert}>Alarm</Link> die <b className="text-ink">anderen 22 Stunden</b> bewachen lassen, in denen niemand neu lädt</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Jede Store-Seite hat ihr eigenes Diagramm in ihrer Zeitzone (<Link href={x.storesHref}>{x.us ? "Apple Stores nach Bundesstaat" : `Stores ${where(x.c)}`}</Link>): Ein Store, der um 8 Uhr nachlegt, während die Region um 9 Uhr kommt, ist Gold wert</>, step: true }],

    // ---- day by day
    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>Bisher ein Tag Erfassung, {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, mit {confirmed(t.n)}{one ? "" : ` in ${storesN(t.stores)}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `An jedem erfassten Tag (${t.days} von ${t.days})` : `An ${t.days} der ${tracked} Tage seit dem ${longDate(t.since)}`} gab es mindestens einen bestätigten Restock{t.peakWeekday != null ? `, und der ${wd(t.peakWeekday)} war bisher der stärkste Wochentag` : ""}.</b>
      ) : (
        <b>Kein bestätigter Restock {where(x.c)} seit dem {longDate(t.since)}.</b>
      );
    },
    daysTracked: "erfasste Tage mit mindestens einem Restock",
    busiestDay: (x: RestockTimesView, day: DayRow) => `stärkster Tag, ${dateLabel(day.date)}${x.one ? "" : `, in ${storesN(day.stores)}`}`,
    busiestDayNone: "stärkster Tag",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `Stores mit Restock in derselben halben Stunde, ${zoneStamp(drop.at, x.c)} (${plural(drop.restocks, "Konfiguration", "Konfigurationen")}): ein landesweiter Schub, von außen gesehen`,
    weekend: (x: RestockTimesView) => `an einem Samstag oder Sonntag (${restocks(x.weekend)})`,
    dayCaption: (x: RestockTimesView) => `iPhone-Duo-Restocks ${where(x.c)}, Tag für Tag${x.t.reports.length ? "; Zeilen mit „gemeldet“ sind veröffentlichte Beobachtungen anderer Tracker aus den Tagen vor unserer eigenen Erfassung, nur für die Zeitleiste gezeigt" : ""}`,
    dayHead: { date: "Datum", restocks: "Restocks", stores: "Stores", busiest: "Stärkste Stunde", source: "Quelle" },
    soFar: " · bisher",
    reportedBy: (names: string[]) => <>gemeldet von {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: Launch-Tag, die ersten Geräte für Online-Bestellungen</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: Abhol-Reservierungen wieder offen{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Zeilen mit <b className="text-ink">gemeldet</b>: Beobachtungen von {x.reportNames.join(" und ")} aus der Launch-Woche, nie mitgezählt</> }
        : { text: <>Unser Protokoll aller Stores {where(x.c)} beginnt am <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Stärkster Wochentag: genannt, sobald die Daten <b className="text-ink">{WEEKDAY_MIN_SPAN} Tage</b> umfassen (unsere: {x.tracked})</>, no: true }] : []),
      { text: <>Achten Sie auf die Spalte <b className="text-ink">Stores</b>: dieselben Restocks über mehr Stores sind ein besserer Tag für Sie</>, step: true },
    ],

    // ---- where
    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {restocks(hit[0].restocks)} in {hit[0].stores} von {storesN(hit[0].storesTotal)} seit {dateLabel(x.t.since, false)}{hit[1] ? <>, dann {hit[1].name} ({rtN(hit[1].restocks)})</> : null}{hit[2] ? <> und {hit[2].name} ({rtN(hit[2].restocks)})</> : null}; {hit.length} von {total} {dativ(rtRegions(x))} hatten mindestens einen Restock{total - hit.length > 0 ? `, ${total - hit.length} noch keinen` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{cap(rtRegions(x))} {where(x.c)}: noch kein bestätigter Restock; die Tabelle füllt sich ab dem ersten.</b>,
    regionCaption: (x: RestockTimesView) => `Bestätigte iPhone-Duo-Restocks nach ${rtRegion(x)} ${where(x.c)}, ${dateLabel(x.t.since, false)} bis heute`,
    regionHead: (x: RestockTimesView) => [cap(rtRegion(x)), "Restocks", "Stores mit Restock", "Letzter Restock (Ortszeit)"],
    ofN: (a: number, b: number) => <>{a} von {b}</>,
    storesCaption: (x: RestockTimesView) => `Die Stores mit den meisten iPhone-Duo-Restocks ${where(x.c)}, ${dateLabel(x.t.since, false)} bis heute`,
    storesHead: ["Store", "Restocks", "Tage", "Meist gegen", "Zuletzt (Ortszeit)"],
    swaps: (x: RestockTimesView) => [
      { no: "Der Store mit den meisten Restocks, egal wo", yes: `Zwei, drei Stores, die Sie in einer Stunde erreichen – ${x.pattern ? `ab ${uhr(x.w.from)}` : "am Morgen"}`, why: "Ein Restock, den Sie nicht erreichen, ist keiner; selbst der aktivste Store zeigt bis auf wenige Minuten am Tag „nicht verfügbar“." },
      { no: "Ein Store und Hoffnung", yes: "Ein Alarm für jeden – dann zu dem fahren, der zuerst meldet", why: "Die Zähltabelle sagt Ihnen nur, welchen Ihrer Stores Sie zuerst ansteuern." },
    ],
    nearMe: "Stores mit Duo in meiner Nähe, jetzt gerade",

    // ---- configuration
    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {rtN(top.restocks)} der {rtN(x.t.n)} Restocks ({rtPct(top.restocks / x.t.n)}){rarest ? `; am seltensten war ${rarest.label} mit ${restocks(rarest.restocks)}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: die Konfiguration mit den meisten Restocks`,
    versus: (a: string, bCount: number, b: string) => `Restocks ${/\d(GB|TB)$/.test(a) ? "mit" : "in"} ${a}, gegenüber ${rtN(bCount)} ${/\d(GB|TB)$/.test(b) ? "mit" : "in"} ${b}`,
    restocksOf: (a: string) => `Restocks ${/\d(GB|TB)$/.test(a) ? "mit" : "in"} ${a}`,
    byStorage: "nach Speicher",
    byColour: "nach Farbe",
    configNone: (x: RestockTimesView) => <b>Noch keine Konfiguration {where(x.c)} mit bestätigtem Restock; die acht Konfigurationen stehen schon da, damit der erste Restock eine Zeile hat.</b>,
    configCaption: (x: RestockTimesView) => `Bestätigte iPhone-Duo-Restocks ${where(x.c)} nach Konfiguration, ${dateLabel(x.t.since, false)} bis heute`,
    configHead: ["Konfiguration", "Restocks", "Anteil", "Letzter Restock (Ortszeit)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>Die Wahl der Konfiguration zählt <b className="text-ink">mehr als die Wahl des Stores</b></> },
      x.storageRatio != null
        ? { text: <>Mit dem häufigsten Speicher leben: etwa <b className="text-ink">{n(x.storageRatio)}×</b> die Chancen der nächsten Größe</> }
        : { text: <>Mit dem häufigsten Speicher leben: Ihre Chancen steigen <b className="text-ink">deutlich</b></> },
      { text: <>Das <b className="text-ink">2TB</b>-Modell: ein Gerät, das man zur Lieferung bestellt und abwartet</>, no: true },
      { text: <>Preise und was gerade vorrätig ist: <Link href="/which-iphone-duo-restocks-most">Welches iPhone Duo kommt am häufigsten wieder?</Link></>, step: true },
    ],

    // ---- how long
    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>Die Hälfte der {rtN(sell.n)} ausverkauften Restocks {where(x.c)} war binnen {sell.medianSec} Sekunden weg; {rtPct(sell.within2min)} binnen 2 Minuten und {rtPct(sell.within20min)} binnen 20.</b>,
    secUnit: "Sek.",
    medianListing: "typische Dauer, gelistet bis weg (Median)",
    within2: "weg binnen 2 Minuten",
    within20: "weg binnen 20 Minuten",
    fastest: "schnellster gemessener Ausverkauf",
    howLongNone: (x: RestockTimesView) => <b>Noch zu wenige ausverkaufte Restocks {where(x.c)} zum Messen; diese Zahlen nennen wir ab zehn, die US-Seite hat das volle Bild.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>Ein Zwei-Minuten-Fenster erwischt ein <b className="text-ink">Alarm</b>, nicht das Neuladen von apple.com</> },
      { text: <>Diese Zahl erklärt alles andere auf dieser Seite</> },
      { text: <>Jeder Restock mit seiner Dauer in Sekunden, nach Konfiguration und {rtRegion(x)}: <Link href="/iphone-duo-sell-out-times">Wie schnell ist ein iPhone-Duo-Restock ausverkauft?</Link></>, step: true },
    ],
    measured: "Jede Zahl ist die Zeit von der Prüfung, die die Konfiguration zuerst gelistet sah, bis zur Prüfung, die sie weg sah – also eine Obergrenze; die echte Dauer ist kürzer.",

    // ---- unavailable
    unavailableLead: (x: RestockTimesView) => <b>Weil ein Restock ein Aufflackern ist, kein Zustand: {x.one ? "ein Store" : `${rtN(x.stores)} Stores`} × {x.configs} Konfigurationen = {rtN(x.pairs)} Kombinationen, die {where(x.c)} vorrätig sein können – und gerade {x.duoNow === 1 ? "hat 1 Store" : `haben ${x.duoNow} Stores`} überhaupt ein iPhone Duo.</b>,
    pairs: "Kombinationen aus Store und Konfiguration, die vorrätig sein können",
    listingNow: "Stores mit iPhone Duo zur Abholung, in diesem Moment",
    goneIn2: "der Restocks binnen zwei Minuten weg",
    last24: "bestätigte Restocks in den letzten 24 Stunden",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Letzte 24 Stunden: <b className="text-ink">{confirmed(x.recent.restocks)}</b> in {storesN(x.recent.stores)} {where(x.c)}</> }
        : today > 0
          ? { text: <>Heute: <b className="text-ink">{confirmed(today)}</b> {where(x.c)}</> }
          : { text: <>Die Tag-für-Tag-Tabelle oben zeigt die Restocks, die es gab</> },
      { text: <>Jeder davon auf apple.com <b className="text-ink">ein, zwei Minuten</b> sichtbar</> },
      { text: <>„Überall nicht verfügbar“ an Tag vier oder vierzehn heißt <b className="text-ink">nicht</b>, dass Apple aufhört</>, no: true },
    ],
    unavailableLinks: { explained: "Was „derzeit nicht zur Abholung verfügbar“ bedeutet", howToGet: "So bekommen Sie ein iPhone Duo" },

    // ---- reddit
    redditLead: (x: RestockTimesView) => <b>Die meisten Faustregeln in <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> und <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> sind ehrlich gemeint, beziehen sich auf einen einzigen Store und sind nach einem Tag veraltet; hier die vier häufigsten Behauptungen gegen {rtN(x.t.n)} bestätigte Restocks {where(x.c)}.</b>,
    redditCaption: "Verbreitete Reddit-Behauptungen zu iPhone-Duo-Restocks, geprüft an PickupCheckers bestätigten Restocks",
    redditHead: ["Die Behauptung", "Was die Daten sagen"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "„Die Stores füllen nachts auf – um 3 Uhr schauen.“", answer: t.n > 0 ? <>{rtPct(hourShare(t.byHour, 0, 6))} der Restocks fielen zwischen Mitternacht und 6 Uhr Ortszeit, {rtPct(w.share)} {zwischen(w.from, w.to)}.</> : "Noch kein Restock erfasst, um es zu prüfen." },
        { claim: "„Apple füllt nur an einem Wochentag auf.“", answer: t.n > 0 ? (t.peakWeekday != null ? <>Der {wd(t.peakWeekday)} ist bisher der stärkste Wochentag ({rtN(t.byWeekday[t.peakWeekday])} von {rtN(t.n)}), aber Restocks gab es an {t.days} von {tracked} Tagen.</> : <>Restocks gab es an {t.days} der {tracked} erfassten Tage{t.days === tracked ? ", ohne einen einzigen leeren Tag" : ""}; einen stärksten Wochentag nennen wir, sobald die Daten {WEEKDAY_MIN_SPAN} Tage umfassen.</>) : "Noch kein Restock erfasst, um es zu prüfen." },
        { claim: "„Ruf im Store an und frag, wann der Lkw kommt.“", answer: "Apple veröffentlicht keinen Restock-Plan; was auf apple.com erscheint, ist online freigegebene Abhol-Ware – der Store sieht sie im selben Moment wie alle anderen." },
        { claim: "„Steht da ‚nicht verfügbar‘, ist es endgültig ausverkauft.“", answer: recent.restocks > 0 ? <>{confirmed(recent.restocks)} in {storesN(recent.stores)} in den letzten 24 Stunden sagen etwas anderes; jeder war binnen Minuten wieder „nicht verfügbar“.</> : t.n > 0 ? <>{confirmed(t.n)} seit {dateLabel(t.since, false)} sagen etwas anderes; jeder war binnen Minuten wieder „nicht verfügbar“.</> : "Noch nichts, woran man es prüfen könnte." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>Gerüchte greifen, wo <b className="text-ink">Daten fehlen</b>; diese Seite sind die Daten, frei lesbar</> },
      { text: <>Wo Reddit recht hat: bei den <b className="text-ink">Checkout-Tipps</b> – angemeldet, Apple Pay bereit (<Link href="/how-to-grab-an-iphone-duo-restock">unsere 20-Sekunden-Version</Link>)</> },
    ],

    // ---- method
    methodLead: <b>Ein Restock zählt, wenn apple.com eine Konfiguration in einem Store zur Abholung anbietet, wo sie vorher nicht gelistet war – bestätigt durch zwei übereinstimmende Prüfungen.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "Den Apple Store" : "Jeden Apple Store"} {where(x.c)} alle <b className="text-ink">{SPEED.checkSec} Sekunden</b>; die Stores mit Alarm alle <b className="text-ink">{SPEED.fastSec}</b></> },
      { text: <>Andere Tracker nennen <b className="text-ink">8 Sekunden bis 15 Minuten</b>; wir vergleichen nur veröffentlichte Zahlen</> },
      { text: <>Ein erstes „verfügbar“ wird <b className="text-ink">etwa eine Sekunde später</b> erneut abgefragt, bevor es zählt</> },
      { text: <>Ein Angebot, das verschwindet, wird in der <b className="text-ink">nächsten Runde</b> bestätigt</> },
      { text: <>Die erste Sichtung eines Stores, eine fehlgeschlagene oder abgelaufene Anfrage: <b className="text-ink">nie</b> ein Restock, nie „ausverkauft“</>, no: true },
      { text: <>Uhrzeiten und Daten in der <b className="text-ink">Ortszeit</b> jedes Stores; „Wellen“ = dieselbe halbe Stunde über Zeitzonen hinweg</> },
      { text: <>Meldungen anderer Tracker{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""}: eigene, markierte Zeilen, <b className="text-ink">nie in einer Summe</b></> },
      { text: <>Etwa alle fünf Minuten aktualisiert; <Link href={x.logHref}>das Restock-Protokoll</Link> selbst ist live</>, step: true },
    ],
    quote: "Sie dürfen diese Zahlen gern mit Link auf diese Seite zitieren. PickupChecker ist unabhängig, nicht mit Apple verbunden und liest dieselbe Abhol-Verfügbarkeit, die jeder auf apple.com sieht – nur viel öfter.",
    alertIn: (x: RestockTimesView) => <>{x.one ? "iPhone-Duo-Alarm einrichten" : `iPhone-Duo-Alarm ${where(x.c)} einrichten`}</>,

    // ---- related, FAQ, sources
    related: "Die anderen iPhone-Duo-Fragen",
    sameData: "Mit denselben Daten beantwortet",
    questions: {
      sellOut: "Wie schnell ist ein Restock ausverkauft?",
      alerts: "Am schnellsten benachrichtigt werden",
      howToGet: "So bekommen Sie wirklich eins",
      whichConfig: "Welche Konfiguration am häufigsten wiederkommt",
      nearMe: "Stores mit Duo in meiner Nähe, jetzt",
      unavailable: "Was „nicht verfügbar“ bedeutet",
    },
    otherCountries: (us: boolean) => (us ? "Dieselbe Seite für andere Länder" : "Andere Länder"),
    faqTitle: "Häufige Fragen",
  },
};
