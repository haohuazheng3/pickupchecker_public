/**
 * Spanish (Spain): views — the product × place pages, the restock log, the live map, the iPhone Duo restock-times
 * page and the store index of /es-es/… Same arguments and shapes as English (dict/en/views.tsx). `Store` / `Place`
 * / `Product` objects are English data and are named here in Spanish (places.ts); hours read "9:00".
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import type { Point } from "@/components/ui/Viz";
import type { Faq } from "@/lib/content/types";
import { catalogFor, stateCodeOf, storePath, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { faq as placeFaq, fmtDuration, peakOf, type FaqContext, type FaqItem } from "@/lib/seo/enrich";
import type { Place, Product } from "@/lib/seo/products";
import type { PlaceStats, RestockStats } from "@/lib/stock/queries";
import type { StoreLine } from "@/lib/seo/productData";
import { hourShare, type DayRow, type SelloutFacts } from "@/lib/content/restockTimes";
import { PATTERN_MIN, PATTERN_MIN_DAYS, WEEKDAY_MIN_SPAN, localStamp } from "@/lib/content/siteFacts";
import { OTHER_TRACKERS, SPEED } from "@/lib/plans";
import { distance, fitTitleW, list, num, price, weekdays } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";
import type { RestockTimesMeta, RestockTimesPlace, RestockTimesView } from "../en/views";
import { L, n, pc, pais, enPais, dePais, noun, NOUNS, cap, taxNote, h, lasH, range, between, tc, fixHour, fixDay, losDias, todoPais, otherTrackers, apples, tiendas, reposiciones, dias, v, aprox } from "./words";

/* ---------------------------------------------------------------- Spanish names of English data */

const apple = (s: Store): string => appleStoreLabel(s, L);
const cityOf = (s: Store): string => cityLabel(s.country ?? "us", s.city, L);
const ccOf = (p: { country?: CountryCode }): CountryCode => p.country ?? "us";
/** "iPhone Duo 256GB Cielo nocturno". */
const pName = (p: Product): string => tc(p.name);
const pShort = (p: Product): string => tc(p.short);
/** A place's name in Spanish. */
function placeEs(place: Place): string {
  const cc = ccOf(place);
  if (place.level === "country") return cc === "us" ? "EE. UU." : pais(cc);
  if (place.level === "state") return regionLabel(cc, place.state!, L);
  if (place.level === "city") return cityLabel(cc, place.city!, L);
  return apple(place.store!);
}
/** "en España" / "en Madrid" / "en Apple Puerta del Sol". */
const enLugar = (place: Place): string => (place.level === "country" ? (ccOf(place) === "us" ? "en EE. UU." : enPais(ccOf(place))) : `en ${placeEs(place)}`);
/** "de España" / "de Madrid". */
const deLugar = (place: Place): string => (place.level === "country" ? (ccOf(place) === "us" ? "de EE. UU." : dePais(ccOf(place))) : `de ${placeEs(place)}`);
const configs = (x: number) => `${n(x)} ${x === 1 ? "configuración" : "configuraciones"}`;
const confirmadas = (x: number) => `${reposiciones(x)} ${x === 1 ? "confirmada" : "confirmadas"}`;
const appleName = (name: string) => (/^apple\b/i.test(name) ? name : `Apple ${name}`);

/* ---------------------------------------------------------------- product × place copy */

function productTitle(product: Product, place: Place, inStock: number): string {
  const cc = ccOf(place);
  if (place.level === "country") {
    const where = cc === "us" ? "EE. UU." : pais(cc);
    return fitTitleW([
      ...(inStock > 0 ? [`${pName(product)} en stock en ${apples(inStock)} ${cc === "us" ? "de EE. UU." : dePais(cc)}`] : []),
      `Stock del ${pName(product)} para recogida en ${where}, en directo`,
      `Stock del ${pShort(product)} para recogida en ${where}`,
      `Stock del ${pShort(product)}`,
    ]);
  }
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "en stock ahora" : "stock para recogida";
    return fitTitleW([`${pName(product)} en ${apple(s)}: ${now}`, `${pShort(product)} en ${apple(s)}, ${cityOf(s)}`, `${pShort(product)} en ${apple(s)}`, `${pShort(product)} en ${storeLabel(s, L)}`, `${pShort(product)} · ${storeLabel(s, L)}`]);
  }
  const w = placeEs(place);
  return fitTitleW([`${pName(product)} en stock en ${w}: ${n(inStock)} de ${n(place.stores.length)}`, `${pName(product)} en ${w}: stock para recogida`, `${pShort(product)} en stock en ${w}`, `${pShort(product)} en ${w}`]);
}

function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const week = `${reposiciones(stats.week)} esta semana`;
  if (place.level === "store") {
    const s = place.store!;
    const locality = ccOf(place) === "us" ? `${s.city} ${stateCodeOf(s)}` : cityOf(s);
    return fitTitleW([
      `Stock para recogida del ${pName(product)} en ${apple(s)}, ${locality}: ${inStock > 0 ? "en stock ahora" : "sin stock ahora mismo"}, ${week}. Estado en directo, horas de reposición y alertas.`,
      `${pName(product)} en ${apple(s)}: ${inStock > 0 ? "en stock ahora" : "sin stock ahora"}, ${week}. Estado en directo y alertas.`,
    ], 155);
  }
  const where = `Apple Store ${deLugar(place)}`;
  const k = place.stores.length;
  return fitTitleW([
    `Stock para recogida del ${pName(product)}: ${n(inStock)} de ${n(k)} ${where} lo ${v(inStock, "tiene", "tienen")} ahora, ${week}. En directo por tienda, horas de reposición y alertas.`,
    `${pName(product)}: ${n(inStock)} de ${n(k)} ${where} lo ${v(inStock, "tiene", "tienen")} ahora, ${week}. En directo por tienda y alertas.`,
  ], 155);
}

function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const at = enLugar(place);
  const cc = ccOf(place);
  const inStock = lines.filter((l) => l.available.length > 0);
  const near = nearest ? `${appleName(nearest.name)} en ${nearest.city}, a ${distance(L, cc, nearest.distance)}` : "";
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `¿Hay stock del ${pName(product)} ${at}?`,
      a: l && l.available.length > 0
        ? `Sí${product.parts.length > 1 ? `: ${list(L, l.available.map((i) => `${i.storage} ${colorLabel(i.color, L)}`), 4, (x) => `${n(x)} más`)}` : ""}, en la última comprobación.`
        : `No en la última comprobación${nearest ? `; la tienda más cercana que lo tiene es ${near}` : ""}.`,
    });
  } else {
    out.push({
      q: `¿Qué Apple Store ${deLugar(place)} tienen el ${pName(product)}?`,
      a: inStock.length === 0
        ? `Ninguno en la última comprobación${nearest ? `; el más cercano que lo tiene es ${near}` : ""}.`
        : `${tiendas(inStock.length)} en la última comprobación: ${list(L, inStock.map((x) => apple(x.store)), 4, (x) => `${n(x)} más`)}.`,
    });
  }
  const peak = peakOf(clock, L);
  out.push({
    q: `¿Cada cuánto se repone el ${pName(product)} ${at}?`,
    a: stats.month === 0
      ? `No se ha registrado ninguna reposición ${at} en los últimos ${n(stats.days)} días.`
      : `${reposiciones(stats.month)} en los últimos ${n(stats.days)} días, ${n(stats.week)} esta semana${peak ? `, la mayoría hacia ${/^1:/.test(peak.hour) ? "la" : "las"} ${peak.hour}, hora local` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `¿Cuánto dura en stock ${at}?`, a: `${cap(aprox(fmtDuration(stats.medianMs, L)))} (mediana) antes de volver a agotarse.` });
  return out;
}

/** "2339 €–3839 €": the price range of the page's configurations. */
function priceLabel(product: Product): string {
  const cc = ccOf(product);
  const prices = catalogFor(product.model, cc).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const f = (x: number) => price(L, COUNTRIES[cc], x);
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

/* ---------------------------------------------------------------- restock-times helpers */

const rtN = (x: number) => num(L, x);
const rtPct = (x: number) => (x > 0 && x < 0.005 ? "<1 %" : pc(Math.round(x * 100)));
const dtf = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", o);
/** "jue, 29 oct" / "29 oct". */
const dateLabel = (ymd: string, weekday = true) => dtf({ timeZone: "UTC", month: "short", day: "numeric", ...(weekday ? { weekday: "short" as const } : {}) }).format(new Date(`${ymd}T12:00:00Z`));
/** "2 de noviembre de 2026". */
const longDate = (ymd: string) => dtf({ timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));
/** "27 oct, 9:30 CET". */
const zoneStamp = (iso: string, c: Country) => dtf({ timeZone: c.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso));
const wd = (d: number) => weekdays(L)[d];
const rn = (x: { us: boolean; c: Country }) => noun(x.c, x.us);
/** "en España" on a country page; "en Madrid", "en Barcelona" on a place page. */
const rtEn = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? `en ${x.place.name}` : enPais(x.c.cc));
/** "de España" / "de Madrid" ("los Apple Store de Madrid"). */
const rtDe = (x: { c: Country; place?: RestockTimesPlace }) => (x.place ? `de ${x.place.name}` : dePais(x.c.cc));
/** What the "where" section breaks a page down by: the country's regions, a region's cities, a city's stores. */
const TIENDA = { one: "tienda", other: "tiendas", f: true };
const rnu = (x: { us: boolean; c: Country; place?: RestockTimesPlace }) => (x.place ? (x.place.kind === "region" ? NOUNS.city : TIENDA) : rn(x));

const OTHER = otherTrackers(OTHER_TRACKERS);

/* ---------------------------------------------------------------- views */

export const views: Dict["views"] = {
  common: {
    inCountry: (c: Country) => enPais(c.cc),
    liveMap: "Mapa en directo",
    restockLog: "Registro de reposiciones",
    alertMe: "Avísame",
    lastDays: (days: number) => <>Últimos {n(days)} días</>,
    since: "2 de noviembre de 2026",
    sourcesWhere: (k: number, c: Country) => (k === 1 ? `el Apple Store ${dePais(c.cc)}` : `los ${apples(k)} ${dePais(c.cc)}`),
    checker: (c: Country) => `Stock de iPhone ${enPais(c.cc)}`,
    appleStoresIn: (c: Country) => `Apple Store ${dePais(c.cc)}`,
    storesWithIt: "tiendas con stock",
    more: "Más",
  },

  product: {
    title: productTitle,
    description: productDescription,
    faq: productFaq,
    priceLabel,
    inPlace: (name: string) => `en ${name}`,
    h1Country: (model: string, c: Country) => `Stock del ${tc(model)} para recogida ${enPais(c.cc)}`,
    h1Place: (model: string, where: string) => `${tc(model)} ${where}`,
    inStockNow: "En stock ahora",
    yes: "Sí",
    no: "No",
    pickup: "recogida",
    configurations: "configuraciones",
    ofStores: (k: number) => `de ${tiendas(k)}`,
    restocks24h: "Reposiciones 24 h",
    restocksHint: (week: number, month: number, days: number) => `${n(week)} en 7 d · ${n(month)} en ${n(days)} d`,
    sellOuts: (days: number) => `Agotamientos ${n(days)} d`,
    stays: (ms: number) => `dura ~${fmtDuration(ms, L)}`,
    noPairs: "aún sin pares",
    lastRestock: "Última reposición",
    noneYet: "aún ninguna",
    thisConfig: "esta configuración",
    inDays: (days: number) => `en ${n(days)} días`,
    notInStockNow: "Sin stock ahora",
    configsInStock: (k: number, of: number) => <span><b className="text-ink">{n(k)}</b> de {n(of)} configuraciones en stock</span>,
    inStockAt: (k: number, of: number) => <span>En stock en <b className="text-ink">{n(k)}</b> de {n(of)} {of === 1 ? "tienda" : "tiendas"}</span>,
    checked: (live: ReactNode, p: string, tax: string) => <>Comprobado {live} · {p}{tax}</>,
    taxNote: (c: Country) => taxNote(c),
    beforeTax: "sin impuestos",
    buyOnApple: "Comprar en apple.com",
    allStoresIn: (c: Country) => `Todas las tiendas ${dePais(c.cc)}`,
    everyIphoneHere: "Todos los iPhone de aquí",
    everyIphone: (where: string) => `Todos los iPhone ${where}`,
    panel: (model: string, where: string | null) => `Para el ${tc(model)}${where ? ` ${where}` : ""}: marca las configuraciones y las tiendas`,
    unitConfigs: "configuraciones",
    unitStores: "tiendas",
    otherConfigsHere: "Otras configuraciones aquí",
    byStorageColor: "Por capacidad y color",
    nearestStores: "Tiendas más cercanas",
    closest: (link: ReactNode, dist: string) => <>La más cercana con stock ahora: {link} · {dist}</>,
    storeCity: (store: string, city: string) => <>{store}, {city}</>,
    mostRecentlyInStock: "Con stock más reciente",
    storesWithItNow: "Tiendas con stock ahora",
    storesIn: (where: string) => `Tiendas ${where}`,
    colStatus: "estado",
    colConfigs: "configuraciones en stock",
    noStoreHasIt: "Ninguna tienda lo tiene ahora mismo.",
    noStoreHereHasIt: "Ninguna tienda de aquí lo tiene ahora mismo.",
    moreStores: (k: number) => <>+{n(k)} tiendas más: míralas por provincia.</>,
    byRegion: (c: Country) => `Por ${noun(c).one}`,
    byCity: "Por ciudad",
    nearbyStores: "Tiendas cercanas",
    latestChanges: "Últimos cambios",
    nothingLogged: "Aún no hay nada registrado.",
    whenRestocks: "Cuándo se repone",
    howFast: "Cuánto tarda en agotarse",
    restocksByConfig: "Reposiciones por configuración",
    faqTitleCountry: (model: string, c: Country) => `${tc(model)} ${enPais(c.cc)}: preguntas frecuentes`,
    faqTitle: (model: string, where: string) => `${tc(model)} ${where}`,
    buySource: (model: string, c: Country) => `Apple: comprar el ${tc(model)} (${pais(c.cc)})`,
    nearby: "Cerca",
    otherRegions: (c: Country) => { const nn = noun(c); return `${nn.f ? "Otras" : "Otros"} ${nn.other}`; },
    elsewhereIn: (region: string) => `En el resto de ${region}`,
    everyAppleStoreIn: (c: Country) => `Todos los Apple Store ${dePais(c.cc)}`,
    across: (model: string, c: Country) => `${tc(model)} en ${c.cc === "us" ? "todo EE. UU." : todoPais(c.cc)}`,
    itemList: (model: string, where: string) => `${tc(model)} ${where}`,
    nearLead: (c: Country, model: string, inStock: number, k: number, have: { store: string; city: string; configs: number }[]) =>
      inStock === 0
        ? `Ningún Apple Store ${dePais(c.cc)} tiene ahora el ${tc(model)} disponible para recogida, así que «cerca de mí» depende de qué tienda reponga primero. Crea una alerta en las tiendas a las que puedas llegar y el aviso te llegará segundos después de que una lo ponga disponible.`
        : `${n(inStock)} de las ${n(k)} tiendas ${v(inStock, "tiene", "tienen")} ahora el ${tc(model)}: ${list(L, have.slice(0, 5).map((l) => `${l.store}, en ${l.city} (${configs(l.configs)})`), 5)}.`,
    nearHead: (c: Country) => [cap(noun(c).one), "Tiendas con stock ahora"],
    nearCaption: (c: Country, model: string) => `Stock del ${tc(model)} para recogida por ${noun(c).one}, en la última comprobación`,
    nearMe: (_c: Country, model: string, alert: string) => `Para ordenar todas las tiendas desde donde estás, abre la configuración de alertas de esta página y toca «Cerca de mí»: las distancias son por carretera, en kilómetros y estimadas, y cada tienda enlaza a cómo llegar. [Crea una alerta del ${tc(model)}](${alert}).`,
    modelFaq: (c: Country, model: string, low: number, high: number, inStock: number): { price: FaqItem; reserve: FaqItem } => ({
      price: { q: `¿Cuánto cuesta el ${tc(model)} ${enPais(c.cc)}?`, a: `De ${price(L, c, low)} a ${price(L, c, high)} en apple.com, ${taxNote(c)}, según la capacidad.` },
      reserve: { q: `¿Puedo reservar el ${tc(model)} para recogerlo ${enPais(c.cc)}?`, a: `No; cuando una tienda pone disponible una configuración, la compras en apple.com eligiendo «Recogida» y te la guardan para tu franja horaria.${inStock === 0 ? " Ahora mismo ninguna tienda lo tiene, así que una alerta es la forma de ser el primero." : ""}` },
    }),
  },

  restocks: {
    metaTitle: (c: Country, k: number) => fitTitleW([`Registro de reposiciones de iPhone ${enPais(c.cc)}: ${k === 1 ? "su Apple Store" : `los ${apples(k)}`}, en directo`, `Reposiciones de iPhone ${enPais(c.cc)}: ${k === 1 ? "su Apple Store" : `los ${apples(k)}`}, en directo`, `Reposiciones de iPhone ${enPais(c.cc)}, en directo`]),
    metaDescription: (c: Country, k: number) => `Cada reposición del iPhone Duo, 18 Pro y Pro Max para recogida en ${k === 1 ? "el Apple Store" : "los Apple Store"} ${dePais(c.cc)}, con la hora exacta, la configuración y el mapa.`,
    h1: (c: Country) => `Registro de reposiciones ${enPais(c.cc)}`,
    summary: (day: number, week: number, model?: string, region?: string) => <>{reposiciones(day)} en 24 horas · {n(week)} esta semana{model ? ` · ${model}` : ""}{region ? ` · ${region}` : ""}. Horas en tu zona horaria.</>,
    allModels: "Todos los modelos",
    restocks: "Reposiciones",
    withSoldOut: "Reposiciones + agotados",
    regionLabel: (c: Country) => cap(noun(c).one),
    allRegions: (c: Country) => { const nn = noun(c); return `${nn.f ? "Todas las" : "Todos los"} ${nn.other}`; },
    filter: "Filtrar",
    page: (k: number) => <>página {n(k)}</>,
    newer: "← Más recientes",
    older: "Más antiguas →",
    getAlerts: "Recibe alertas",
    byPlace: "Reposiciones por lugar",
    byRegion: (c: Country) => `Por ${noun(c).one}`,
    datasetName: (c: Country) => `Registro de reposiciones de iPhone para recogida en los Apple Store ${dePais(c.cc)}`,
    datasetDescription: (c: Country) => `Cada reposición y agotamiento confirmados del iPhone Duo, iPhone 18 Pro y iPhone 18 Pro Max para recogida en tienda en ${c.cc === "us" ? "los 269 Apple Store de EE. UU." : `los Apple Store ${dePais(c.cc)}`}, con tienda, configuración exacta y hora. Una reposición solo se registra tras dos respuestas coincidentes de apple.com, que se comprueba cada 15 segundos (cada 5 en las tiendas con alertas).`,
    datasetMeasured: ["Apple Store", "modelo, capacidad y color del iPhone", "hora de la reposición", "hora del agotamiento"],
  },

  map: {
    metaTitle: (c: Country, k: number) => fitTitleW([`Mapa del stock del iPhone Duo: ${k === 1 ? "el Apple Store" : "todos los Apple Store"} ${dePais(c.cc)}, en directo`, `Mapa del stock del iPhone Duo ${enPais(c.cc)}, en directo`]),
    metaDescription: (c: Country, k: number) => `Mapa en directo ${k === 1 ? "del Apple Store" : `de los ${apples(k)}`} ${dePais(c.cc)} con el stock para recogida del iPhone Duo, 18 Pro y Pro Max ahora mismo, por capacidad y color.`,
    // regionNoun stays the country data's key: the map looks its Spanish words up in cdict map.nouns.
    country: (c: Country) => ({ name: pais(c.cc), inName: enPais(c.cc), regionNoun: c.regionNoun, regionNounPlural: c.regionNounPlural }),
    everyStore: "Todas las tiendas",
    storeCity: (store: string, city: string) => `${store} · ${city}`,
  },

  storesIndex: {
    metaDescription: (c: Country, k: number, regions: number, cities: number, duo: number, max: number) => {
      const by = c.regionNoun && regions > 1 ? ` por ${noun(c).one} y ciudad` : cities > 1 ? " por ciudad" : "";
      return `Los ${apples(k)} ${dePais(c.cc)}${by}, con el stock para recogida del iPhone Duo, 18 Pro y Pro Max en directo: ${n(duo)} ${v(duo, "tiene", "tienen")} ahora el Duo y ${n(max)}, el Pro Max.`;
    },
    countAnswer: (k: number, spread: string, top: { name: string; count: number }[]) => `${n(k)}, ${spread}${top.length ? `. ${top[0].name} encabeza la lista (${n(top[0].count)})${top[1] ? `, por delante de ${top[1].name} (${n(top[1].count)})` : ""}` : ""}.`,
    howMany: (c: Country) => <>¿Cuántos Apple Store hay {enPais(c.cc)}?</>,
    duoNow: (c: Country, k: number, have: Store[]): FaqItem => ({
      q: `¿Qué Apple Store ${dePais(c.cc)} tienen ahora el iPhone Duo?`,
      a: have.length === 0
        ? `Ninguno de los ${n(k)} en la última comprobación. Esta página y el mapa se actualizan en cuanto uno lo pone disponible, y una alerta te avisa antes que a nadie.`
        : `${n(have.length)} de los ${n(k)} en la última comprobación: ${list(L, have.map(apple), 6, (x) => `${n(x)} más`)}.`,
    }),
    faq: (ctx: FaqContext) => placeFaq({ ...ctx, peak: ctx.peak ? { ...ctx.peak, hour: fixHour(ctx.peak.hour), day: ctx.peak.day ? fixDay(ctx.peak.day) : null } : ctx.peak, omit: [...(ctx.omit ?? []), "count", "stock", "lasts"] }, L),
    duoBlock: (alert: string) => `La forma más rápida de conseguir uno es una alerta en las tiendas a las que puedas llegar: [crea una alerta del iPhone Duo](${alert}). Cada tienda × configuración exacta es una alerta, y el aviso llega segundos después de que una tienda lo ponga disponible.`,
    intro: (c: Country, k: number, spread: string, now: { duo: number; max: number; pro: number }, tax: string) => `Hay **${apples(k)}** ${enPais(c.cc)}, ${spread}. Ahora mismo **${n(now.duo)}** ${v(now.duo, "tiene", "tienen")} un iPhone Duo disponible para recogida, **${n(now.max)}** el iPhone 18 Pro Max y **${n(now.pro)}** el 18 Pro. ${tax}`,
    crumb: "Apple Store",
    panel: (c: Country) => `Elige los iPhone y marca las tiendas ${dePais(c.cc)} a las que puedes ir`,
    matrixLabel: "Stock por tienda",
    matrixH2: (c: Country) => <>Stock en todos los Apple Store {dePais(c.cc)}</>,
    matrixHint: "En stock ahora / seguidas, por modelo.",
    topCaption: (c: Country) => <>{cap(noun(c).other)} con más Apple Store (lista oficial de tiendas de Apple, tal como la seguimos)</>,
    regionHead: (c: Country) => cap(noun(c).one),
    colStores: "Apple Store",
    colCities: "Ciudades",
    locationsBy: (c: Country) => `Apple Store por ${noun(c).one}`,
    locationsIn: (c: Country) => `Apple Store ${dePais(c.cc)}`,
    storeCount: (k: number) => <>{tiendas(k)}</>,
    storeCountAll: (k: number) => <>{n(k)} tiendas</>,
    whenRestock: (c: Country) => <>¿Cuándo reponen las tiendas {dePais(c.cc)}?</>,
    howFast: (c: Country) => <>¿Cuánto tardan en agotarse las reposiciones {enPais(c.cc)}?</>,
    faqTitle: (c: Country) => `Apple Store ${dePais(c.cc)}: preguntas frecuentes`,
    getApp: "Instala la app",
    howItWorks: "Cómo funciona",
    pricing: "Precios",
  },

  restockTimes: {
    fmt: {
      n: rtN,
      pct: rtPct,
      date: dateLabel,
      longDate,
      zoneStamp,
      local: (iso: string, store: Parameters<typeof localStamp>[1]) => localStamp(iso, store, L),
      hour: (x: number) => h(x),
      range,
      weekday: (d: number) => wd(d),
      store: (s: Store) => apple(s),
      storeWithPlace: (s: Store) => `${apple(s)} (${cityOf(s)})`,
    },
    title: (c: Country, place?: RestockTimesPlace) => `¿Cuándo repone Apple el iPhone Duo ${place ? `en ${place.name}` : enPais(c.cc)}?`,
    metaDescription: (x: RestockTimesMeta) => {
      const { c, t, w, pattern } = x;
      const own = c.cc === "us" ? "estado" : c.regionNoun ? noun(c).one : "tienda";
      /** A region page lists its cities; a city page has no unit before "tienda". */
      const region = x.place ? (x.place.kind === "region" ? "ciudad" : "tienda") : own;
      const by = x.place?.kind === "city" ? "tienda" : `${region}, tienda`;
      const since = dateLabel(t.since, false);
      return t.n > 0 && pattern
        ? fitTitleW([
          `${cap(reposiciones(t.n))} del iPhone Duo ${rtEn(x)} desde el ${since}: el ${rtPct(w.share)}, ${between(w.from, w.to)}${t.sellout ? `; el ${rtPct(t.sellout.within2min)}, agotadas en 2 min` : ""}. Tablas por hora, día, ${region} y configuración.`,
          `${cap(reposiciones(t.n))} del iPhone Duo ${rtEn(x)} desde el ${since}: el ${rtPct(w.share)}, ${between(w.from, w.to)} (hora local). Tablas por hora, día, ${region} y configuración.`,
          `Horas de reposición del iPhone Duo ${rtEn(x)}: ${reposiciones(t.n)} desde el ${since}, por hora, día, ${region} y configuración.`,
        ], 158)
        : t.n > 0
          ? fitTitleW([
            `${cap(confirmadas(t.n))} del iPhone Duo en los Apple Store ${rtDe(x)} desde el ${since}, con comprobaciones cada ${SPEED.checkSec} segundos: por hora local, día a día, por ${by} y configuración, y cuánto duró cada una.`,
            `Horas de reposición del iPhone Duo ${rtEn(x)}: ${confirmadas(t.n)} desde el ${since}, por hora, día, ${region} y configuración.`,
          ], 158)
          : fitTitleW([
            `Cuándo reponen el iPhone Duo los Apple Store ${rtDe(x)}, según nuestras comprobaciones cada ${SPEED.checkSec} segundos desde el ${dateLabel(t.since, false)}: hora a hora, día a día, por tienda y configuración.`,
            `Cuándo reponen el iPhone Duo los Apple Store ${rtDe(x)}: comprobaciones cada ${SPEED.checkSec} segundos desde el ${dateLabel(t.since, false)}, hora a hora y por tienda.`,
          ], 158);
    },
    h1: (x: RestockTimesView) => x.t.unknown
      ? `¿Cuándo repone Apple el iPhone Duo ${rtEn(x)}?`
      : x.t.n > 0
        ? `¿Sigue Apple reponiendo el iPhone Duo ${rtEn(x)}? Sí: así es como, hora a hora`
        : `¿Está reponiendo Apple el iPhone Duo ${rtEn(x)}? Aún no, según nuestras comprobaciones: esto es lo que vigilamos`,
    intro: (x: RestockTimesView) => {
      const { t, one, tracked, pattern, w } = x;
      const de = rtDe(x);
      return t.unknown ? (
        <>Ahora mismo no hemos podido leer el registro de reposiciones; las tiendas {de} se siguen comprobando cada {SPEED.checkSec} segundos, y esta página vuelve con sus cifras en la próxima carga.</>
      ) : t.n > 0 ? (
        <>
          <b className="text-ink">Sí.</b> {one ? "El Apple Store" : "Los Apple Store"} {de} {one ? "ha" : "han"} repuesto el iPhone Duo <b className="text-ink">{rtN(t.n)} {t.n === 1 ? "vez" : "veces"} desde el {longDate(t.since)}</b>{tracked > 1 ? <>, en {rtN(t.days)} de los {rtN(tracked)} días</> : <> (por ahora, un solo día de seguimiento)</>}
          {pattern && <>, <b className="text-ink">el {rtPct(w.share)} {between(w.from, w.to)}</b>, hora local de la tienda</>}.
        </>
      ) : (
        <>
          <b className="text-ink">Aún no, según nuestras comprobaciones.</b> Desde el {longDate(t.since)}, PickupChecker ha consultado {one ? "el Apple Store" : `los ${x.stores} Apple Store`} {de} cada {SPEED.checkSec} segundos y no ha confirmado ninguna reposición del iPhone Duo para recogida.
        </>
      );
    },
    hero: {
      restocks: (x: RestockTimesView) => `reposiciones confirmadas desde el ${dateLabel(x.t.since, false)}`,
      window: (x: RestockTimesView) => `${between(x.w.from, x.w.to)}, hora local de la tienda`,
      days: "días con al menos una reposición",
      // English infers literal return types: the Spanish words go through a cast.
      now: ((one: boolean) => (one ? "tienda lo tiene ahora para recogida" : "tiendas lo tienen ahora para recogida")) as unknown as Dict["views"]["restockTimes"]["hero"]["now"],
      today: (x: RestockTimesView, today: DayRow) => `hoy (${dateLabel(today.date)})${x.one ? "" : `, en ${tiendas(today.stores)}`}, por ahora`,
      weekday: "el día de la semana con más, por ahora",
    },
    heroPoints: (x: RestockTimesView, latest: { config: string; store: Store; at: string } | null): Point[] => [
      ...(latest ? [{ text: <>La última: <b className="text-ink">{latest.config}</b>{x.one ? null : <> en <Link href={storePath(latest.store)} className="underline underline-offset-2">{apple(latest.store)}</Link></>}, {localStamp(latest.at, latest.store, L)}, hora local</> }] : []),
      ...(x.t.peakWeekday != null ? [{ text: <>Sobre todo <b className="text-ink">{losDias(wd(x.t.peakWeekday))}</b></> }] : []),
      { text: <>Apple <b className="text-ink">no publica ningún calendario</b> de reposiciones; estas son nuestras propias comprobaciones confirmadas, actualizadas cada cinco minutos, más o menos</>, no: true },
    ],
    emptyPoints: (x: RestockTimesView): Point[] => [
      { text: <>Ahora mismo <b className="text-ink">{rtN(x.duoNow)} de {rtN(x.stores)}</b> {x.duoNow === 1 ? "lo tiene" : "lo tienen"} para recogida</> },
      { text: <>Las tablas de abajo se rellenan a partir de la primera reposición confirmada</>, step: true },
      { text: <>Patrones por hora y por día de la semana, donde más datos tenemos: <Link href="/iphone-duo-restock-times" className="underline underline-offset-2">la página de EE. UU. (en inglés)</Link></>, step: true },
    ],
    setUpAlert: "Crea una alerta del iPhone Duo",
    logLive: "El registro de reposiciones, en directo",
    onThisPage: "En esta página",
    nav: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": "Hora del día",
      "day-by-day": "Día a día",
      where: `Por ${rnu(x).one}`,
      configuration: "Configuración",
      "how-long": "Cuánto dura",
      unavailable: "Por qué «no disponible»",
      reddit: "Reddit frente a los datos",
      method: "Cómo contamos",
    }),
    h2: (x: RestockTimesView): Record<string, string> => ({
      "time-of-day": `¿A qué hora repone Apple el iPhone Duo ${rtEn(x)}?`,
      "day-by-day": `¿Qué días ha repuesto Apple el iPhone Duo ${rtEn(x)}?`,
      where: `¿Qué Apple Store reponen más el iPhone Duo ${rtEn(x)}?`,
      configuration: `¿Qué configuración del iPhone Duo se repone más ${rtEn(x)}?`,
      "how-long": `¿Cuánto dura una reposición del iPhone Duo ${rtEn(x)}?`,
      unavailable: "¿Por qué todos los Apple Store dicen «No disponible para recogida»?",
      reddit: "Lo que dice Reddit sobre las reposiciones del iPhone Duo, y lo que dicen los datos",
      method: "¿Cómo cuenta PickupChecker una reposición?",
    }),
    faq: (x: RestockTimesView): Faq[] => {
      const { t, w, pattern, sell, us, weekend, tracked } = x;
      const where = rtEn(x);
      return [
        { q: `¿Cuándo repone Apple el iPhone Duo ${where}?`, a: t.n > 0 && pattern
          ? `${w.from < 12 ? "Sobre todo por la mañana: " : ""}el ${rtPct(w.share)} de las ${rtN(t.n)} reposiciones confirmadas desde el ${longDate(t.since)} llegó ${between(w.from, w.to)}, hora local de la tienda, y el ${rtPct(hourShare(t.byHour, 8, 12))}, entre las 8:00 y las 12:00. Apple no publica ningún calendario; este es el patrón que observa PickupChecker, actualizado cada cinco minutos, más o menos.`
          : `Apple no publica ningún calendario, y PickupChecker ha registrado ${confirmadas(t.n)} ${where} desde el ${longDate(t.since)}${t.days ? ` en ${dias(t.days)}` : ""}. Indicamos una hora habitual cuando hay ${PATTERN_MIN} reposiciones en ${PATTERN_MIN_DAYS} días distintos, y esta página se completa sola.` },
        { q: `¿Repone Apple el iPhone Duo los fines de semana${us ? "" : ` ${where}`}?`, a: t.n > 0
          ? `${weekend > 0 ? "Por ahora, sí" : "Aún no en nuestros datos"}: ${reposiciones(weekend)} de ${rtN(t.n)} ${weekend === 1 ? "cayó" : "cayeron"} en sábado o domingo (${rtPct(weekend / t.n)}). ${t.peakWeekday != null ? `El ${wd(t.peakWeekday)} ha sido el día con más reposiciones.` : `No indicamos qué día de la semana tiene más hasta que los datos abarcan ${WEEKDAY_MIN_SPAN} días; los nuestros cubren ${rtN(tracked)}.`}`
          : `Aún no hay datos de fin de semana ${where}; la tabla día a día de esta página se rellena a medida que se confirman reposiciones.` },
        { q: "¿A qué hora debería empezar a mirar?", a: t.n > 0 && pattern
          ? `Si miras a mano, entra en apple.com con la recogida seleccionada desde ${lasH(w.from)}, hora local: esa franja de dos horas ha concentrado el ${rtPct(w.share)} de las reposiciones. Una reposición típica ${sell ? `se agotó en ${rtN(sell.medianSec)} segundos (mediana)` : "dura más o menos un minuto"}, así que una alerta que comprueba cada ${SPEED.fastSec} segundos ([cómo funcionan las alertas, en inglés](/iphone-duo-stock-alerts)) hace lo que ninguna recarga puede.`
          : `Hasta que haya un patrón claro ${where}, deja que una alerta vigile por ti: las tiendas que elijas se comprueban cada ${SPEED.fastSec} segundos, a todas horas ([cómo funcionan las alertas, en inglés](/iphone-duo-stock-alerts)).` },
        { q: "¿Por qué todos los Apple Store dicen que el iPhone Duo no está disponible?", a: sell
          ? `Porque una reposición dura poco: el ${rtPct(sell.within2min)} de las ${rtN(sell.n)} reposiciones agotadas que hemos medido ${where} desapareció en 2 minutos, y el ${rtPct(sell.within20min)}, en 20. Ahora mismo ${rtN(x.duoNow)} de ${rtN(x.stores)} tiendas lo tienen; casi en cualquier otro momento, lo honesto en apple.com es «No disponible», incluso un día con decenas de reposiciones ([qué significa «no disponible», en inglés](/apple-store-pickup-availability-explained)).`
          : `Porque el stock para recogida aparece durante unos minutos. Ahora mismo ${rtN(x.duoNow)} de ${tiendas(x.stores)} ${where} lo ${x.duoNow === 1 ? "tiene" : "tienen"} ([qué significa «no disponible», en inglés](/apple-store-pickup-availability-explained)).` },
        { q: "¿Cómo me entero de cuándo repone el iPhone Duo mi Apple Store?", a: `Crea una alerta para la tienda, la capacidad y el color exactos: desde ese momento esa tienda se comprueba cada ${SPEED.fastSec} segundos y tu móvil recibe el aviso unos ${SPEED.alertSec} segundos después de que se confirme una reposición ([crear una alerta](${x.alert}); [cómo funciona, en inglés](/how-it-works)).` },
      ];
    },
    sources: {
      applePickup: "Apple: entrega y recogida (cómo funciona la disponibilidad para recogida en tienda)",
      newsroom: "Apple Newsroom: el iPhone Duo llega a los Apple Store de todo el mundo (23 de octubre de 2026)",
      macRumors: "MacRumors: el sistema de recogida del Apple Store para el iPhone Duo vuelve a funcionar en EE. UU. y Canadá (24 de octubre de 2026)",
      reports: (tracker: string) => `${tracker}: reposiciones del iPhone Duo de la semana del lanzamiento (sus observaciones, mostradas aparte y nunca contadas)`,
    },
    ld: (x: RestockTimesView) => ({
      datasetName: `Horas de reposición del iPhone Duo en los Apple Store ${rtDe(x)}`,
      description: `Cada reposición del iPhone Duo para recogida en tienda confirmada en los Apple Store ${rtDe(x)} desde el ${x.t.since}, con tienda, configuración y hora, a partir de las comprobaciones de PickupChecker cada ${SPEED.checkSec} segundos; resumida por hora local, día, ${x.place?.kind === "city" ? "" : `${rnu(x).one}, `}tienda y configuración.`,
      spatial: `Apple Store ${rtDe(x)}`,
      measured: ["hora de la reposición (local de la tienda)", "Apple Store", "capacidad y color del iPhone Duo", "segundos hasta agotarse"],
      size: `${reposiciones(x.t.n)} en ${tiendas(x.t.stores)}`,
    }),
    crumb: "Horas de reposición del iPhone Duo",

    timeLead: (x: RestockTimesView) => <b>El {rtPct(x.w.share)} de las {rtN(x.t.n)} reposiciones llegó {between(x.w.from, x.w.to)}, hora local de la tienda, y el {rtPct(hourShare(x.t.byHour, 8, 12))}, entre las 8:00 y las 12:00.</b>,
    busiestHour: (count: number) => `la hora con más: ${reposiciones(count)}`,
    morning: "entre las 8:00 y las 12:00",
    evening: "después de las 17:00: las tardes no están muertas",
    night: "entre las 0:00 y las 6:00",
    tooFew: (x: RestockTimesView) => <b>Aún hay muy pocos días para señalar una hora: {confirmadas(x.t.n)} en {dias(x.t.days)} desde el {longDate(x.t.since)}.</b>,
    tooFewKeys: (): Point[] => [
      { text: <>Una hora habitual necesita <b className="text-ink">{PATTERN_MIN} reposiciones en {PATTERN_MIN_DAYS} días distintos</b></> },
      { text: <>Diez reposiciones de golpe = un evento, no una costumbre</>, no: true },
      { text: <>La página se reescribe sola a medida que se acumulan los días</>, step: true },
    ],
    hourCaption: (x: RestockTimesView) => `Reposiciones del iPhone Duo ${rtEn(x)} por hora local de la tienda, del ${dateLabel(x.t.since, false)} a hoy (${reposiciones(x.t.n)})`,
    hourHead: ["Hora local", "Reposiciones", "Porcentaje"],
    morningKeys: (x: RestockTimesView): Point[] => [
      { text: <>El pico de la mañana <b className="text-ink">no es la apertura de las puertas</b>{x.us ? ": la mayoría de los Apple Store de EE. UU. abre a las 10:00" : ""}</> },
      { text: <>El stock para recogida se libera <b className="text-ink">online</b>, antes de que suban las persianas</> },
      { text: <>A mano: vigila de <b className="text-ink">{h(x.w.from)} a {h(x.w.to)}</b> un día laborable por la mañana</>, step: true },
      { text: <>Deja que una <Link href={x.alert}>alerta</Link> vigile las <b className="text-ink">otras 22 horas</b>, en las que nadie está recargando</>, step: true },
    ],
    storeChartKeys: (x: RestockTimesView): Point[] => [{ text: <>Cada página de tienda tiene su propio gráfico, en su propia zona horaria (<Link href={x.storesHref}>{x.us ? "Apple Store por estado" : `tiendas ${rtDe(x)}`}</Link>): una tienda que repone a las 8:00 donde las demás lo hacen a las 9:00 es un dato que merece la pena conocer</>, step: true }],

    dayLead: (x: RestockTimesView) => {
      const { t, tracked, one } = x;
      return t.n > 0 && tracked === 1 ? (
        <b>Por ahora, un solo día de seguimiento, el {dateLabel(t.daily[t.daily.length - 1]?.date ?? t.since, false)}, con {confirmadas(t.n)}{one ? "" : ` en ${tiendas(t.stores)}`}.</b>
      ) : t.n > 0 ? (
        <b>{t.days === tracked ? `Todos los días que llevamos de seguimiento (${rtN(t.days)} de ${rtN(t.days)}) tuvieron` : `${rtN(t.days)} de los ${rtN(tracked)} días desde el ${longDate(t.since)} tuvieron`} al menos una reposición confirmada{t.peakWeekday != null ? `, y el ${wd(t.peakWeekday)} ha sido el día de la semana con más` : ""}.</b>
      ) : (
        <b>Ninguna reposición confirmada {rtEn(x)} desde el {longDate(t.since)}.</b>
      );
    },
    daysTracked: "días del seguimiento con al menos una reposición",
    busiestDay: (x: RestockTimesView, day: DayRow) => `el día con más, ${dateLabel(day.date)}${x.one ? "" : `, en ${tiendas(day.stores)}`}`,
    busiestDayNone: "el día con más",
    drop: (x: RestockTimesView, drop: { at: string; restocks: number }) => `tiendas que repusieron en la misma media hora, ${zoneStamp(drop.at, x.c)} (${configs(drop.restocks)}): una oleada nacional vista desde fuera`,
    weekend: (x: RestockTimesView) => `en sábado o domingo (${reposiciones(x.weekend)})`,
    dayCaption: (x: RestockTimesView) => `Reposiciones del iPhone Duo ${rtEn(x)}, día a día${x.t.reports.length ? "; las filas marcadas «según…» son observaciones publicadas por otros rastreadores para los días anteriores a nuestro seguimiento, mostradas solo para la cronología" : ""}`,
    dayHead: { date: "Fecha", restocks: "Reposiciones", stores: "Tiendas", busiest: "Hora con más", source: "Fuente" },
    soFar: " · por ahora",
    reportedBy: (names: string[]) => <>según {names.join(" / ")}</>,
    dayKeys: (x: RestockTimesView, launch: string, resumed: string): Point[] => [
      { text: <><b className="text-ink">{dateLabel(launch)}</b>: día del lanzamiento, las primeras unidades para pedidos online</> },
      { text: <><b className="text-ink">{dateLabel(resumed)}</b>: se reabren las reservas para recogida{x.us ? " (MacRumors)" : ""}</> },
      x.t.reports.length
        ? { text: <>Filas marcadas <b className="text-ink">según…</b>: observaciones de {x.reportNames.join(" y ")} en la semana del lanzamiento, nunca contadas</> }
        : { text: <>Nuestro registro de todas las tiendas {rtDe(x)} empieza el <b className="text-ink">{longDate(x.t.since)}</b></> },
      ...(x.t.n > 0 && x.t.peakWeekday == null ? [{ text: <>Día de la semana con más: lo indicamos cuando los datos abarcan <b className="text-ink">{WEEKDAY_MIN_SPAN} días</b> (los nuestros cubren {rtN(x.tracked)})</>, no: true }] : []),
      { text: <>Fíjate en la columna <b className="text-ink">tiendas</b>: las mismas reposiciones repartidas en más tiendas son un día mejor para ti</>, step: true },
    ],

    whereLead: (x: RestockTimesView, hit: { name: string; restocks: number; stores: number; storesTotal: number }[], total: number) => (
      <b>{hit[0].name}: {reposiciones(hit[0].restocks)} en {rtN(hit[0].stores)} de sus {tiendas(hit[0].storesTotal)} desde el {dateLabel(x.t.since, false)}{hit[1] ? <>; después, {hit[1].name} ({rtN(hit[1].restocks)})</> : null}{hit[2] ? <> y {hit[2].name} ({rtN(hit[2].restocks)})</> : null}; {rtN(hit.length)} de {rtN(total)} {rnu(x).other} {hit.length === 1 ? "ha" : "han"} tenido al menos una reposición{total - hit.length > 0 ? ` y ${rtN(total - hit.length)}, aún ninguna` : ""}.</b>
    ),
    whereNone: (x: RestockTimesView) => <b>{rnu(x).f ? "Ninguna" : "Ningún"} {rnu(x).one} {rtDe(x)} tiene aún una reposición confirmada; la tabla se rellena desde la primera.</b>,
    regionCaption: (x: RestockTimesView) => `Reposiciones confirmadas del iPhone Duo por ${rnu(x).one} ${rtEn(x)}, del ${dateLabel(x.t.since, false)} a hoy`,
    regionHead: (x: RestockTimesView) => [cap(rnu(x).one), "Reposiciones", "Tiendas con reposición", "Última reposición (hora local)"],
    ofN: (a: number, b: number) => <>{rtN(a)} de {rtN(b)}</>,
    storesCaption: (x: RestockTimesView) => `Las tiendas con más reposiciones del iPhone Duo ${rtEn(x)}, del ${dateLabel(x.t.since, false)} a hoy`,
    storesHead: ["Tienda", "Reposiciones", "Días", "Hora habitual", "Última (hora local)"],
    swaps: (x: RestockTimesView) => [
      { no: "La tienda con más reposiciones, esté donde esté", yes: `Dos o tres tiendas a las que puedas llegar en menos de una hora, atento desde ${x.pattern ? lasH(x.w.from) : "primera hora de la mañana"}`, why: "Una reposición a la que no puedes llegar no es una reposición; hasta la tienda con más movimiento marca «no disponible» todo el día salvo unos minutos." },
      { no: "Una sola tienda, y a esperar", yes: "Una alerta en cada una, y ve a la que avise primero", why: "La tabla de recuentos solo te dice a cuál de tus tiendas ir primero." },
    ],
    nearMe: "Tiendas con el Duo cerca de mí, ahora mismo",

    configLead: (x: RestockTimesView, top: { label: string; restocks: number }, rarest: { label: string; restocks: number } | null) => (
      <b>{top.label}: {rtN(top.restocks)} de las {rtN(x.t.n)} reposiciones ({rtPct(top.restocks / x.t.n)}){rarest ? `; la que menos, ${rarest.label}, con ${reposiciones(rarest.restocks)}` : ""}.</b>
    ),
    mostRestocked: (config: string) => `${config}: la configuración más repuesta`,
    versus: (a: string, bCount: number, b: string) => `reposiciones de ${a}, frente a ${rtN(bCount)} de ${b}`,
    restocksOf: (a: string) => `reposiciones de ${a}`,
    byStorage: "por capacidad",
    byColour: "por color",
    configNone: (x: RestockTimesView) => <b>Ninguna configuración {rtEn(x)} tiene aún una reposición confirmada; listamos las ocho configuraciones para que la primera reposición tenga dónde aparecer.</b>,
    configCaption: (x: RestockTimesView) => `Reposiciones confirmadas del iPhone Duo ${rtEn(x)} por configuración, del ${dateLabel(x.t.since, false)} a hoy`,
    configHead: ["Configuración", "Reposiciones", "Porcentaje", "Última reposición (hora local)"],
    configKeys: (x: RestockTimesView): Point[] => [
      { text: <>Elegir la configuración importa <b className="text-ink">más que elegir la tienda</b></> },
      x.storageRatio != null
        ? { text: <>Quédate con la capacidad más repuesta: unas <b className="text-ink">{rtN(x.storageRatio)}×</b> más probabilidades que con la siguiente</> }
        : { text: <>Quédate con la capacidad más repuesta: tus probabilidades mejoran <b className="text-ink">mucho</b></> },
      { text: <>El de <b className="text-ink">2TB</b>: un móvil que se pide con envío a casa y se espera</>, no: true },
      { text: <>Precios y lo que hay en stock ahora: <Link href="/which-iphone-duo-restocks-most">¿Qué iPhone Duo se repone más? (en inglés)</Link></>, step: true },
    ],

    howLongLead: (x: RestockTimesView, sell: SelloutFacts) => <b>La mitad de las {rtN(sell.n)} reposiciones agotadas {rtEn(x)} desapareció en {rtN(sell.medianSec)} segundos; el {rtPct(sell.within2min)}, en 2 minutos, y el {rtPct(sell.within20min)}, en 20.</b>,
    secUnit: "s",
    medianListing: "disponibilidad típica, de que aparece a que se agota (mediana)",
    within2: "agotadas en 2 minutos",
    within20: "agotadas en 20 minutos",
    fastest: "el agotamiento más rápido medido",
    howLongNone: (x: RestockTimesView) => <b>Aún hay muy pocas reposiciones agotadas {rtEn(x)} para medirlo; damos estas cifras a partir de diez, y la página de EE. UU. tiene el panorama completo.</b>,
    howLongKeys: (x: RestockTimesView): Point[] => [
      { text: <>Una ventana de dos minutos se atrapa con una <b className="text-ink">alerta</b>, no recargando apple.com</> },
      { text: <>Esta es la cifra que explica todo lo demás de esta página</> },
      { text: <>Cada reposición con los segundos que duró, por configuración y {rn(x).one}: <Link href="/iphone-duo-sell-out-times">¿Cuánto tarda en agotarse una reposición del iPhone Duo? (en inglés)</Link></>, step: true },
    ],
    measured: "Cada cifra es el tiempo entre la comprobación que vio la configuración disponible por primera vez y la que la vio agotada, así que es un límite superior: la duración real es más corta.",

    unavailableLead: (x: RestockTimesView) => <b>Porque una reposición es un parpadeo, no un estado: {x.one ? "una tienda" : `${rtN(x.stores)} tiendas`} × {rtN(x.configs)} configuraciones = {rtN(x.pairs)} combinaciones que pueden estar en stock {rtEn(x)}, y en este momento {rtN(x.duoNow)} {x.duoNow === 1 ? "tienda tiene" : "tiendas tienen"} algún iPhone Duo.</b>,
    pairs: "combinaciones tienda × configuración que pueden estar en stock",
    listingNow: "con un iPhone Duo para recogida en este momento",
    goneIn2: "de las reposiciones, agotadas en menos de dos minutos",
    last24: "reposiciones confirmadas en las últimas 24 horas",
    unavailableKeys: (x: RestockTimesView, today: number): Point[] => [
      x.recent.restocks > 0
        ? { text: <>Últimas 24 horas: <b className="text-ink">{confirmadas(x.recent.restocks)}</b> en {tiendas(x.recent.stores)} {rtEn(x)}</> }
        : today > 0
          ? { text: <>Hoy: <b className="text-ink">{confirmadas(today)}</b> {rtEn(x)}</> }
          : { text: <>La tabla día a día de arriba muestra las reposiciones que sí hubo</> },
      { text: <>Cada una, visible en apple.com durante <b className="text-ink">un minuto o dos</b></> },
      { text: <>«No disponible en ninguna parte» el cuarto día, o el decimocuarto, <b className="text-ink">no</b> significa que Apple haya dejado de reponer</>, no: true },
    ],
    unavailableLinks: { explained: "Qué significa «no disponible para recogida» (en inglés)", howToGet: "Cómo conseguir un iPhone Duo (en inglés)" },

    redditLead: (x: RestockTimesView) => <b>Casi toda la sabiduría popular de <a href="https://www.reddit.com/r/applestore/" target="_blank" rel="noopener nofollow">r/applestore</a> y <a href="https://www.reddit.com/r/iphone/" target="_blank" rel="noopener nofollow">r/iphone</a> es sincera, de una sola tienda y caduca en un día; estas son las cuatro afirmaciones que más vemos, frente a {rtN(x.t.n)} reposiciones confirmadas {rtEn(x)}.</b>,
    redditCaption: "Afirmaciones habituales en Reddit sobre las reposiciones del iPhone Duo, contrastadas con las reposiciones confirmadas por PickupChecker",
    redditHead: ["La afirmación", "Lo que dicen los datos"],
    claims: (x: RestockTimesView): { claim: string; answer: ReactNode }[] => {
      const { t, w, tracked, recent } = x;
      return [
        { claim: "«Las tiendas reponen de madrugada: mira a las 3:00.»", answer: t.n > 0 ? <>El {rtPct(hourShare(t.byHour, 0, 6))} de las reposiciones cayó entre las 0:00 y las 6:00, hora local; el {rtPct(w.share)}, {between(w.from, w.to)}.</> : "Aún no hay ninguna reposición registrada con la que comprobarlo." },
        { claim: "«Apple solo repone un día de la semana.»", answer: t.n > 0 ? (t.peakWeekday != null ? <>El {wd(t.peakWeekday)} es por ahora el día con más ({rtN(t.byWeekday[t.peakWeekday])} de {rtN(t.n)}), pero hubo reposiciones en {rtN(t.days)} de {rtN(tracked)} días.</> : <>Hubo reposiciones en {rtN(t.days)} de los {rtN(tracked)} días que llevamos de seguimiento{t.days === tracked ? ", sin ningún día vacío" : ""}; el día con más se indica cuando los datos abarcan {WEEKDAY_MIN_SPAN} días.</>) : "Aún no hay ninguna reposición registrada con la que comprobarlo." },
        { claim: "«Llama a la tienda y pregunta cuándo llega el camión.»", answer: "Apple no publica ningún calendario de reposiciones; lo que llega a apple.com es stock para recogida liberado online, y la tienda lo ve en el mismo momento que todo el mundo." },
        { claim: "«Si pone no disponible, se ha agotado para siempre.»", answer: recent.restocks > 0 ? <>{cap(confirmadas(recent.restocks))} en {tiendas(recent.stores)} en las últimas 24 horas dicen lo contrario; todas volvieron a estar «no disponibles» en minutos.</> : t.n > 0 ? <>{cap(confirmadas(t.n))} desde el {dateLabel(t.since, false)} dicen lo contrario; todas volvieron a estar «no disponibles» en minutos.</> : "Aún no hay nada con lo que comprobarlo." },
      ];
    },
    redditKeys: (): Point[] => [
      { text: <>El rumor es a lo que uno recurre cuando <b className="text-ink">no hay datos</b>; esta página son los datos, y se leen gratis</> },
      { text: <>En lo que Reddit acierta: los <b className="text-ink">trucos del pago</b>, con la sesión iniciada y Apple Pay listo (<Link href="/how-to-grab-an-iphone-duo-restock">nuestra versión en 20 segundos, en inglés</Link>)</> },
    ],

    methodLead: <b>Contamos una reposición cuando apple.com pone disponible para recogida en tienda una configuración en una tienda donde no lo estaba, confirmada por dos comprobaciones que coinciden.</b>,
    methodKeys: (x: RestockTimesView): Point[] => [
      { text: <>{x.one ? "El Apple Store" : "Todos los Apple Store"} {rtDe(x)}, cada <b className="text-ink">{SPEED.checkSec} segundos</b>; las tiendas con alertas, cada <b className="text-ink">{SPEED.fastSec}</b></> },
      { text: <>Otros rastreadores publican intervalos <b className="text-ink">{OTHER}</b>; solo comparamos cifras publicadas</> },
      { text: <>Un primer «disponible» se vuelve a consultar <b className="text-ink">aproximadamente un segundo después</b> antes de contar</> },
      { text: <>Una disponibilidad que desaparece se confirma en la <b className="text-ink">siguiente ronda</b></> },
      { text: <>La primera vez que vemos una tienda, o una petición fallida o caducada: <b className="text-ink">nunca</b> es una reposición ni un «sin stock»</>, no: true },
      { text: <>Horas y fechas en la <b className="text-ink">hora local</b> de cada tienda; «oleadas» = la misma media hora en distintas zonas horarias</> },
      { text: <>Avisos de otros rastreadores{x.t.reports.length ? ` (${x.reportNames.join(", ")})` : ""}: en sus propias filas marcadas, <b className="text-ink">nunca en un total</b></> },
      { text: <>Se actualiza cada cinco minutos, más o menos; <Link href={x.logHref}>el registro de reposiciones</Link> en sí es en directo</>, step: true },
    ],
    quote: "Puedes citar estas cifras con un enlace a esta página; PickupChecker es independiente, no tiene relación con Apple y lee la misma disponibilidad para recogida que cualquiera puede ver en apple.com, solo que muchísimo más a menudo.",
    alertIn: (x: RestockTimesView) => <>Crea una alerta del iPhone Duo{x.one ? "" : ` ${rtEn(x)}`}</>,

    related: "Las demás preguntas sobre el iPhone Duo",
    sameData: "Respondidas con los mismos datos",
    questions: {
      sellOut: "¿Cuánto tarda en agotarse una reposición?",
      alerts: "La forma más rápida de enterarte",
      howToGet: "Cómo conseguir uno de verdad",
      whichConfig: "Qué configuración se repone más",
      nearMe: "Tiendas que lo tienen cerca de mí, ahora",
      unavailable: "Qué significa «no disponible»",
    },
    otherCountries: ((us: boolean) => (us ? "La misma página para otros países" : "Otros países")) as unknown as Dict["views"]["restockTimes"]["otherCountries"],
    place: {
      byCity: "Por ciudad",
      storesLive: (x: RestockTimesView) => `Apple Store ${rtDe(x)}, en directo`,
      countryPage: (c: Country) => `Horas de reposición del iPhone Duo ${enPais(c.cc)}`,
      sourcesWhere: (x: RestockTimesView) => (x.stores === 1 ? `el Apple Store ${rtDe(x)}` : `los ${rtN(x.stores)} Apple Store ${rtDe(x)}`),
    },
    faqTitle: "Preguntas",
  },
};
