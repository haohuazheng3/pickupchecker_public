/**
 * Spanish (Spain): place — the copy builders of the country pages (/es-es/…): titles, Answer-First intros,
 * keyword sections, price/IVA sections and FAQs, built from Spain's live numbers. Same functions, arguments and
 * return shapes as English (lib/seo/countryCopy.ts). Titles lead with what Spain types: "Apple Store Madrid",
 * "Apple Puerta del Sol", "iPhone Duo", "iphone duo precio".
 */
import type { Dict } from "../en";
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { INTL_TRACKING_SINCE, priceOf, priceRange, scarcest, pairsPct, duoStoresNow, type IntlPlaceInput, type HomeCopyInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { alertHref, fmtDuration, type FaqItem } from "@/lib/seo/enrich";
import { fitTitleW, list, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, regionLabel } from "@/lib/i18n/places";
import type { Block, Faq } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import { content } from "./content";
import { L, n, pc, money, pais, enPais, dePais, noun, cap, impuesto, taxNote, lasH, apples, tiendas, reposiciones, ciudades, v, tc, aprox } from "./words";

/** "desde que empezó el seguimiento, el 2 de noviembre" while the 30-day window still reaches back to the start. */
function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "desde que empezó el seguimiento, el 2 de noviembre" : "en los últimos 30 días";
}

/** "2 nov, 15:04 CET" in the country's zone. */
const whenIn = (cc: CountryCode, iso: string | Date): string => stamp(L, iso, COUNTRIES[cc].timeZone, true);

/** The region or city of a place input, in Spanish ("Madrid", "Málaga"). */
const nameOf = (i: IntlPlaceInput): string => (i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L));
const apple = (s: Store): string => appleStoreLabel(s, L);
/** "2 tiendas" → "las dos tiendas"; one store: "la tienda". */
const theStores = (x: number): string => (x === 1 ? "la tienda" : x === 2 ? "las dos tiendas" : x === 3 ? "las tres tiendas" : `las ${n(x)} tiendas`);
/** "Ninguna de las 5 tiendas" / "Ninguna de las dos tiendas" / "La única tienda". */
const noneOf = (x: number): string => (x === 1 ? "**La única tienda** no tiene" : `**Ninguna de ${theStores(x)}** tiene`);

/* ------------------------------------------------------------------ tax */

function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `Los ${money(c, duo)} de Apple por un iPhone Duo 256GB no incluyen impuestos; con el ${pc(t.rate)} de ${CA_PROVINCE_TAX[region!].label} de ${region} sale por unos ${money(c, t.total)}.`;
    return `Los ${money(c, duo)} de Apple por un iPhone Duo 256GB no incluyen impuestos: se suma entre un 5 % y un 15 % según la provincia.`;
  }
  const r = includedRate(c);
  if (r == null) return `Un iPhone Duo 256GB cuesta ${money(c, duo)} y, como Hong Kong no tiene impuesto sobre las ventas, es lo que pagas al recogerlo.`;
  return `Un iPhone Duo 256GB cuesta ${money(c, duo)} ${enPais(cc)}, con el ${pc(r)} de ${impuesto(c)} incluido: el precio de apple.com es exactamente lo que pagas al recogerlo.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** Your Europe in Spanish for the EU countries; every other country keeps its tax authority's page. */
const EU_ES = { label: "Your Europe (Unión Europea): tipos de IVA en los países de la UE", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_es.htm" };
const taxSource = (cc: Exclude<CountryCode, "us">) => (TAX_SOURCES[cc].url.includes("europa.eu") ? EU_ES : TAX_SOURCES[cc]);

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const src = taxSource(cc as Exclude<CountryCode, "us">);
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      return {
        id: "price-with-tax",
        h2: `Precio del ${m.name} en ${placeName} con impuestos`,
        lead: `El ${m.name} 256GB cuesta **${money(c, base)} sin impuestos**; con ${t.hst ? `el ${pc(t.hst)} de HST` : t.pst ? `el ${pc(t.gst)} de GST y el ${pc(t.pst)} de ${t.label.split(" + ")[1]}` : `el ${pc(t.gst)} de GST (sin impuesto provincial)`} de ${region} sale por unos **${money(c, withProvinceTax(base, region!)!.total)}** en una tienda de ${placeName}.`,
        blocks: [
          { t: "note", text: "**El impuesto se cobra donde recoges:** manda la provincia de la tienda, no tu dirección." },
          { t: "table", head: ["iPhone", "Precio en apple.com", `Con ${pc(t.total)} de ${t.label}`], rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]), caption: `${region}: precio de Apple en Canadá más ${t.label} (${pc(t.total)})`, source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); precios de apple.com/ca` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `Precio del ${m.name} en Canadá con impuestos, por provincia`,
      lead: `Los **${money(c, base)}** de Apple por un ${m.name} 256GB no incluyen impuestos; los suma la provincia de la tienda de recogida: desde **${money(c, withProvinceTax(base, cheapest)!.total)}** en ${cheapest} (${pc(CA_PROVINCE_TAX[cheapest].total)}) hasta **${money(c, withProvinceTax(base, dearest)!.total)}** en ${dearest} (${pc(CA_PROVINCE_TAX[dearest].total)}).`,
      blocks: [{
        t: "table",
        head: ["Provincia", "Impuesto", "Tipo", `${m.short} 256GB con impuestos`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, pc(CA_PROVINCE_TAX[p].total), money(c, withProvinceTax(base, p)!.total)]),
        caption: "Provincias con Apple Store: impuestos sobre una recogida en tienda",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); precios de apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = impuesto(c);
  return {
    id: "price",
    h2: `Precio del ${m.name} ${enPais(cc)}: ${money(c, base)}, ${taxNote(c)}`,
    lead: r == null
      ? `Los **${money(c, base)}** del ${m.name} 256GB en apple.com son lo que pagas al recogerlo en ${placeName}: Hong Kong **no tiene IVA** ni impuesto sobre las ventas.`
      : `El ${m.name} 256GB cuesta **${money(c, base)}** ${enPais(cc)}, **${tn} del ${pc(r)} incluido** (${money(c, beforeTax(c, base))} sin ${tn}), y al recogerlo en ${placeName} no se suma nada.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "Precio en apple.com"] : ["iPhone", "Precio en apple.com", `Sin ${tn} (${pc(r)})`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: `Precios de Apple ${enPais(cc)}${r == null ? "" : `, ${tn} incluido`}`,
      source: `[${src.label}](${src.url}); precios de apple.com/${c.buyPath ?? c.shopPath}`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `¿Cuánto cuesta el iPhone Duo con impuestos en ${placeName}?`, a: `Unos ${money(c, t.total)} el de 256GB: los ${money(c, duo)} de Apple más el ${pc(t.rate)} de ${CA_PROVINCE_TAX[region!].label} de ${region}, que se cobra donde lo recoges.` }
      : { q: "¿El precio de Apple en Canadá incluye impuestos?", a: `No. El iPhone Duo 256GB cuesta ${money(c, duo)} sin impuestos; la provincia de la tienda suma GST, HST o el impuesto provincial, del 5 % en Alberta al 14,975 % en Quebec.` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "¿Hay impuesto sobre las ventas en un iPhone en Hong Kong?", a: `No. Hong Kong no tiene IVA ni impuesto sobre las ventas, así que el iPhone Duo 256GB cuesta ${money(c, duo)} al recogerlo, exactamente el precio de apple.com.` }
    : { q: `¿El precio de apple.com ${enPais(cc)} incluye el ${impuesto(c)}?`, a: `Sí. Los ${money(c, duo)} del iPhone Duo 256GB incluyen el ${pc(r)} de ${impuesto(c)}; no se añade nada al recogerlo en tienda.` };
}

/* ------------------------------------------------------------------ region / city pages */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = nameOf(i);
  if (i.kind === "state" && i.regionSlug) {
    // "Madrid y provincia": how Spain names a city with the province around it (the city page is "Apple Store Madrid").
    const nn = noun(COUNTRIES[i.cc]);
    return fitTitleW([
      `Apple Store ${w} y ${nn.one}: stock del iPhone Duo en ${theStores(k)}`,
      `Apple Store ${w} y ${nn.one}: stock del iPhone Duo en directo`,
      `Apple Store ${w} y ${nn.one}: stock del iPhone Duo`,
      `Apple Store ${w}: stock de iPhone`,
    ]);
  }
  return fitTitleW([
    `Apple Store ${w}: stock del iPhone Duo en ${theStores(k)}`,
    `Apple Store ${w}: stock del iPhone Duo en directo`,
    `Apple Store ${w}: stock de iPhone hoy`,
    `Apple Store ${w}: stock de iPhone`,
  ]);
}

/** The description's price clause. */
function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `; unos ${money(c, t.total)} con los impuestos de ${region}` : `; ${money(c, duo)} sin impuestos`; }
  const r = includedRate(c);
  return r == null ? `; desde ${money(c, duo)}` : `; desde ${money(c, duo)}, ${impuesto(c)} incluido`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = nameOf(i);
  const duo = i.stockNow.duo, pm = i.stockNow["18-pro-max"];
  return fitTitleW([
    `${apples(k)} en ${w}: ${duo === 0 ? "ninguno tiene" : `${n(duo)} ${v(duo, "tiene", "tienen")}`} el iPhone Duo para recogida ahora y ${n(pm)} el 18 Pro Max. Stock por tienda y reposiciones${priceBit(i.cc, i.region)}.`,
    `${apples(k)} en ${w}: ${n(duo)} con el iPhone Duo para recogida ahora y ${n(pm)} con el 18 Pro Max. En directo por tienda, con horas de reposición.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = nameOf(i);
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `, repartidos en ${ciudades(i.cities)}` : "";
  const duo = i.stockNow.duo;
  const head = duo === 0 ? "**ninguno** tiene" : `**${n(duo)}** ${v(duo, "tiene", "tienen")}`;
  return `**${apples(k)}** en ${w}${cities}: ${head} ahora un iPhone Duo disponible para recogida, **${n(i.stockNow["18-pro-max"])}** el 18 Pro Max y **${n(i.stockNow["18-pro"])}** el 18 Pro.`;
}

function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${n(have.length)} de ${tiendas(k)}** ${v(have.length, "tiene", "tienen")} ahora mismo un iPhone Duo: ${list(L, have.map(apple), 4, (x) => `${n(x)} más`)}.`;
  if (st.month > 0) return `${noneOf(k)} ahora mismo un iPhone Duo, pero lo han repuesto **${st.month === 1 ? "una vez" : `${n(st.month)} veces`}** ${sinceWhen()}.`;
  return `${noneOf(k)} ahora mismo un iPhone Duo, y ninguna ha registrado una reposición ${sinceWhen()}.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**Registradas ${sinceWhen()}:** ${reposiciones(st.month)} del Duo en estas tiendas`);
  if (st.lastRestock && last) items.push(`**Última reposición:** ${whenIn(i.cc, st.lastRestock.at)} en ${apple(last)}`);
  if (st.medianMs != null) items.push(`**Lo que suele durar:** un iPhone Duo repuesto siguió disponible ${aprox(fmtDuration(st.medianMs, L))} (mediana)`);
  items.push(`**La vía más rápida:** [crea una alerta del iPhone Duo en ${w}](${alert}) en ${k <= 3 ? theStores(k) : `las ${n(Math.min(k, 5))} tiendas más cercanas`} a las que puedas llegar`);
  items.push("**Una alerta** = una tienda × una configuración exacta; el aviso llega segundos después de que la tienda la ponga disponible");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**Eso puede cambiar en un minuto:** la forma más rápida de conseguir uno es una alerta, no recargar apple.com." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = nameOf(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pmConfigs = catalogFor("18-pro-max", i.cc).length;
  const pm = i.stockNow["18-pro-max"];
  return [
    { id: "iphone-duo", h2: `iPhone Duo en ${w}: qué tiendas lo tienen ahora`, lead: duoLead(i), blocks: duoPoints(i, w, alert) },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max en ${w}: stock por tienda`,
      lead: `**${n(pm)} de ${tiendas(k)}** ${v(pm, "tiene", "tienen")} un iPhone 18 Pro Max, con el **${pc(pairsPct(i, "18-pro-max"))}** de las ${n(k * pmConfigs)} combinaciones tienda × configuración en stock.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Lo más escaso ahora:** ${list(L, scarce.map((x) => `${tc(x.label)} (${n(x.stores)} de ${tiendas(k)})`))}`] : []),
        `**iPhone 18 Pro:** en ${n(i.stockNow["18-pro"])} de ${tiendas(k)}, con el ${pc(pairsPct(i, "18-pro"))} de las combinaciones en stock`,
        `**Registradas ${sinceWhen()}:** ${i.max.month ? `${reposiciones(i.max.month)} del 18 Pro Max` : "aún ninguna reposición del 18 Pro Max"}`,
        ...(i.max.medianMs != null ? [`**Lo que suele durar:** un Pro Max repuesto siguió disponible ${aprox(fmtDuration(i.max.medianMs, L))} (mediana)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  const p = pais(cc);
  return fitTitleW([
    `Apple Store ${p}: ${k === 2 ? "las dos tiendas" : `las ${n(k)} tiendas`} y su stock del iPhone Duo en directo`,
    `Apple Store ${p}: ${k === 2 ? "las dos tiendas" : `las ${n(k)} tiendas`}, con stock del iPhone Duo`,
    `Apple Store ${p}: stock del iPhone Duo en directo`,
    `Apple Store ${p}: stock de iPhone`,
  ], 70);
}

function homeTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return fitTitleW([
    `Stock de iPhone ${enPais(cc)}: ${k === 1 ? "su Apple Store" : `los ${apples(k)}`}, cada 15 s`,
    `Stock de iPhone ${enPais(cc)}: ${apples(k)}, cada 15 s`,
    `Stock de iPhone ${enPais(cc)}, cada 15 s`,
  ]);
}

function homeH1(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `Consulta el stock de iPhone en el Apple Store ${dePais(cc)}` : `Consulta el stock de iPhone en los ${apples(k)} ${dePais(cc)}`;
}

function allStoresPhrase(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `el único Apple Store ${dePais(cc)}` : `los ${apples(k)} ${dePais(cc)}`;
}

/** "en 10 ciudades de 7 provincias". */
function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const k = storesOf(cc).length;
  if (k === 1) return `en ${cityLabel(cc, cities[0].name, L)}`;
  if (cities.length === 1) return `todos en ${cityLabel(cc, cities[0].name, L)}`;
  if (!c.regionNoun || regions.length === 1) return `en ${ciudades(cities.length)}`;
  const nn = noun(c);
  return `en ${ciudades(cities.length)} de ${n(regions.length)} ${regions.length === 1 ? nn.one : nn.other}`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const all = k === 1 ? "el Apple Store" : k === 2 ? "los dos Apple Store" : `los ${apples(k)}`;
  return {
    title: fitTitleW([`${m.name}: stock en directo en ${all} ${dePais(cc)}`, `Stock del ${m.name} ${enPais(cc)}, en directo`, `Stock del ${m.name} ${enPais(cc)}`], 70),
    h2: [`${m.name} cerca de mí: las tiendas ${dePais(cc)} que lo tienen ahora`, priceSection(cc, pais(cc), undefined, model).h2],
  };
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  const from = cc === "ca" ? `**${money(c, r.low)}** sin impuestos` : `**${money(c, r.low)}**, ${taxNote(c)}`;
  const head = inStock === 0
    ? (k === 1 ? `**El Apple Store ${dePais(cc)} no tiene** ahora el ${m.name} disponible para recogida` : `**Ninguno** de los ${apples(k)} ${dePais(cc)} tiene ahora el ${m.name} disponible para recogida`)
    : `**${n(inStock)} de ${n(k)}** Apple Store ${dePais(cc)} ${v(inStock, "tiene", "tienen")} ahora el ${m.name} disponible para recogida`;
  return `${head} (comprobado **cada 15 segundos**); precios desde ${from}.`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  return fitTitleW([
    `¿Hay stock del ${m.name} ${enPais(cc)}? ${n(inStock)} de ${apples(k)} lo ${v(inStock, "tiene", "tienen")} para recogida ahora. En directo por tienda y configuración, desde ${money(c, r.low)}${cc === "ca" ? " sin impuestos" : ""}.`,
    `${m.name} ${enPais(cc)}: ${n(inStock)} de ${apples(k)} lo ${v(inStock, "tiene", "tienen")} ahora. Stock para recogida en directo por tienda y configuración, reposiciones y alertas.`,
  ], 155);
}

function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, n(catalogFor(m.key, cc).length), n(storesNow[m.key] ?? 0), n(restocks[m.key] ?? 0)]);
}

function homeDescription(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const k = storesOf(cc).length;
  const cur = c.currency === "EUR" ? "euros" : c.currency;
  return fitTitleW([
    `Stock para recogida del iPhone Duo, 18 Pro y 18 Pro Max en ${allStoresPhrase(cc)}, cada 15 segundos. ${k === 1 ? "Precios" : "Reposiciones y precios"} en ${cur}; aviso al instante.`,
    `Stock del iPhone Duo, 18 Pro y 18 Pro Max en ${allStoresPhrase(cc)}, cada 15 segundos. Reposiciones, precios en ${cur} y avisos.`,
  ], 155);
}

function homeIntro(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return `Ahora mismo el iPhone Duo está disponible para recogida en **{{duo.storesNow}} de ${n(k)}** Apple Store ${dePais(cc)}, el iPhone 18 Pro en **{{pro.storesNow}}** y el iPhone 18 Pro Max en **{{pm.storesNow}}**.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const k = storesOf(cc).length;
  const stores = storesOf(cc);
  return [
    {
      id: "iphone-stock",
      h2: `Stock de iPhone ${enPais(cc)}: Duo, 18 Pro y Pro Max por tienda`,
      lead: `PickupChecker lee cada 15 segundos la disponibilidad de recogida en tienda de apple.com para cada configuración en ${allStoresPhrase(cc)}: por tienda${k > 1 ? `, por ${c.regionNoun ? noun(c).one : "ciudad"}` : ""} y por configuración.`,
      blocks: [
        { t: "table", head: ["Modelo", "Configuraciones", "Tiendas con stock ahora", "Reposiciones registradas"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `Lo que cubre la comprobación ${enPais(cc)}, a {{asOf}}` },
        { t: "ul", items: [
          `**Cobertura:** ${spreadPhrase(cc)} · precios y referencias de apple.com/${c.buyPath ?? c.shopPath}`,
          "**Cada tienda cada 15 segundos**; las de tus alertas, cada 5",
          "**Dos comprobaciones para contar:** una respuesta errónea de apple.com nunca se convierte en una reposición o un agotamiento falsos",
          `**Cada cambio confirmado** va al [registro de reposiciones](${i.restocksPath}), que alimenta los gráficos de reposición de ${i.index?.indexable ? `[las páginas de cada tienda](${i.index.path})` : "la página de la tienda"}`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, pais(cc)),
    {
      id: "alerts",
      h2: `Alertas de stock de ${k === 1 ? "el Apple Store" : "los Apple Store"} ${dePais(cc)}: avisos de reposición`,
      lead: `Consultar es gratis; lo que se paga es no tener que consultar. Elige ${k === 1 ? "el Apple Store" : "los Apple Store a los que puedes llegar"} y el iPhone exacto, y tu móvil recibe un aviso segundos después de que ${k === 1 ? "la tienda" : "cualquiera de esas tiendas"} lo ponga disponible para recogida.`,
      blocks: [
        { t: "ol", items: [
          "Toca **Avísame** y elige el iPhone, la capacidad y el color.",
          k === 1 ? `Marca la tienda: ${apple(stores[0])}, en ${cityLabel(cc, stores[0].city, L)}.` : "Marca las tiendas a las que puedes llegar; las más cercanas salen primero, con los kilómetros por carretera y el tiempo en coche.",
          "En un iPhone, añade PickupChecker a tu pantalla de inicio y permite las notificaciones ([cómo instalarla](/install)).",
          "Cuando llegue el aviso, abre apple.com desde él y paga eligiendo «Recogida» en esa tienda.",
        ] },
        { t: "table", head: ["Plan", "Precio (USD)", "Alertas"], rows: [["Plus", "$5 / mes", "10"], ["Pro", "$10 / mes", "20"], ["Max", "$20 / mes", "50"]], caption: "Una alerta = una tienda × una configuración exacta · consultar es gratis ([precios](/pricing))" },
        { t: "note", text: "**Nuestra opinión:** el Duo merece alertas en todas las tiendas a las que puedas llegar; para el 18 Pro y el Pro Max, mira antes los datos en directo." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(cc).length;
  const p = cc === "us" ? "" : `/${cc}`;
  const when = rt.n === 0
    ? `Aún no hay ninguna confirmada desde que empezó el seguimiento, el 2 de noviembre. [¿Cuándo repone Apple el iPhone Duo ${enPais(cc)}?](${rt.path}) las cuenta por hora local y por día a medida que llegan.`
    : rt.peakHour != null
      ? `La mayoría llega hacia **${lasH(rt.peakHour)}, hora local**: ${reposiciones(rt.n)} confirmadas en ${n(rt.stores)} de ${tiendas(rt.storesTotal)} desde el 2 de noviembre. [Hora a hora y día a día](${rt.path}).`
      : `${cap(reposiciones(rt.n))} confirmadas en ${n(rt.stores)} de ${tiendas(rt.storesTotal)} desde el 2 de noviembre, en muy pocos días para señalar una hora habitual. [Hora a hora y día a día](${rt.path}).`;
  return [
    { q: `¿Qué Apple Store ${dePais(cc)} tienen ahora el iPhone Duo?`, a: `{{duo.storesNow}} de ${n(k)} en la última comprobación ({{asOf}}). [Stock del iPhone Duo ${enPais(cc)}](${p}/stock/iphone-duo) muestra cada tienda y configuración, actualizado cada 15 segundos.` },
    { q: `¿Cuándo repone Apple el iPhone Duo ${enPais(cc)}?`, a: when },
    { q: "¿Cuánto tardan las alertas?", a: `Las tiendas de tus alertas se comprueban cada 5 segundos, y todos los Apple Store ${dePais(cc)}, cada 15. Un primer «disponible» se vuelve a comprobar en menos de un segundo para que un fallo de Apple nunca se convierta en alerta, y el aviso llega a tu móvil unos 3 segundos después.` },
    { q: "¿Cuánto cuesta?", a: "El stock en directo, el mapa y el registro de reposiciones son gratis. Las alertas: Plus, $5 al mes por 10; Pro, $10 por 20, y Max, $20 por 50, con cobro en dólares estadounidenses. Cancela cuando quieras ([precios](/pricing))." },
    taxFaq(cc, pais(cc)),
    { q: "¿Me podéis reservar el móvil?", a: `No. Te avisamos en cuanto una tienda lo pone disponible; lo compras en apple.com eligiendo «Recogida» y Apple te lo guarda ([ayuda de Apple sobre la recogida](${pickupHelp(cc).url})).` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker: stock de iPhone ${enPais(cc)}`,
  offer: "Stock en directo, mapa y registro de reposiciones gratis; alertas desde $5 al mes",
  itemList: (cc: CountryCode) => `Apple Store ${dePais(cc)}`,
  restockTimesChip: "Cuándo repone",
  storesByRegion: (cc: CountryCode) => `Tiendas por ${noun(COUNTRIES[cc]).one}`,
  browse: (cc: CountryCode) => `Explora el stock ${enPais(cc)}`,
  selloutH2: (cc: CountryCode) => `¿Cuánto tardan en agotarse las reposiciones de iPhone ${enPais(cc)}?`,
  selloutLabel: (cc: CountryCode) => `en los Apple Store ${dePais(cc)}`,
  last24Label: (cc: CountryCode) => enPais(cc),
  newsroom: "Apple Newsroom: el iPhone Duo llega a los Apple Store de todo el mundo (23 de octubre de 2026)",
};

/** "Apple Puerta del Sol: stock de iPhone hoy, recogida y horario"; a store named after its city reads "Apple Store Valencia". */
function storeTitle(s: Store, region?: string): string {
  const city = cityLabel(s.country ?? "us", s.city, L);
  const own = apple(s);
  const name = own === `Apple ${city}` ? `Apple Store ${city}` : own;
  const shown = region && !name.toLowerCase().includes(region.toLowerCase()) ? region : null;
  return fitTitleW(content.titles.store(name, shown));
}

/** Apple's pages in Spanish (same URLs: apple.com/es serves them in Spanish), the tax page in Spanish where one exists. */
function sources(code: Exclude<CountryCode, "us">) {
  const help = pickupHelp(code);
  const listSrc = storeListSource(code);
  return {
    pickupHelp: { label: `Apple: ayuda de envío y recogida (${pais(code)}): qué llevar al recoger`, url: help.url },
    storeList: { label: `Apple: lista de tiendas (${pais(code)})`, url: listSrc.url },
    tax: taxSource(code),
  };
}

export const place: Dict["place"] = {
  sinceWhen,
  /** Spanish readers know which Valencia: no country suffix. */
  placeLabel: (_cc: CountryCode, name: string) => name,
  whenIn,
  taxSentence,
  priceSection,
  taxFaq,
  placeTitle,
  placeDescription,
  placeIntro,
  placeSections,
  storesIndexTitle,
  homeTitle,
  homeH1,
  allStoresPhrase,
  spreadPhrase,
  modelPageTitles,
  modelIntro,
  modelDescription,
  modelRows,
  homeDescription,
  homeIntro,
  homeSections,
  homeFaq,
  home: homeLabels,
  storeTitle,
  sources,
};
