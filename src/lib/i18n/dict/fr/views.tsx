/**
 * Chaînes françaises : views — pages produit × lieu, journal des retours en stock, carte en direct, page « Quand
 * Apple réapprovisionne-t-il l’iPhone Duo ? » et index des magasins. Mêmes arguments et mêmes formes que l’anglais.
 * Les objets Product / Place / Store / Country arrivent en données anglaises : ils sont nommés ici en français
 * (places.ts) ; les chaînes `name`, `place`, `region`, `city` arrivent déjà en français.
 */
import type { ReactNode } from "react";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace } from "../en/views";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, PlaceLevel, Product } from "@/lib/seo/products";
import type { StoreLine } from "@/lib/seo/productData";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { distance, fitTitleW, hour, list, num, pct, plural, price, stamp, weekdays } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import { IN, NAME, L, NOUN_FORMS, cap, dans, noun } from "./util";
import { taxNote } from "./place";

/* ---------------------------------------------------------------- French names for English data */

const COLORS = ["Night Sky", "Star White", "Black", "Burgundy", "Glacier", "Silver"];
/** "iPhone Duo 512GB Night Sky" → "iPhone Duo 512GB Ciel nocturne". */
const fx = (s: string) => COLORS.reduce((a, c) => a.replace(new RegExp(`\\b${c}\\b`, "g"), colorLabel(c, "fr")), s);
const ccOf = (p: { country?: CountryCode }) => p.country ?? "us";
const apple = (s: Store) => appleStoreLabel(s, L(s.country));
/** A place's French name: "France", "Rhône", "Paris", "Apple Opéra". */
function placeFr(p: Place): string {
  const code = ccOf(p);
  const lg = L(code);
  if (p.level === "country") return NAME[code];
  if (p.level === "state") return regionLabel(code, p.state!, lg);
  if (p.level === "city") return cityLabel(code, p.city!, lg);
  return appleStoreLabel(p.store!, lg);
}
/** "en France", "dans le Rhône", "à Paris", "chez Apple Opéra". */
function atFr(p: Place): string {
  if (p.level === "country") return IN[ccOf(p)];
  return p.level === "store" ? `chez ${placeFr(p)}` : dans(placeFr(p));
}
/** A country's name given in French back to "en France" (else the place's own preposition). */
function inName(name: string): string {
  const code = (Object.keys(NAME) as CountryCode[]).find((k) => NAME[k] === name || countryLabel(k, "fr") === name);
  return code ? IN[code] : dans(name);
}
const prodName = (p: Product) => fx(p.name);
const prodShort = (p: Product) => fx(p.short);
const nStores = (k: number) => plural("fr", k, { one: "# magasin", other: "# magasins" });
const nRestocks = (k: number) => plural("fr", k, { one: "# retour en stock", other: "# retours en stock" });

/* ---------------------------------------------------------------- product × place copy */

function productTitle(product: Product, place: Place, inStock: number): string {
  const code = ccOf(place);
  const name = prodName(product), short = prodShort(product);
  if (place.level === "country") {
    return fitTitleW([
      ...(inStock > 0 ? [`${name} en stock dans ${plural("fr", inStock, { one: "# Apple Store", other: "# Apple Store" })} ${IN[code]}`] : []),
      `${name} : stock en retrait ${IN[code]}, en direct`,
      `${short} : stock en retrait ${IN[code]}`,
      `${short} : stock en retrait`,
    ]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const store = apple(s);
    const now = inStock > 0 ? "en stock maintenant" : "stock en retrait";
    return fitTitleW([`${name} chez ${store} : ${now}`, `${short} chez ${store}, ${cityLabel(code, s.city, L(code))}`, `${short} chez ${store}`, `${short} chez ${storeLabel(s, L(code))}`, `${short} · ${storeLabel(s, L(code))}`]);
  }
  const w = dans(placeFr(place));
  return fitTitleW([`${name} en stock ${w} : ${inStock} sur ${place.stores.length}`, `${name} ${w} : stock en retrait`, `${short} en stock ${w}`, `${short} ${w}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const name = prodName(product);
  const week = `${nRestocks(stats.week)} cette semaine`;
  const code = ccOf(place);
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "en stock maintenant" : "pas en stock en ce moment";
    return fitTitleW([
      `Stock en retrait de l’${name} chez ${apple(s)}, ${cityLabel(code, s.city, L(code))} : ${now}, ${week}. Statut en direct, heures de retour en stock et alertes.`,
      `${name} chez ${apple(s)} : ${now}, ${week}. Statut en direct et alertes.`,
    ], 155);
  }
  const where = place.level === "country" ? `Apple Store ${IN[code]}` : `Apple Store ${dans(placeFr(place))}`;
  return fitTitleW([
    `Stock en retrait de l’${name} : ${inStock} des ${place.stores.length} ${where} l’ont en ce moment, ${week}. En direct par magasin, heures de retour en stock et alertes.`,
    `${name} : ${inStock} des ${place.stores.length} ${where} l’ont en ce moment, ${week}. En direct par magasin et alertes.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const code = ccOf(place);
  const name = prodName(product);
  const at = atFr(place);
  const inStock = lines.filter((l) => l.available.length > 0);
  const near = nearest ? `${/^apple\b/i.test(nearest.name) ? nearest.name : `Apple ${nearest.name}`} à ${nearest.city}, à ${distance("fr", code, nearest.distance)}` : "";
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `L’${name} est-il en stock ${at} ?`,
      a: l && l.available.length > 0
        ? `Oui${product.parts.length > 1 ? ` : ${list("fr", l.available.map((i) => `${i.storage} ${colorLabel(i.color, "fr")}`), 4)}` : ""}, à la dernière vérification.`
        : `Pas à la dernière vérification${near ? ` ; le magasin le plus proche qui l’a est ${near}` : ""}.`,
    });
  } else {
    out.push({
      q: `Quels Apple Store ${at} ont l’${name} ?`,
      a: inStock.length === 0
        ? `Aucun à la dernière vérification${near ? ` ; le plus proche qui l’a est ${near}` : ""}.`
        : `${nStores(inStock.length)} à la dernière vérification : ${list("fr", inStock.map((l) => apple(l.store)), 4, (r) => `${r} autres`)}.`,
    });
  }
  const peak = peakOf(clock, "fr");
  out.push({
    q: `À quelle fréquence l’${name} revient-il en stock ${at} ?`,
    a: stats.month === 0 ? `Aucun retour en stock enregistré ${at} sur les ${stats.days} derniers jours.` : `${nRestocks(stats.month)} sur les ${stats.days} derniers jours, dont ${stats.week} cette semaine${peak ? `, la plupart vers ${peak.hour}, heure locale` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `Combien de temps reste-t-il en stock ${at} ?`, a: `Environ ${fmtDuration(stats.medianMs, "fr")} (médiane) avant d’être de nouveau épuisé.` });
  return out;
}

function priceLabel(product: Product): string {
  const code = ccOf(product);
  const prices = catalogFor(product.model, code).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (v: number) => price(L(code), COUNTRIES[code], v);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- restock-times helpers */

const rtN = (x: number) => num("fr", x);
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1 %" : pct("fr", Math.round(x * 100)));
const dateLabel = (ymd: string, weekday = true) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
const longDate = (ymd: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
const zoneStamp = (iso: string, c: Country) => stamp(L(c.cc), iso, c.timeZone, true);
const hourFr = (h: number) => hour("fr", h, true);
const rangeFr = (from: number, to: number) => `${hourFr(from)}–${hourFr(to % 24)}`;
/** "entre 9 h et 11 h". */
const between = (from: number, to: number) => `entre ${hourFr(from)} et ${hourFr(to % 24)}`;
const WD = weekdays("fr");
const rtRegion = (x: { us: boolean; c: Country }) => (x.us ? "État" : noun(x.c).one);
const rtYet = (x: RestockTimesMeta) => (x.t.n > 0 ? "" : " pour l’instant");
/** Regions whose bare name would read as the city: the canton, not the town. */
const PLACE_IN: Record<string, string> = { Zurich: "dans le canton de Zurich" };
/**
 * A place page's place after "in": "à Paris", "à Toronto" (cities); "en Ontario", "au Québec", "dans les Yvelines",
 * "en Seine-et-Marne" (regions, util.dans); a region without a known preposition: "dans la région de {name}".
 */
function rtPlaceIn(p: RestockTimesPlace): string {
  if (p.kind === "city") return `à ${p.name}`;
  if (PLACE_IN[p.name]) return PLACE_IN[p.name];
  const d = dans(p.name);
  return d !== `à ${p.name}` ? d : `dans la région ${/^[aeiouyàâéèêëîïôûüh]/i.test(p.name) ? "d’" : "de "}${p.name}`;
}
/** "en France" on a country page, the place on a place page. */
const rtWhere = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? rtPlaceIn(x.place) : IN[x.c.cc]);
/** What the "where" section breaks a page down by: the country's regions, a region's cities, a city's stores. */
const STORE_NOUN = { one: "magasin", other: "magasins", f: false };
const rtUnitN = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) =>
  (x.place ? (x.place.kind === "region" ? NOUN_FORMS.city : STORE_NOUN) : x.us ? NOUN_FORMS.state : noun(x.c));
const rtUnit = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => rtUnitN(x).one;
const rtUnits = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => rtUnitN(x).other;
const EN = " (en anglais)";

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c) => IN[c.cc],
    liveMap: "Carte en direct",
    restockLog: "Journal des retours en stock",
    alertMe: "M’alerter",
    lastDays: (days) => <>Les {days} derniers jours</>,
    since: "2 novembre 2026",
    sourcesWhere: (n, c) => (n === 1 ? `l’Apple Store ${IN[c.cc]}` : `les ${num(L(c.cc), n)} Apple Store ${IN[c.cc]}`),
    checker: (c) => `Stock iPhone ${IN[c.cc]}`,
    appleStoresIn: (c) => `Apple Store ${IN[c.cc]}`,
    storesWithIt: "magasins qui l’ont",
    more: "Plus",
  },

  /* ---------------------------------------------------------------- /stock/{product}/{place…} */
  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string, level: PlaceLevel) => (level === "store" ? `chez ${name}` : level === "country" ? inName(name) : dans(name)),
    h1Country: (model, c) => `${fx(model)} : stock en retrait ${IN[c.cc]}`,
    h1Place: (model, where) => `${fx(model)} ${where}`,
    inStockNow: "En stock maintenant",
    yes: "Oui",
    no: "Non",
    pickup: "retrait",
    configurations: "configurations",
    ofStores: (n) => `sur ${nStores(n)}`,
    restocks24h: "Retours en stock 24 h",
    restocksHint: (week, month, days) => `${week} sur 7 j · ${month} sur ${days} j`,
    sellOuts: (days) => `Ruptures ${days} j`,
    stays: (ms) => `reste ~${fmtDuration(ms, "fr")}`,
    noPairs: "pas encore mesuré",
    lastRestock: "Dernier retour en stock",
    noneYet: "aucun pour l’instant",
    thisConfig: "cette configuration",
    inDays: (days) => `sur ${days} jours`,
    notInStockNow: "Pas en stock en ce moment",
    configsInStock: (n, of) => <span><b className="text-ink">{n}</b> {n > 1 ? "configurations" : "configuration"} sur {of} en stock</span>,
    inStockAt: (n, of) => <span>En stock dans <b className="text-ink">{n}</b> {n > 1 ? "magasins" : "magasin"} sur {of}</span>,
    checked: (live, priceText, tax) => <>Vérifié {live} · {priceText}{tax}</>,
    taxNote: (c) => taxNote(c.cc),
    beforeTax: "avant taxes",
    buyOnApple: "Acheter sur apple.com",
    allStoresIn: (c) => `Tous les magasins ${IN[c.cc]}`,
    everyIphoneHere: "Tous les iPhone ici",
    everyIphone: (where) => `Tous les iPhone ${where}`,
    panel: (model, where) => `Pour l’${fx(model)}${where ? ` ${where}` : ""} : cochez les configurations et les magasins`,
    unitConfigs: "configurations",
    unitStores: "magasins",
    otherConfigsHere: "Autres configurations ici",
    byStorageColor: "Par capacité et couleur",
    nearestStores: "Magasins les plus proches",
    closest: (link, dist) => <>Le plus proche qui l’a : {link} · {dist}</>,
    storeCity: (store, city) => <>{store}, {city}</>,
    mostRecentlyInStock: "En stock le plus récemment",
    storesWithItNow: "Magasins qui l’ont en ce moment",
    storesIn: (where) => `Magasins ${where}`,
    colStatus: "statut",
    colConfigs: "config. en stock",
    noStoreHasIt: "Aucun magasin ne l’a en ce moment.",
    noStoreHereHasIt: "Aucun magasin d’ici ne l’a en ce moment.",
    moreStores: (n) => <>+{n} autres magasins, à retrouver par région.</>,
    byRegion: (c) => `Par ${noun(c).one}`,
    byCity: "Par ville",
    nearbyStores: "Magasins proches",
    latestChanges: "Derniers changements",
    nothingLogged: "Rien d’enregistré pour l’instant.",
    whenRestocks: "Quand il revient en stock",
    howFast: "En combien de temps il est épuisé",
    restocksByConfig: "Retours en stock par configuration",
    faqTitleCountry: (model, c) => `${fx(model)} ${IN[c.cc]} : questions fréquentes`,
    faqTitle: (model, where) => `${fx(model)} ${where}`,
    buySource: (model, c) => `Apple : acheter l’${fx(model)} (${NAME[c.cc]})`,
    nearby: "À proximité",
    otherRegions: (c) => `Autres ${noun(c).other}`,
    elsewhereIn: (region) => `Ailleurs ${dans(region)}`,
    everyAppleStoreIn: (c) => `Tous les Apple Store ${IN[c.cc]}`,
    across: (model, c) => `${fx(model)} partout ${IN[c.cc]}`,
    itemList: (model, where) => `${fx(model)} ${where}`,
    nearLead: (c, model, inStock, n, have) =>
      inStock === 0
        ? `Aucun Apple Store ${IN[c.cc]} n’affiche l’${fx(model)} en retrait en ce moment : « près de chez moi » revient donc à savoir quel magasin sera réapprovisionné en premier. Créez une alerte sur les magasins où vous pouvez vous rendre ; la notification arrive quelques secondes après que l’un d’eux l’affiche.`
        : `${nStores(inStock)} sur ${n} ${inStock === 1 ? "a" : "ont"} l’${fx(model)} en ce moment : ${list(L(c.cc), have.slice(0, 5).map((l) => `${l.store} à ${l.city} (${plural("fr", l.configs, { one: "# config.", other: "# config." })})`), 5)}.`,
    nearHead: (c) => [cap(noun(c).one), "Magasins qui l’ont"],
    nearCaption: (c, model) => `Stock en retrait de l’${fx(model)} par ${noun(c).one}, à la dernière vérification`,
    nearMe: (c, model, alert) => `Pour classer tous les magasins depuis votre position, ouvrez la création d’alerte sur cette page et touchez Près de moi : les distances sont estimées par la route, en kilomètres, et chaque magasin mène à un itinéraire. [Créer une alerte ${fx(model)}](${alert}).`,
    modelFaq: (c, model, low, high, inStock): { price: FaqItem; reserve: FaqItem } => {
      const money = (v: number) => price(L(c.cc), c, v);
      return {
        price: { q: `Combien coûte l’${fx(model)} ${IN[c.cc]} ?`, a: `De ${money(low)} à ${money(high)} sur apple.com, ${taxNote(c.cc)}, selon la capacité.` },
        reserve: { q: `Peut-on réserver l’${fx(model)} en retrait ${IN[c.cc]} ?`, a: `Non : dès qu’un magasin affiche une configuration, vous l’achetez sur apple.com en choisissant le retrait en magasin, et elle est mise de côté pour votre créneau.${inStock === 0 ? " Aucun magasin ne l’affiche en ce moment : une alerte est le moyen d’être le premier." : ""}` },
      };
    },
  },

  /* ---------------------------------------------------------------- /restocks */
  restocks: {
    metaTitle: (c, n) => `Journal des retours en stock iPhone ${IN[c.cc]} : ${n === 1 ? "l’Apple Store" : `les ${num(L(c.cc), n)} Apple Store`}, en direct`,
    metaDescription: (c, n) => `Chaque retour en stock d’iPhone Duo, 18 Pro et Pro Max ${n === 1 ? "à l’Apple Store" : "dans les Apple Store"} ${IN[c.cc]} pour le retrait en magasin, avec l’heure exacte, la configuration et la carte.`,
    h1: (c) => `Journal des retours en stock ${IN[c.cc]}`,
    summary: (day, week, model, region) => <>{nRestocks(day)} en 24 heures · {num("fr", week)} cette semaine{model ? ` · ${fx(model)}` : ""}{region ? ` · ${region}` : ""}. Heures dans votre fuseau horaire.</>,
    allModels: "Tous les modèles",
    restocks: "Retours en stock",
    withSoldOut: "Retours en stock + ruptures",
    regionLabel: (c) => cap(noun(c).one),
    allRegions: (c) => `${noun(c).f ? "Toutes les" : "Tous les"} ${noun(c).other}`,
    filter: "Filtrer",
    page: (k) => <>page {k}</>,
    newer: "← Plus récents",
    older: "Plus anciens →",
    getAlerts: "Recevoir des alertes",
    byPlace: "Retours en stock par lieu",
    byRegion: (c) => `Par ${noun(c).one}`,
    datasetName: (c) => `Journal des retours en stock iPhone en retrait, Apple Store ${IN[c.cc]}`,
    datasetDescription: (c) => `Chaque retour en stock et chaque rupture confirmés de l’iPhone Duo, de l’iPhone 18 Pro et de l’iPhone 18 Pro Max pour le retrait en magasin ${c.cc === "us" ? "dans les 269 Apple Store des États-Unis" : `dans les Apple Store ${IN[c.cc]}`}, avec le magasin, la configuration exacte et l’heure. Un retour en stock n’est enregistré qu’après deux réponses concordantes d’apple.com, vérifié toutes les 15 secondes (toutes les 5 pour les magasins avec alertes).`,
    datasetMeasured: ["Apple Store", "modèle, capacité et couleur de l’iPhone", "heure du retour en stock", "heure de la rupture"],
  },

  /* ---------------------------------------------------------------- /map */
  map: {
    metaTitle: (c, n) => `Carte du stock iPhone Duo en retrait : ${n === 1 ? "l’Apple Store" : "tous les Apple Store"} ${IN[c.cc]}, en direct`,
    metaDescription: (c, n) => `Carte en direct ${n === 1 ? "de l’Apple Store" : `des ${num(L(c.cc), n)} Apple Store`} ${IN[c.cc]} avec le stock en retrait des iPhone Duo, 18 Pro et Pro Max en ce moment, par capacité et couleur.`,
    // The map keeps the English region keys (its client strings are keyed by them) and names the country itself.
    country: (c) => ({ name: NAME[c.cc], inName: IN[c.cc], regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Tous les magasins",
    storeCity: (store, city) => `${store} · ${city}`,
  },

  /* ---------------------------------------------------------------- /{cc}/stores */
  storesIndex: {
    metaDescription: (c, n, regions, cities, duo, max) => {
      const by = c.regionNoun && regions > 1 ? ` par ${noun(c).one} et par ville` : cities > 1 ? " par ville" : "";
      return `Les ${num(L(c.cc), n)} Apple Store ${IN[c.cc]}${by}, avec le stock en retrait en direct des iPhone Duo, 18 Pro et Pro Max : le Duo dans ${duo} magasin${duo > 1 ? "s" : ""} en ce moment, le Pro Max dans ${max}.`;
    },
    countAnswer: (n, spread, top) => `${n}, ${spread}${top.length ? `. En tête : ${top[0].name} (${top[0].count})${top[1] ? `, puis ${top[1].name} (${top[1].count})` : ""}` : ""}.`,
    howMany: (c) => <>Combien y a-t-il d’Apple Store {IN[c.cc]} ?</>,
    duoNow: (c, n, have): FaqItem => ({
      q: `Quels Apple Store ${IN[c.cc]} ont l’iPhone Duo en ce moment ?`,
      a: have.length === 0 ? `Aucun des ${n} à la dernière vérification. Cette page et la carte se mettent à jour dès qu’un magasin l’affiche, et une alerte vous prévient en premier.` : `${have.length} sur ${n} à la dernière vérification : ${have.slice(0, 6).map((x) => apple(x)).join(", ")}${have.length > 6 ? " et d’autres" : ""}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L(ctx.stores[0]?.country)),
    duoBlock: (alert) => `Le moyen le plus rapide d’en avoir un : une alerte sur les magasins où vous pouvez vous rendre, [créer une alerte iPhone Duo](${alert}). Chaque magasin × configuration exacte = une alerte, et la notification arrive quelques secondes après qu’un magasin l’affiche.`,
    intro: (c, n, spread, now, tax) => `On compte **${plural(L(c.cc), n, { one: "# Apple Store", other: "# Apple Store" })}** ${IN[c.cc]}, ${spread}. En retrait en ce moment : l’iPhone Duo dans **${now.duo}**, l’iPhone 18 Pro Max dans **${now.max}** et le 18 Pro dans **${now.pro}**. ${tax}`,
    crumb: "Apple Store",
    panel: (c) => `Choisissez les iPhone et cochez les magasins ${IN[c.cc]} où vous pouvez vous rendre`,
    matrixLabel: "Stock par magasin",
    matrixH2: (c) => <>Le stock de chaque Apple Store {IN[c.cc]}</>,
    matrixHint: "En stock maintenant / suivies, par modèle.",
    topCaption: (c) => <>{cap(noun(c).other)} qui comptent le plus d’Apple Store (liste officielle des magasins Apple, telle que suivie ici)</>,
    regionHead: (c) => cap(noun(c).one),
    colStores: "Apple Store",
    colCities: "Villes",
    locationsBy: (c) => `Apple Store par ${noun(c).one}`,
    locationsIn: (c) => `Apple Store ${IN[c.cc]}`,
    storeCount: (n) => <>{nStores(n)}</>,
    storeCountAll: (n) => <>{nStores(n)}</>,
    whenRestock: (c) => <>Quand les magasins {IN[c.cc]} sont-ils réapprovisionnés ?</>,
    howFast: (c) => <>En combien de temps un retour en stock est-il épuisé {IN[c.cc]} ?</>,
    faqTitle: (c) => `Apple Store ${IN[c.cc]} : questions fréquentes`,
    getApp: "Installer l’app",
    howItWorks: "Comment ça marche",
    pricing: "Tarifs",
  },

  /* ---------------------------------------------------------------- /iphone-duo-restock-times */
  restockTimes: {
    fmt: {
      n: rtN,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, L(store.country)),
      hour: hourFr,
      range: rangeFr,
      weekday: (d: number) => WD[d],
      store: (s: Store) => apple(s),
      storeWithPlace: (s: Store) => `${apple(s)} (${cityLabel(s.country, s.city, L(s.country))})`,
    },
    title: (c, place) => `Quand Apple réapprovisionne-t-il l’iPhone Duo ${place ? rtPlaceIn(place) : IN[c.cc]} ?`,
    metaDescription: (x) => {
      const { c, t, w, pattern } = x;
      const own = c.cc === "us" ? "État" : c.regionNoun ? noun(c).one : "magasin";
      /** A region page lists its cities; a city page has no unit before "magasin". */
      const region = x.place ? (x.place.kind === "region" ? "ville" : "magasin") : own;
      const by = x.place?.kind === "city" ? "magasin" : `${region}, magasin`;
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `${rtN(t.n)} retours en stock d’iPhone Duo ${rtWhere(x)} depuis le ${since} : ${rtPct(w.share)} ${between(w.from, w.to)} (heure locale)${t.sellout ? `, ${rtPct(t.sellout.within2min)} épuisés en 2 min` : ""}. Par heure, jour, ${region} et configuration.`,
          `${rtN(t.n)} retours en stock d’iPhone Duo ${rtWhere(x)} depuis le ${since} : ${rtPct(w.share)} ${between(w.from, w.to)}, heure locale. Par heure, jour, ${region} et configuration.`,
          `Retours en stock de l’iPhone Duo ${rtWhere(x)} : ${rtN(t.n)} depuis le ${since}, par heure, jour, ${region} et configuration.`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `${rtN(t.n)} retours en stock d’iPhone Duo confirmés dans les Apple Store ${rtWhere(x)} depuis le ${since}, vérifiés toutes les 15 secondes : par heure locale, jour par jour, par ${by} et configuration.`,
            `Retours en stock de l’iPhone Duo ${rtWhere(x)} : ${rtN(t.n)} confirmés depuis le ${since}, par heure, jour, ${region} et configuration.`,
          ], 158)
          : `Quand Apple réapprovisionne l’iPhone Duo ${rtWhere(x)} : nos vérifications toutes les 15 secondes depuis le ${dateLabel(t.since, false)}, heure par heure et magasin par magasin.`;
    },
    h1: (x) => x.t.unknown
      ? `Quand Apple réapprovisionne-t-il l’iPhone Duo ${rtWhere(x)} ?`
      : x.t.n > 0
        ? `Apple réapprovisionne-t-il encore l’iPhone Duo ${rtWhere(x)} ? Oui, et voici quand, heure par heure`
        : `Apple réapprovisionne-t-il l’iPhone Duo ${rtWhere(x)} ? Pas encore d’après nos vérifications, voici ce que nous surveillons`,
    intro: (x) => {
      const { t, one, tracked, pattern, w } = x;
      const where = rtWhere(x);
      return t.unknown ? (
        <>Notre journal des retours en stock est momentanément illisible ; les magasins {where} sont toujours vérifiés toutes les 15 secondes, et cette page retrouve ses chiffres au prochain chargement.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Oui.</b> {one ? "L’Apple Store" : "Les Apple Store"} {where} {one ? "a été réapprovisionné" : "ont été réapprovisionnés"} en iPhone Duo <b className="text-ink">{rtN(t.n)} fois depuis le {longDate(t.since)}</b>{tracked > 1 ? <>, sur {t.days} des {tracked} jours</> : <> (un seul jour de suivi pour l’instant)</>}
          {pattern && <>, <b className="text-ink">dont {rtPct(w.share)} {between(w.from, w.to)}</b>, heure locale du magasin</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Pas encore, d’après nos vérifications.</b> Depuis le {longDate(t.since)}, PickupChecker interroge {one ? "l’Apple Store" : `les ${x.stores} Apple Store`} {where} toutes les 15 secondes sans avoir confirmé de retour en stock d’iPhone Duo en retrait.
        </>
      );
    },
    hero: {
      restocks: (x) => `retours en stock confirmés depuis le ${dateLabel(x.t.since, false)}`,
      window: (x) => `${between(x.w.from, x.w.to)}, heure locale du magasin`,
      days: "jours avec au moins un retour en stock",
      now: (one) => (one ? "magasin l’affiche en retrait en ce moment" : "magasins l’affichent en retrait en ce moment") as string as "store lists one for pickup right now",
      today: (x, today: DayRow) => `aujourd’hui (${dateLabel(today.date)})${x.one ? "" : `, dans ${nStores(today.stores)}`}, pour l’instant`,
      weekday: "jour de la semaine le plus actif pour l’instant",
    },
    heroPoints: (x, latest): Point[] => [
      ...(latest ? [{ text: <>Dernier : <b className="text-ink">{latest.config}</b>{x.one ? null : <> chez <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}, {localStamp(latest.at, latest.store, L(latest.store.country))}, heure locale</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Le plus souvent le <b className="text-ink">{WD[x.t.peakWeekday]}</b></> }] : []),
      { text: <>Apple ne publie <b className="text-ink">aucun calendrier de réapprovisionnement</b> ; ce sont nos propres vérifications confirmées, mises à jour environ toutes les cinq minutes</>, no: true },
    ],
    emptyPoints: (x): Point[] => [
      { text: <>En ce moment, <b className="text-ink">{x.duoNow} {x.duoNow > 1 ? "magasins" : "magasin"} sur {x.stores}</b> en {x.duoNow > 1 ? "affichent" : "affiche"} un en retrait</> },
      { text: <>Les tableaux ci-dessous se remplissent dès le premier retour en stock confirmé</>, step: true },
      { text: <>Les tendances par heure et par jour, là où nous avons le plus de données : <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">la page des États-Unis</Link>{EN}</>, step: true },
    ],
    setUpAlert: "Créer une alerte iPhone Duo",
    logLive: "Le journal des retours en stock, en direct",
    onThisPage: "Sur cette page",
    nav: (x) => ({
      "time-of-day": "Heure de la journée",
      "day-by-day": "Jour par jour",
      where: `Par ${rtUnit(x)}`,
      configuration: "Configuration",
      "how-long": "Durée",
      unavailable: "Pourquoi « indisponible »",
      reddit: "Reddit ou données",
      method: "Notre méthode",
    }),
    h2: (x) => ({
      "time-of-day": `À quelle heure l’iPhone Duo revient-il en stock ${rtWhere(x)} ?`,
      "day-by-day": `Quels jours Apple a-t-il réapprovisionné l’iPhone Duo ${rtWhere(x)} ?`,
      where: `Quels Apple Store ${rtWhere(x)} reçoivent le plus souvent l’iPhone Duo ?`,
      configuration: `Quelle configuration d’iPhone Duo revient le plus souvent en stock ${rtWhere(x)} ?`,
      "how-long": `Combien de temps dure un retour en stock d’iPhone Duo ${rtWhere(x)} ?`,
      unavailable: "Pourquoi tous les Apple Store affichent-ils « actuellement indisponible » ?",
      reddit: "Ce que dit Reddit des retours en stock de l’iPhone Duo, et ce que disent les données",
      method: "Comment PickupChecker compte-t-il un retour en stock ?",
    }),
    faq: (x): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtWhere(x);
      const window = between(w.from, w.to);
      return [
        { q: `Quand Apple réapprovisionne-t-il l’iPhone Duo ${where} ?`, a: t.n > 0 && pattern
          ? `Surtout le matin : ${rtPct(w.share)} des ${rtN(t.n)} retours en stock confirmés depuis le ${longDate(t.since)} sont arrivés ${window}, heure locale du magasin, et ${rtPct(hourShare(t.byHour, 8, 12))} entre 8 h et midi. Apple ne publie aucun calendrier ; c’est la tendance observée par PickupChecker, mise à jour environ toutes les cinq minutes.`
          : `Apple ne publie aucun calendrier, et PickupChecker a enregistré ${plural("fr", t.n, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })} ${where} depuis le ${longDate(t.since)}${t.days ? ` sur ${plural("fr", t.days, { one: "# jour", other: "# jours" })}` : ""}. Une heure habituelle n’est indiquée qu’à partir de ${PATTERN_MIN} retours en stock sur ${PATTERN_MIN_DAYS} jours différents, et cette page se complète d’elle-même.` },
        { q: `Apple réapprovisionne-t-il l’iPhone Duo le week-end${us ? "" : ` ${where}`} ?`, a: t.n > 0
          ? `${weekend > 0 ? `Oui, jusqu’ici : ${nRestocks(weekend)} sur ${rtN(t.n)} ${weekend > 1 ? "sont tombés" : "est tombé"} un samedi ou un dimanche (${rtPct(weekend / t.n)})` : `Pas encore dans nos données : aucun des ${rtN(t.n)} retours en stock n’est tombé un samedi ou un dimanche`}. ${t.peakWeekday != null ? `Le ${WD[t.peakWeekday]} a été le jour le plus actif.` : `Nous n’indiquons le jour le plus actif qu’une fois ${WEEKDAY_MIN_SPAN} jours de données réunis ; les nôtres en couvrent ${tracked}.`}`
          : `Pas encore de données de week-end ${where} ; le tableau jour par jour de cette page se remplit au fil des retours en stock confirmés.` },
        { q: "À quelle heure commencer à surveiller ?", a: t.n > 0 && pattern
          ? `Si vous surveillez à la main, soyez sur apple.com, retrait sélectionné, dès ${hourFr(w.from)}, heure locale ; ce créneau de deux heures a concentré ${rtPct(w.share)} des retours en stock. Un retour en stock typique ${sell ? `est épuisé en ${sell.medianSec} secondes (médiane)` : "dure environ une minute"} : une alerte vérifiée toutes les 5 secondes ([fonctionnement des alertes, en anglais](/iphone-duo-stock-alerts)) fait ce qu’aucune actualisation ne peut faire.`
          : `Tant qu’aucune tendance ne se dégage ${where}, laissez une alerte surveiller pour vous : les magasins choisis sont vérifiés toutes les 5 secondes, jour et nuit ([fonctionnement des alertes, en anglais](/iphone-duo-stock-alerts)).` },
        { q: "Pourquoi tous les Apple Store disent-ils que l’iPhone Duo est indisponible ?", a: sell
          ? `Parce qu’un retour en stock est bref : ${rtPct(sell.within2min)} des ${rtN(sell.n)} retours en stock épuisés que nous avons mesurés ${where} ont disparu en moins de 2 minutes, et ${rtPct(sell.within20min)} en moins de 20. En ce moment, ${x.duoNow} des ${x.stores} magasins en affichent un ; presque tout le reste du temps, la lecture honnête d’apple.com est « indisponible », même un jour à plusieurs dizaines de retours en stock ([ce que signifie « indisponible », en anglais](/apple-store-pickup-availability-explained)).`
          : `Parce que le stock en retrait n’apparaît que quelques minutes à la fois. En ce moment, ${x.duoNow} sur ${nStores(x.stores)} ${where} en ${x.duoNow > 1 ? "affichent" : "affiche"} un ([ce que signifie « indisponible », en anglais](/apple-store-pickup-availability-explained)).` },
        { q: "Comment être prévenu quand mon Apple Store reçoit l’iPhone Duo ?", a: `Créez une alerte pour le magasin, la capacité et la couleur exactes : ce magasin est alors vérifié toutes les 5 secondes, et votre téléphone est prévenu environ 3 secondes après la confirmation d’un retour en stock ([créer une alerte](${x.alert}) ; [comment ça marche, en anglais](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple : Livraison et retrait (comment fonctionne la disponibilité en retrait en magasin, en anglais)",
      newsroom: "Apple Newsroom : l’iPhone Duo arrive dans les Apple Store du monde entier (23 octobre 2026, en anglais)",
      macRumors: "MacRumors : le retrait en Apple Store de l’iPhone Duo rouvre aux États-Unis et au Canada (24 octobre 2026, en anglais)",
      reports: (tracker) => `${tracker} : retours en stock de l’iPhone Duo signalés pendant la semaine de lancement (leurs observations, affichées à part, jamais comptées)`,
    },
    ld: (x) => ({
      datasetName: `Heures de retour en stock de l’iPhone Duo dans les Apple Store ${rtWhere(x)}`,
      description: `Chaque retour en stock confirmé de l’iPhone Duo en retrait en magasin dans les Apple Store ${rtWhere(x)} depuis le ${longDate(x.t.since)}, avec le magasin, la configuration et l’heure, d’après les vérifications de PickupChecker toutes les 15 secondes ; résumé par heure locale, jour, ${x.place?.kind === "city" ? "" : `${rtUnit(x)}, `}magasin et configuration.`,
      spatial: `Apple Store ${rtWhere(x)}`,
      measured: ["heure du retour en stock (heure locale du magasin)", "Apple Store", "capacité et couleur de l’iPhone Duo", "secondes avant épuisement"],
      size: `${nRestocks(x.t.n)} dans ${nStores(x.t.stores)}`,
    }),
    crumb: "Heures de retour en stock de l’iPhone Duo",

    // ---- time of day
    timeLead: (x) => <b>{rtPct(x.w.share)} des {rtN(x.t.n)} retours en stock sont arrivés {between(x.w.from, x.w.to)}, heure locale du magasin, et {rtPct(hourShare(x.t.byHour, 8, 12))} entre 8 h et midi.</b>,
    busiestHour: (count) => `heure la plus active : ${nRestocks(count)}`,
    morning: "entre 8 h et midi",
    evening: "après 17 h : le soir n’est pas mort",
    night: "entre minuit et 6 h",
    tooFew: (x) => <b>Trop peu de jours pour dégager une heure{rtYet(x)} : {plural("fr", x.t.n, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })} sur {plural("fr", x.t.days, { one: "# jour", other: "# jours" })} depuis le {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>Une heure habituelle exige <b className="text-ink">{PATTERN_MIN} retours en stock sur {PATTERN_MIN_DAYS} jours différents</b></> },
      { text: <>Dix retours en stock d’un coup = un événement, pas une habitude</>, no: true },
      { text: <>La page se réécrit d’elle-même au fil des jours</>, step: true },
    ],
    hourCaption: (x) => `Retours en stock d’iPhone Duo ${rtWhere(x)} par heure locale du magasin, du ${dateLabel(x.t.since, false)} à aujourd’hui (${nRestocks(x.t.n)})`,
    hourHead: ["Heure locale", "Retours en stock", "Part"],
    morningKeys: (x): Point[] => [
      { text: <>Le pic du matin <b className="text-ink">n’est pas l’ouverture des portes</b>{x.us ? " : la plupart des Apple Store américains ouvrent à 10 h" : ""}</> },
      { text: <>Le stock en retrait est libéré <b className="text-ink">en ligne</b>, avant que le rideau se lève</> },
      { text: <>À la main : surveillez le créneau <b className="text-ink">{rangeFr(x.w.from, x.w.to)}</b> un matin de semaine</>, step: true },
      { text: <>Laissez une <Link href={x.alert}>alerte</Link> surveiller les <b className="text-ink">22 autres heures</b>, que personne n’actualise</>, step: true },
    ],
    storeChartKeys: (x): Point[] => [{ text: <>Chaque page magasin a son propre graphique, dans son propre fuseau (<Link href={x.storesHref}>{x.us ? "Apple Store par État" : `magasins ${rtWhere(x)}`}</Link>) : un magasin réapprovisionné à 8 h quand sa région l’est vers 9 h, c’est bon à savoir</>, step: true }],

    // ---- day by day
    dayLead: (x) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>Un seul jour de suivi pour l’instant, le {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since)}, avec {plural("fr", t.n, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })}{one ? "" : ` dans ${nStores(t.stores)}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `Chaque jour suivi, ${t.days} sur ${t.days}, a compté` : `${t.days} des ${tracked} jours depuis le ${longDate(t.since)} ${t.days > 1 ? "ont compté" : "a compté"}`} au moins un retour en stock confirmé{t.peakWeekday != null ? `, et le ${WD[t.peakWeekday]} a été le jour le plus actif` : ""}.</b>
      ) : (
        <b>Aucun retour en stock confirmé {rtWhere(x)} depuis le {longDate(t.since)}.</b>
      );
    },
    daysTracked: "jours suivis avec au moins un retour en stock",
    busiestDay: (x, day) => `jour le plus actif, ${dateLabel(day.date)}${x.one ? "" : `, dans ${nStores(day.stores)}`}`,
    busiestDayNone: "jour le plus actif",
    drop: (x, drop) => `magasins réapprovisionnés dans la même demi-heure, ${zoneStamp(drop.at, x.c)} (${plural("fr", drop.restocks, { one: "# configuration", other: "# configurations" })}) : une vague nationale vue de l’extérieur`,
    weekend: (x) => `un samedi ou un dimanche (${nRestocks(x.weekend)})`,
    dayCaption: (x) => `Retours en stock d’iPhone Duo ${rtWhere(x)}, jour par jour${x.t.reports.length ? " ; les lignes « signalé » sont les observations publiées par d’autres sites de suivi pour les jours précédant notre propre suivi, affichées pour la chronologie uniquement" : ""}`,
    dayHead: { date: "Date", restocks: "Retours en stock", stores: "Magasins", busiest: "Heure la plus active", source: "Source" },
    soFar: " · pour l’instant",
    reportedBy: (names) => <>signalé par {names.join(" / ")}</>,
    dayKeys: (x, launch, resumed): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b> : jour du lancement, premières unités pour les commandes en ligne</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b> : réouverture des réservations en retrait{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Lignes marquées <b className="text-ink">signalé</b> : observations de la semaine de lancement publiées par {x.reportNames.join(" et ")}, jamais comptées</> }
        : { text: <>Notre journal de tous les magasins {rtWhere(x)} commence le <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Jour le plus actif : indiqué une fois que les données couvrent <b className="text-ink">{WEEKDAY_MIN_SPAN} jours</b> (les nôtres en couvrent {x.tracked})</>, no: true }] : []),
      { text: <>Regardez la colonne <b className="text-ink">magasins</b> : autant de retours en stock répartis sur plus de magasins, c’est un meilleur jour pour vous</>, step: true },
    ],

    // ---- where
    whereLead: (x, hit, total) => (
      <b>{hit[0].name} : {nRestocks(hit[0].restocks)} dans {hit[0].stores} de ses {nStores(hit[0].storesTotal)} depuis le {dateLabel(x.t.since, false)}{hit[1] ? <>, puis {hit[1].name} ({rtN(hit[1].restocks)})</> : null}{hit[2] ? <> et {hit[2].name} ({rtN(hit[2].restocks)})</> : null} ; {hit.length} des {total} {rtUnits(x)} ont eu au moins un retour en stock{total - hit.length > 0 ? `, ${total - hit.length} aucun pour l’instant` : ""}.</b>
    ),
    whereNone: (x) => <b>{rtUnitN(x).f ? "Aucune" : "Aucun"} {rtUnit(x)} {rtWhere(x)} n’a encore de retour en stock confirmé ; le tableau se remplit dès le premier.</b>,
    regionCaption: (x) => `Retours en stock d’iPhone Duo confirmés par ${rtUnit(x)} ${rtWhere(x)}, du ${dateLabel(x.t.since, false)} à aujourd’hui`,
    regionHead: (x) => [cap(rtUnit(x)), "Retours en stock", "Magasins réapprovisionnés", "Dernier retour en stock (heure locale)"],
    ofN: (a, b) => <>{a} sur {b}</>,
    storesCaption: (x) => `Les magasins qui comptent le plus de retours en stock d’iPhone Duo ${rtWhere(x)}, du ${dateLabel(x.t.since, false)} à aujourd’hui`,
    storesHead: ["Magasin", "Retours en stock", "Jours", "Généralement vers", "Dernier (heure locale)"],
    swaps: (x) => [
      { no: "Le magasin qui compte le plus de retours en stock, où qu’il soit", yes: `Deux ou trois magasins à moins d’une heure de route, à guetter dès ${x.pattern ? hourFr(x.w.from) : "le matin"}`, why: "Un retour en stock hors de portée n’en est pas un ; même le magasin le plus actif affiche « indisponible », sauf quelques minutes par jour." },
      { no: "Un seul magasin, et croiser les doigts", yes: "Une alerte sur chacun, puis filer vers celui qui se déclenche", why: "Le tableau des comptes ne vous dit qu’une chose : vers lequel de vos magasins partir en premier." },
    ],
    nearMe: `Magasins avec le Duo près de chez moi, en ce moment${EN}`,

    // ---- configuration
    configLead: (x, top, rarest) => (
      <b>{top.label} : {rtN(top.restocks)} des {rtN(x.t.n)} retours en stock ({rtPct(top.restocks / x.t.n)}){rarest ? ` ; la plus rare : ${rarest.label}, avec ${nRestocks(rarest.restocks)}` : ""}.</b>
    ),
    mostRestocked: (config) => `${config} : la configuration la plus souvent revenue en stock`,
    versus: (a, bCount, b) => `retours en stock en ${a}, contre ${rtN(bCount)} en ${b}`,
    restocksOf: (a) => `retours en stock en ${a}`,
    byStorage: "par capacité",
    byColour: "par couleur",
    configNone: (x) => <b>Aucune configuration {rtWhere(x)} n’a de retour en stock confirmé{rtYet(x)} ; les huit configurations sont listées pour que le premier retour en stock ait déjà sa ligne.</b>,
    configCaption: (x) => `Retours en stock d’iPhone Duo confirmés ${rtWhere(x)} par configuration, du ${dateLabel(x.t.since, false)} à aujourd’hui`,
    configHead: ["Configuration", "Retours en stock", "Part", "Dernier retour en stock (heure locale)"],
    configKeys: (x): Point[] => [
      { text: <>Le choix de la configuration compte <b className="text-ink">plus que le choix du magasin</b></> },
      x.storageRatio != null
        ? { text: <>Acceptez la capacité la plus réapprovisionnée : environ <b className="text-ink">{num("fr", x.storageRatio)}×</b> les chances de la suivante</> }
        : { text: <>Acceptez la capacité la plus réapprovisionnée : vos chances montent <b className="text-ink">nettement</b></> },
      { text: <>Le <b className="text-ink">2TB</b> : un téléphone à commander en livraison, et à attendre</>, no: true },
      { text: <>Prix et stock en ce moment : <Link href="/which-iphone-duo-restocks-most">Quel iPhone Duo revient le plus en stock ?</Link>{EN}</>, step: true },
    ],

    // ---- how long
    howLongLead: (x, sell: SelloutFacts) => <b>La moitié des {rtN(sell.n)} retours en stock épuisés {rtWhere(x)} ont disparu en moins de {sell.medianSec} secondes ; {rtPct(sell.within2min)} en moins de 2 minutes et {rtPct(sell.within20min)} en moins de 20.</b>,
    secUnit: "s",
    medianListing: "durée typique d’affichage, de l’apparition à l’épuisement (médiane)",
    within2: "épuisés en moins de 2 minutes",
    within20: "épuisés en moins de 20 minutes",
    fastest: "épuisement le plus rapide mesuré",
    howLongNone: (x) => <b>Trop peu de retours en stock épuisés {rtWhere(x)} pour mesurer{rtYet(x)} ; nous donnons ces chiffres à partir de dix, et la page des États-Unis (en anglais) a le tableau complet.</b>,
    howLongKeys: (x): Point[] => [
      { text: <>Une fenêtre de deux minutes se saisit avec une <b className="text-ink">alerte</b>, pas en actualisant apple.com</> },
      { text: <>C’est le chiffre qui explique tout le reste de cette page</> },
      { text: <>Chaque retour en stock avec sa durée en secondes, par configuration et par {rtRegion(x)} : <Link href="/iphone-duo-sell-out-times">En combien de temps un retour en stock d’iPhone Duo est-il épuisé ?</Link>{EN}</>, step: true },
    ],
    measured: "Chaque chiffre va de la vérification qui a vu la configuration apparaître à celle qui l’a vue disparaître : c’est donc un maximum, la durée réelle est plus courte.",

    // ---- unavailable
    unavailableLead: (x) => <b>Parce qu’un retour en stock est un éclair, pas un état : {x.one ? "un magasin" : `${rtN(x.stores)} magasins`} × {x.configs} configurations = {rtN(x.pairs)} combinaisons qui peuvent être en stock {rtWhere(x)}, et en ce moment {x.duoNow} {x.duoNow > 1 ? "magasins affichent" : "magasin affiche"} un iPhone Duo.</b>,
    pairs: "couples magasin × configuration qui peuvent être en stock",
    listingNow: "affichent un iPhone Duo en retrait en ce moment",
    goneIn2: "des retours en stock épuisés en moins de deux minutes",
    last24: "retours en stock confirmés sur les dernières 24 heures",
    unavailableKeys: (x, today): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Dernières 24 heures : <b className="text-ink">{plural("fr", x.recent.restocks, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })}</b> dans {nStores(x.recent.stores)} {rtWhere(x)}</> }
        : today > 0
          ? { text: <>Aujourd’hui : <b className="text-ink">{plural("fr", today, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })}</b> {rtWhere(x)}</> }
          : { text: <>Le tableau jour par jour ci-dessus montre les retours en stock qui ont bien eu lieu</> },
      { text: <>Chacun visible sur apple.com pendant <b className="text-ink">une minute ou deux</b></> },
      { text: <>« Indisponible partout » au quatrième ou au quatorzième jour, ce n’est <b className="text-ink">pas</b> Apple qui arrête</>, no: true },
    ],
    unavailableLinks: { explained: `Ce que signifie « actuellement indisponible pour le retrait »${EN}`, howToGet: `Comment obtenir un iPhone Duo${EN}` },

    // ---- reddit
    redditLead: (x) => <b>L’essentiel des croyances de <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> et <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> est sincère, propre à un seul magasin et périmé en un jour ; voici les quatre affirmations les plus fréquentes, confrontées à {rtN(x.t.n)} retours en stock confirmés {rtWhere(x)}.</b>,
    redditCaption: "Affirmations courantes sur Reddit à propos des retours en stock de l’iPhone Duo, vérifiées sur les retours en stock confirmés par PickupChecker",
    redditHead: ["L’affirmation", "Ce que disent les données"],
    claims: (x): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "« Les magasins sont réapprovisionnés la nuit : vérifiez à 3 h du matin. »", answer: t.n > 0 ? <>{rtPct(hourShare(t.byHour, 0, 6))} des retours en stock sont arrivés entre minuit et 6 h, heure locale ; {rtPct(w.share)} {between(w.from, w.to)}.</> : "Aucun retour en stock enregistré pour la vérifier." },
        { claim: "« Apple ne réapprovisionne qu’un seul jour de la semaine. »", answer: t.n > 0 ? (t.peakWeekday != null ? <>Le {WD[t.peakWeekday]} est le jour le plus actif pour l’instant ({rtN(t.byWeekday[t.peakWeekday])} sur {rtN(t.n)}), mais des retours en stock ont eu lieu {t.days} des {tracked} jours.</> : <>Des retours en stock ont eu lieu {t.days} des {tracked} jours suivis{t.days === tracked ? ", sans un seul jour vide" : ""} ; un jour le plus actif n’est désigné qu’une fois {WEEKDAY_MIN_SPAN} jours de données réunis.</>) : "Aucun retour en stock enregistré pour la vérifier." },
        { claim: "« Appelez le magasin et demandez quand arrive le camion. »", answer: "Apple ne publie aucun calendrier ; ce qui arrive sur apple.com, c’est du stock de retrait libéré en ligne, que le magasin voit au même moment que tout le monde." },
        { claim: "« S’il est indiqué indisponible, c’est épuisé pour de bon. »", answer: recent.restocks > 0 ? <>{plural("fr", recent.restocks, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" })} dans {nStores(recent.stores)} sur les dernières 24 heures disent le contraire ; chacun est redevenu « indisponible » en quelques minutes.</> : t.n > 0 ? <>{rtN(t.n)} retours en stock confirmés depuis le {dateLabel(t.since, false)} disent le contraire ; chacun est redevenu « indisponible » en quelques minutes.</> : "Rien pour la vérifier pour l’instant." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>La rumeur, c’est ce qu’on cherche quand il n’y a <b className="text-ink">pas de données</b> ; cette page, ce sont les données, en accès libre</> },
      { text: <>Là où Reddit a raison : les <b className="text-ink">astuces de paiement</b>, compte connecté, Apple Pay prêt (<Link href="/how-to-grab-an-iphone-duo-restock">notre méthode en 20 secondes</Link>{EN})</> },
    ],

    // ---- method
    methodLead: <b>Un retour en stock est compté quand apple.com affiche une configuration en retrait en magasin dans un magasin où elle n’était pas affichée, confirmé par deux vérifications concordantes.</b>,
    methodKeys: (x): Point[] => [
      { text: <>{x.one ? "L’Apple Store" : "Chaque Apple Store"} {rtWhere(x)} toutes les <b className="text-ink">15 secondes</b> ; les magasins visés par des alertes toutes les <b className="text-ink">5</b></> },
      { text: <>Les autres sites de suivi annoncent <b className="text-ink">de 8 secondes à 15 minutes</b> ; nous ne comparons que des chiffres publiés</> },
      { text: <>Un premier « disponible » est redemandé <b className="text-ink">environ une seconde plus tard</b> avant d’être compté</> },
      { text: <>Une offre qui disparaît est confirmée au <b className="text-ink">tour suivant</b></> },
      { text: <>La première observation d’un magasin, une requête en échec ou expirée : <b className="text-ink">jamais</b> un retour en stock, jamais « en rupture »</>, no: true },
      { text: <>Heures et dates dans l’<b className="text-ink">heure locale</b> de chaque magasin ; « vagues » = la même demi-heure d’un fuseau à l’autre</> },
      { text: <>Signalements d’autres sites de suivi{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""} : leurs propres lignes, étiquetées, <b className="text-ink">jamais dans un total</b></> },
      { text: <>Mis à jour environ toutes les cinq minutes ; <Link href={x.logHref}>le journal des retours en stock</Link> lui-même est en direct</>, step: true },
    ],
    quote: "Vous pouvez citer ces chiffres avec un lien vers cette page ; PickupChecker est indépendant, sans lien avec Apple, et lit la même disponibilité en retrait que tout le monde peut voir sur apple.com, simplement bien plus souvent.",
    alertIn: (x) => <>Créer une alerte iPhone Duo{x.one ? "" : ` ${rtWhere(x)}`}</>,

    // ---- related, FAQ, sources
    related: "Les autres questions sur l’iPhone Duo",
    sameData: `Répondu avec les mêmes données${EN}`,
    questions: {
      sellOut: "En combien de temps un retour en stock est-il épuisé ?",
      alerts: "Le moyen le plus rapide d’être prévenu",
      howToGet: "Comment en obtenir un, vraiment",
      whichConfig: "Quelle configuration revient le plus en stock",
      nearMe: "Les magasins qui l’ont près de chez moi",
      unavailable: "Ce que signifie « indisponible »",
    },
    otherCountries: (us) => (us ? "La même page pour d’autres pays" : "Autres pays") as string as "Other countries",
    place: {
      byCity: "Par ville",
      storesLive: (x) => `Apple Store ${rtWhere(x)}, en direct`,
      countryPage: (c) => `Heures de retour en stock de l’iPhone Duo ${IN[c.cc]}`,
      sourcesWhere: (x) => (x.stores === 1 ? `l’Apple Store ${rtWhere(x)}` : `les ${rtN(x.stores)} Apple Store ${rtWhere(x)}`),
    },
    faqTitle: "Questions",
  },
};
