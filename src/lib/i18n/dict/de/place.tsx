/**
 * German strings: place — the copy builders of the country pages (Germany, Austria, Switzerland in German; any
 * other country a German reader opens reads the same builders). Same arguments and shapes as
 * lib/seo/countryCopy.ts; every sentence is built from the country's live stock, restock log, apple.com prices
 * and its tax rule. Titles lead with what people type ("Apple Stores in München", "iPhone Duo Preis").
 */
import type { Dict } from "../en";
import * as cc from "@/lib/seo/countryCopy";
import type { HomeCopyInput, IntlPlaceInput, RestockTimesBrief } from "@/lib/seo/countryCopy";
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { alertHref, fmtDuration, type FaqItem } from "@/lib/seo/enrich";
import type { Block, Faq, Source } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import { list, stamp } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, regionLabel } from "@/lib/i18n/places";
import { content } from "./content";
import { LANG, dativ, fitDe, inLand, inOrt, land, modelDe, money, n, pct, plural, regionWord, satz, steuer, taxNote, uhr } from "./util";

const C = (code: CountryCode) => COUNTRIES[code];
const apple = (s: Store) => appleStoreLabel(s, LANG);
const words = (items: string[], max = 6) => list(LANG, items, max, (k) => `${n(k)} weitere`);
const hat = (k: number) => (k === 1 ? "hat" : "haben");
/** "Keiner der 16 Stores", "Keiner der beiden Stores". */
const keinerDer = (k: number) => `Keiner der ${k === 2 ? "beiden" : n(k)} Stores`;
const mal = (k: number) => (k === 1 ? "einmal" : `${n(k)}-mal`);
/** A place of an IntlPlaceInput in German ("Bavaria" → "Bayern", "Munich" → "München"). */
/** Swiss region pages are cantons ("Kanton Zürich" holds Wallisellen too), so they say so. */
const nameOf = (i: IntlPlaceInput) => (i.kind === "state" ? `${i.cc === "ch" ? "Kanton " : ""}${regionLabel(i.cc, i.name, LANG)}` : cityLabel(i.cc, i.name, LANG));

function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${cc.INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "seit Beginn der Erfassung am 2. November" : "in den letzten 30 Tagen";
}
const SinceWhen = () => { const s = sinceWhen(); return s[0].toUpperCase() + s.slice(1); };

function placeLabel(code: CountryCode, name: string): string {
  return cc.placeLabel(code, name) === name ? name : `${name}, ${land(code)}`;
}

function whenIn(code: CountryCode, iso: string | Date): string {
  return stamp(LANG, iso, C(code).timeZone, true);
}

/* ------------------------------------------------------------------ tax */

function taxSentence(code: CountryCode, region?: string): string {
  const c = C(code);
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `Apples ${money(c, duo)} für ein iPhone Duo 256GB verstehen sich ohne Steuer; mit ${pct(t.rate)} ${CA_PROVINCE_TAX[region!].label} in ${region} sind es etwa ${money(c, t.total)}.`;
    return `Apples ${money(c, duo)} für ein iPhone Duo 256GB verstehen sich ohne Steuer: Je nach Provinz kommen 5 % bis 15 % dazu.`;
  }
  const t = steuer(c);
  if (t.rate == null) return `Ein iPhone Duo 256GB kostet ${money(c, duo)}; Hongkong erhebt keine Umsatzsteuer, das zahlen Sie also auch bei der Abholung.`;
  return `Ein iPhone Duo 256GB kostet ${inLand(code)} ${money(c, duo)} inkl. ${pct(t.rate)} ${t.name}: Der Preis auf apple.com ist der Preis bei der Abholung.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** The tax authority in German where it publishes in German (EU: Your Europe; Switzerland: ESTV). */
const EU_DE: Source = { label: "Ihr Europa (EU): MwSt-Vorschriften und -Sätze in den Mitgliedstaaten", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_de.htm" };
const CH_DE: Source = { label: "Eidgenössische Steuerverwaltung (ESTV): Schweizer Mehrwertsteuersätze", url: "https://www.estv.admin.ch/estv/de/home/mehrwertsteuer/mwst-steuersaetze.html" };
function taxSource(code: Exclude<CountryCode, "us">): Source {
  if (code === "ch") return CH_DE;
  if (TAX_SOURCES[code].url === TAX_SOURCES.de.url) return EU_DE;
  return TAX_SOURCES[code];
}

function priceSection(code: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = C(code);
  const m = modelByKey(model)!;
  const base = cc.priceOf(code, model) ?? 0;
  const src = taxSource(code as Exclude<CountryCode, "us">);
  const shop = `apple.com/${c.buyPath ?? c.shopPath}`;
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = cc.priceOf(code, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (code === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const table: Block = {
        t: "table",
        head: ["iPhone", "Preis auf apple.com", `Mit ${pct(t.total)} ${t.label}`],
        rows: rows.map(([label, p]) => [label, money(c, p), money(c, withProvinceTax(p, region!)!.total)]),
        caption: `${region}: Apples kanadischer Preis plus ${t.label} (${pct(t.total)})`,
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); Preise von apple.com/ca`,
      };
      return {
        id: "price-with-tax",
        h2: `${m.name} Preis ${inOrt(placeName)} mit Steuern`,
        lead: `Das ${m.name} 256GB kostet **${money(c, base)} vor Steuern**; mit der Steuer von ${region} (${pct(t.total)}) sind es in einem Store ${inOrt(placeName)} etwa **${money(c, withProvinceTax(base, region!)!.total)}**.`,
        blocks: [{ t: "note", text: "**Besteuert wird am Abholort:** Die Provinz des Stores bestimmt den Satz, nicht Ihre Wohnadresse." }, table],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `${m.name} Preis in Kanada mit Steuern, nach Provinz`,
      lead: `Apples **${money(c, base)}** für das ${m.name} 256GB sind ohne Steuer; die Provinz des Abhol-Stores schlägt sie auf, von **${money(c, withProvinceTax(base, cheapest)!.total)}** in ${cheapest} (${pct(CA_PROVINCE_TAX[cheapest].total)}) bis **${money(c, withProvinceTax(base, dearest)!.total)}** in ${dearest} (${pct(CA_PROVINCE_TAX[dearest].total)}).`,
      blocks: [{
        t: "table",
        head: ["Provinz", "Steuer", "Satz", `${m.short} 256GB mit Steuer`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, pct(CA_PROVINCE_TAX[p].total), money(c, withProvinceTax(base, p)!.total)]),
        caption: "Provinzen mit Apple Store: Steuer bei Abholung im Store",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); Preise von apple.com/ca`,
      }],
    };
  }
  const t = steuer(c);
  const r = t.rate;
  return {
    id: "price",
    h2: `${m.name} Preis ${inLand(code)}: ${money(c, base)}, ${taxNote(c)}`,
    lead: r == null
      ? `**${money(c, base)}** für das ${m.name} 256GB auf apple.com zahlen Sie auch bei der Abholung ${inOrt(placeName)}: Hongkong hat **keine Umsatzsteuer**.`
      : `Das ${m.name} 256GB kostet ${inLand(code)} **${money(c, base)}**, **inkl. ${pct(r)} ${t.name}** (${money(c, beforeTax(c, base))} netto); bei der Abholung ${inOrt(placeName)} kommt nichts dazu.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "Preis auf apple.com"] : ["iPhone", "Preis auf apple.com", `Ohne ${pct(r)} ${t.name}`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(c, p)] : [label, money(c, p), money(c, beforeTax(c, p))])),
      caption: `Apples Preise ${inLand(code)}${r == null ? "" : `, inkl. ${t.name}`}`,
      source: `[${src.label}](${src.url}); Preise von ${shop}`,
    }],
  };
}

function taxFaq(code: CountryCode, placeName: string, region?: string): FaqItem {
  const c = C(code);
  const duo = cc.priceOf(code, "duo") ?? 0;
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `Was kostet das iPhone Duo mit Steuern ${inOrt(placeName)}?`, a: `Etwa ${money(c, t.total)} für das 256GB-Modell: Apples ${money(c, duo)} plus ${pct(t.rate)} ${CA_PROVINCE_TAX[region!].label} in ${region}, berechnet am Abholort.` }
      : { q: "Ist die Steuer in Apples kanadischem Preis enthalten?", a: `Nein. Das iPhone Duo 256GB kostet ${money(c, duo)} vor Steuern; GST, HST oder Provinzsteuer kommt je nach Provinz des Stores dazu, von 5 % in Alberta bis 14,975 % in Quebec.` };
  }
  const t = steuer(c);
  return t.rate == null
    ? { q: "Gibt es in Hongkong Umsatzsteuer auf ein iPhone?", a: `Nein. Hongkong erhebt keine Umsatz- oder Mehrwertsteuer, das iPhone Duo 256GB kostet bei der Abholung also ${money(c, duo)} – genau den Preis auf apple.com.` }
    : { q: `Ist die ${t.name} im apple.com-Preis ${inLand(code)} enthalten?`, a: `Ja. ${money(c, duo)} für das iPhone Duo 256GB enthalten ${pct(t.rate)} ${t.name}; bei der Abholung im Store kommt nichts dazu.` };
}

/* ------------------------------------------------------------------ region / city pages */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeLabel(i.cc, nameOf(i));
  return fitDe([
    `Apple Stores ${inOrt(w)}: iPhone-Duo-Verfügbarkeit in ${k === 2 ? "beiden" : `allen ${n(k)}`} live`,
    `Apple Stores ${inOrt(w)}: iPhone-Duo-Verfügbarkeit live`,
    `Apple Stores ${inOrt(w)}: iPhone-Verfügbarkeit`,
    `Apple Store ${w}: iPhone-Verfügbarkeit`,
  ], 60, i.cc);
}

function priceBit(code: CountryCode, region?: string): string {
  const c = C(code);
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, etwa ${money(c, t.total)} mit Steuer in ${region}` : `, ${money(c, duo)} vor Steuern`; }
  return `, ${money(c, duo)} ${taxNote(c)}`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = placeLabel(i.cc, nameOf(i));
  const duo = i.stockNow.duo, pm = i.stockNow["18-pro-max"];
  return fitDe([
    satz(`${n(k)} Apple Stores ${inOrt(w)}: ${duo} ${hat(duo)} das iPhone Duo jetzt zur Abholung, ${pm} das 18 Pro Max. Live je Store, Restock-Zeiten${priceBit(i.cc, i.region)}`),
    `${n(k)} Apple Stores ${inOrt(w)}: ${duo} mit iPhone Duo zur Abholung, ${pm} mit 18 Pro Max. Live je Store, Restock-Zeiten.`,
  ], 155, i.cc);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `, verteilt auf ${plural(i.cities, "Stadt", "Städte")}` : "";
  const duo = i.stockNow.duo;
  return `**${plural(k, "Apple Store", "Apple Stores")}** ${inOrt(nameOf(i))}${cities}: **${duo}** ${hat(duo)} gerade ein iPhone Duo zur Abholung, **${i.stockNow["18-pro-max"]}** das 18 Pro Max, **${i.stockNow["18-pro"]}** das 18 Pro.`;
}

function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${have.length} von ${n(k)} Stores** ${hat(have.length)} gerade ein iPhone Duo: ${words(have.map(apple), 4)}.`;
  if (st.month > 0) return `**${keinerDer(k)}** hat gerade ein iPhone Duo – ${sinceWhen()} war es dort aber schon **${mal(st.month)}** wieder vorrätig.`;
  return `**${keinerDer(k)}** hat gerade ein iPhone Duo, und ${sinceWhen()} gab es dort noch keinen Duo-Restock.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${SinceWhen()}:** ${plural(st.month, "Duo-Restock", "Duo-Restocks")} in den Stores hier`);
  if (st.lastRestock && last) items.push(`**Letzter Restock:** ${whenIn(i.cc, st.lastRestock.at)} bei ${apple(last)}`);
  if (st.medianMs != null) items.push(`**Typische Dauer:** Ein wieder verfügbares Duo blieb im Median etwa ${fmtDuration(st.medianMs, LANG)} gelistet`);
  const which = k <= 3 ? "die Stores hier, die Sie erreichen" : `die ${Math.min(k, 5)} nächsten Stores, die Sie erreichen`;
  items.push(`**Schnellster Weg:** [iPhone-Duo-Alarm ${inOrt(w)} einrichten](${alert}) – für ${which}`);
  items.push("**Ein Alarm** = ein Store × eine exakte Konfiguration; der Push kommt Sekunden, nachdem ein Store sie anbietet");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**Das kann sich in einer Minute ändern:** Am schnellsten kommen Sie per Alarm an eins – nicht durch Neuladen von apple.com." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = nameOf(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = cc.scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  const pmNow = i.stockNow["18-pro-max"];
  return [
    {
      id: "iphone-duo",
      h2: `iPhone Duo ${inOrt(w)}: Welche Stores haben es jetzt?`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max ${inOrt(w)}: Verfügbarkeit je Store`,
      lead: `**${pmNow} von ${n(k)} Stores** ${hat(pmNow)} ein iPhone 18 Pro Max; von den ${n(k * pm)} Kombinationen aus Store und Konfiguration hier sind **${pct(cc.pairsPct(i, "18-pro-max"))}** vorrätig.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Gerade am knappsten:** ${words(scarce.map((x) => `${modelDe(x.label)} (${x.stores} von ${n(k)} Stores)`))}`] : []),
        `**iPhone 18 Pro:** in ${i.stockNow["18-pro"]} von ${n(k)} Stores, ${pct(cc.pairsPct(i, "18-pro"))} der Kombinationen vorrätig`,
        `**${SinceWhen()}:** ${i.max.month ? plural(i.max.month, "Restock des 18 Pro Max", "Restocks des 18 Pro Max") : "noch kein Restock des 18 Pro Max"}`,
        ...(i.max.medianMs != null ? [`**Typische Dauer:** Ein wieder verfügbares Pro Max blieb im Median etwa ${fmtDuration(i.max.medianMs, LANG)} gelistet`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  if (k === 1) return fitDe([`Apple Store ${inLand(code)}: iPhone-Verfügbarkeit live`, `Apple Store ${land(code)}: iPhone-Verfügbarkeit`], 70, code);
  return fitDe([
    `Apple Stores ${inLand(code)}: iPhone-Duo-Verfügbarkeit live in ${k === 2 ? "beiden" : `allen ${n(k)}`}`,
    `Apple Stores ${inLand(code)}: iPhone-Duo-Verfügbarkeit live`,
    `Apple Stores ${inLand(code)}: iPhone-Verfügbarkeit live`,
  ], 70, code);
}

function homeTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  if (k === 1) return fitDe([`iPhone Duo verfügbar? Der Apple Store ${inLand(code)} live`, `iPhone-Verfügbarkeit ${inLand(code)}: Apple Store live`], 60, code);
  return fitDe([
    `iPhone Duo verfügbar? Alle ${n(k)} Apple Stores ${inLand(code)} live`,
    `iPhone Duo verfügbar? ${n(k)} Apple Stores ${inLand(code)} live`,
    `iPhone-Verfügbarkeit: ${n(k)} Apple Stores ${inLand(code)}`,
  ], 60, code);
}

function homeH1(code: CountryCode): string {
  const k = storesOf(code).length;
  return k === 1 ? `iPhone-Verfügbarkeit prüfen – live im Apple Store ${inLand(code)}` : `iPhone-Verfügbarkeit prüfen – live in allen ${n(k)} Apple Stores ${inLand(code)}`;
}

function allStoresPhrase(code: CountryCode): string {
  const k = storesOf(code).length;
  return k === 1 ? `der Apple Store ${inLand(code)}` : `alle ${n(k)} Apple Stores ${inLand(code)}`;
}

function spreadPhrase(code: CountryCode): string {
  const c = C(code);
  const regions = statesWithStores(code);
  const cities = citiesWithStores(code);
  const k = storesOf(code).length;
  const city = (x: string) => cityLabel(code, x, LANG);
  if (k === 1) return `in ${city(cities[0].name)}`;
  if (cities.length === 1) return `alle in ${city(cities[0].name)}`;
  const inCities = `in ${cities.length === 1 ? "einer Stadt" : `${n(cities.length)} Städten`}`;
  if (!c.regionNoun || regions.length === 1) return inCities;
  return `${inCities} in ${n(regions.length)} ${dativ(regionWord(c, true))}`;
}

function modelPageTitles(code: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const all = k === 1 ? "im Apple Store" : k === 2 ? "in beiden Apple Stores" : `in allen ${n(k)} Apple Stores`;
  return {
    title: fitDe([`${m.name} verfügbar? Live ${all} ${inLand(code)}`, `${m.name}: Verfügbarkeit ${inLand(code)} live`, `${m.name} Verfügbarkeit ${land(code)}`], 70, code),
    h2: [`${m.name} in meiner Nähe: Welche Stores ${inLand(code)} haben es jetzt?`, priceSection(code, land(code), undefined, model).h2],
  };
}

function modelIntro(code: CountryCode, model: ModelKey, inStock: number): string {
  const c = C(code);
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = cc.priceRange(code, model);
  const price = code === "ca" ? `**${money(c, r.low)}** vor Steuern` : `**${money(c, r.low)}**, ${taxNote(c)}`;
  const now = k === 1
    ? (inStock === 0 ? `Der Apple Store ${inLand(code)} hat das ${m.name} gerade **nicht** zur Abholung` : `Der Apple Store ${inLand(code)} hat das ${m.name} **gerade zur Abholung**`)
    : inStock === 0
      ? `**Keiner** der ${n(k)} Apple Stores ${inLand(code)} hat das ${m.name} gerade zur Abholung`
      : `**${inStock} von ${n(k)}** Apple Stores ${inLand(code)} ${hat(inStock)} das ${m.name} gerade zur Abholung`;
  return satz(`${now} (geprüft **alle 15 Sekunden**); Preise ab ${price}`);
}

function modelDescription(code: CountryCode, model: ModelKey, inStock: number): string {
  const c = C(code);
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = cc.priceRange(code, model);
  const from = `ab ${money(c, r.low)}${code === "ca" ? " vor Steuern" : ""}`;
  if (k === 1) {
    const now = inStock > 0 ? "hat es jetzt zur Abholung" : "hat es gerade nicht zur Abholung";
    return fitDe([
      `Ist das ${m.name} ${inLand(code)} verfügbar? Der Apple Store ${inLand(code)} ${now}. Live je Konfiguration, ${from}, mit Restock-Zeiten und Alarm.`,
      `${m.name} ${inLand(code)}: Der Apple Store ${now}. Live je Konfiguration, Restock-Zeiten und Alarm.`,
    ], 155, code);
  }
  return fitDe([
    `Ist das ${m.name} ${inLand(code)} verfügbar? ${inStock} von ${n(k)} Apple Stores ${hat(inStock)} es jetzt zur Abholung. Live je Store und Konfiguration, ${from}, mit Restock-Zeiten.`,
    `${m.name} ${inLand(code)}: ${inStock} von ${n(k)} Apple Stores ${hat(inStock)} es jetzt. Live-Verfügbarkeit je Store und Konfiguration, Restock-Zeiten, Alarme.`,
  ], 155, code);
}

function modelRows(code: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = code === "us" ? "" : `/${code}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, n(catalogFor(m.key, code).length), n(storesNow[m.key] ?? 0), n(restocks[m.key] ?? 0)]);
}

/* ------------------------------------------------------------------ country home */

function homeDescription(code: CountryCode): string {
  const c = C(code);
  const k = storesOf(code).length;
  const where = k === 1 ? `im Apple Store ${inLand(code)}` : `in allen ${n(k)} Apple Stores ${inLand(code)}`;
  const times = k === 1 ? "" : "Restock-Zeiten, ";
  return fitDe([
    `iPhone Duo, 18 Pro, Pro Max: Verfügbarkeit ${where}, live alle 15 Sekunden. ${times}Preise in ${c.currency}, Push bei Nachschub.`,
    `iPhone Duo, 18 Pro, Pro Max: Verfügbarkeit ${where}, live alle 15 Sekunden. ${times}Preise, Push bei Nachschub.`,
    `iPhone-Verfügbarkeit ${where}, live alle 15 Sekunden, mit Restock-Zeiten und Push bei Nachschub.`,
  ], 155, code);
}

function homeIntro(code: CountryCode): string {
  const k = storesOf(code).length;
  return `Gerade ist das iPhone Duo in **{{duo.storesNow}} von ${n(k)}** Apple ${k === 1 ? "Store" : "Stores"} ${inLand(code)} zur Abholung vorrätig, das iPhone 18 Pro in **{{pro.storesNow}}** und das iPhone 18 Pro Max in **{{pm.storesNow}}**.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const code = i.cc;
  const c = C(code);
  const k = storesOf(code).length;
  const stores = storesOf(code);
  return [
    {
      id: "iphone-stock",
      h2: `iPhone-Verfügbarkeit ${inLand(code)}: Duo, 18 Pro und Pro Max je Store`,
      lead: `PickupChecker liest alle 15 Sekunden die Verfügbarkeit zur Abholung auf apple.com – für jede Konfiguration ${k === 1 ? `im Apple Store ${inLand(code)}` : `in allen ${n(k)} Apple Stores ${inLand(code)}`}, je Store${k > 1 ? `, je ${c.regionNoun ? regionWord(c) : "Stadt"}` : ""} und je Konfiguration.`,
      blocks: [
        { t: "table", head: ["Modell", "Konfigurationen", "Stores mit Bestand jetzt", "Erfasste Restocks"], rows: modelRows(code, i.storesNow, i.restocks), caption: `Was die Prüfung ${inLand(code)} abdeckt, Stand {{asOf}}` },
        { t: "ul", items: [
          `**Abdeckung:** ${spreadPhrase(code)} · Preise und Teilenummern wie bei Apple ${land(code)}`,
          "**Jeder Store alle 15 Sekunden**, die Stores Ihrer Alarme alle 5",
          "**Zwei Prüfungen, bevor es zählt:** Eine fehlerhafte Antwort von apple.com wird nie zum falschen Restock oder Ausverkauf",
          `**Jede bestätigte Änderung** landet im [Restock-Protokoll](${i.restocksPath}) und speist die Restock-Diagramme auf ${i.index?.indexable ? `[den Store-Seiten](${i.index.path})` : "der Store-Seite"}`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(code, land(code)),
    {
      id: "alerts",
      h2: `Verfügbarkeit im Apple Store prüfen – ${inLand(code)} mit Restock-Alarm`,
      lead: `Prüfen ist kostenlos; bezahlt wird dafür, nicht mehr prüfen zu müssen. Wählen Sie ${k === 1 ? "den Apple Store" : "die Apple Stores, die Sie erreichen,"} und das genaue iPhone – Ihr Handy bekommt einen Push, Sekunden nachdem ${k === 1 ? "der Store" : "einer dieser Stores"} es zur Abholung im Store anbietet.`,
      blocks: [
        { t: "ol", items: [
          "Tippen Sie auf **Alarm stellen** und wählen Sie iPhone, Speicher und Farbe.",
          k === 1 ? `Kreuzen Sie den Store an: ${apple(stores[0])} in ${cityLabel(code, stores[0].city, LANG)}.` : "Kreuzen Sie die Stores an, die Sie erreichen; die nächsten stehen oben, mit Kilometern auf der Straße und Fahrzeit.",
          "Auf dem iPhone: PickupChecker zum Home-Bildschirm hinzufügen und Mitteilungen erlauben ([Anleitung](/install)).",
          "Kommt der Push, öffnen Sie daraus apple.com und kaufen mit Abholung in genau diesem Store.",
        ] },
        { t: "table", head: ["Tarif", "Preis (USD)", "Alarme"], rows: [["Plus", "$5 / Monat", "10"], ["Pro", "$10 / Monat", "20"], ["Max", "$20 / Monat", "50"]], caption: "Ein Alarm = ein Store × eine exakte Konfiguration · Stöbern ist kostenlos ([Preise](/pricing))" },
        { t: "note", text: "**Unsere Meinung:** Das Duo ist einen Alarm in jedem Store wert, den Sie erreichen; beim 18 Pro und Pro Max erst die Live-Zahlen ansehen." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(code: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(code).length;
  const p = code === "us" ? "" : `/${code}`;
  const when = rt.n === 0
    ? `Seit Beginn der Erfassung am 2. November noch keiner bestätigt. [Wann ist das iPhone Duo ${inLand(code)} wieder verfügbar?](${rt.path}) zählt jeden nach Ortszeit und Tag, sobald er kommt.`
    : rt.peakHour != null
      ? `Die meisten kommen gegen **${uhr(rt.peakHour)} Ortszeit**: ${n(rt.n)} bestätigte Restocks in ${rt.stores} von ${rt.storesTotal} Stores seit dem 2. November. [Stunde für Stunde und Tag für Tag](${rt.path}).`
      : `${n(rt.n)} bestätigte Restocks in ${rt.stores} von ${rt.storesTotal} Stores seit dem 2. November – an zu wenigen Tagen, um schon eine typische Uhrzeit zu nennen. [Stunde für Stunde und Tag für Tag](${rt.path}).`;
  return [
    k === 1
      ? { q: `Hat der Apple Store ${inLand(code)} das iPhone Duo gerade?`, a: `Live-Stand ({{asOf}}): **{{duo.storesNow}} von 1** Store. [iPhone-Duo-Verfügbarkeit ${inLand(code)}](${p}/stock/iphone-duo) zeigt jede Konfiguration, aktualisiert alle 15 Sekunden.` }
      : { q: `Welche Apple Stores ${inLand(code)} haben das iPhone Duo gerade?`, a: `{{duo.storesNow}} von ${n(k)} bei der letzten Prüfung ({{asOf}}). [iPhone-Duo-Verfügbarkeit ${inLand(code)}](${p}/stock/iphone-duo) nennt jeden Store und jede Konfiguration, aktualisiert alle 15 Sekunden.` },
    { q: `Wann ist das iPhone Duo ${inLand(code)} wieder verfügbar?`, a: when },
    { q: "Wie schnell sind die Alarme?", a: `Die Stores Ihrer Alarme prüfen wir alle 5 Sekunden, jeden Apple Store ${inLand(code)} alle 15. Ein erstes „verfügbar“ wird binnen einer Sekunde erneut geprüft, damit ein Apple-Aussetzer nie zum Alarm wird – der Push ist dann etwa 3 Sekunden später auf Ihrem Handy.` },
    { q: "Was kostet das?", a: "Live-Verfügbarkeit, Karte und Restock-Protokoll sind kostenlos. Alarme: Plus $5/Monat für 10, Pro $10 für 20 und Max $20 für 50, abgerechnet in US-Dollar; jederzeit kündbar ([Preise](/pricing))." },
    taxFaq(code, land(code)),
    { q: "Können Sie das iPhone für mich reservieren?", a: `Nein. Wir sagen Ihnen sofort, wenn ein Store es anbietet; Sie kaufen auf apple.com mit Abholung im Store, und Apple legt es für Sie zurück ([Apples Hilfe zur Abholung](${pickupHelp(code).url})).` },
  ];
}

const home: Dict["place"]["home"] = {
  appName: (code: CountryCode) => `PickupChecker iPhone-Verfügbarkeit ${land(code)}`,
  offer: "Live-Verfügbarkeit, Karte und Restock-Protokoll kostenlos; Alarme ab $5/Monat",
  itemList: (code: CountryCode) => `Apple Stores ${inLand(code)}`,
  restockTimesChip: "Wann wieder verfügbar?",
  storesByRegion: (code: CountryCode) => `Stores nach ${regionWord(C(code))}`,
  browse: (code: CountryCode) => `Verfügbarkeit ${inLand(code)} entdecken`,
  selloutH2: (code: CountryCode) => `Wie schnell sind iPhone-Restocks ${inLand(code)} ausverkauft?`,
  selloutLabel: (code: CountryCode) => `in den Apple Stores ${inLand(code)}`,
  last24Label: (code: CountryCode) => inLand(code),
  newsroom: "Apple Newsroom: Das iPhone Duo kommt in die Apple Stores weltweit (23. Oktober 2026)",
};

function storeTitle(s: Store, region?: string): string {
  const name = apple(s);
  const shown = region && !s.name.toLowerCase().includes(region.toLowerCase()) && !name.toLowerCase().includes(region.toLowerCase()) ? region : null;
  return fitDe(content.titles.store(name, shown), 60, s.country);
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel,
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
  home,
  storeTitle,
  sources: (code: Exclude<CountryCode, "us">) => ({
    pickupHelp: { label: `Apple: Hilfe zu Versand und Abholung (${land(code)}) – was Sie zur Abholung mitbringen`, url: pickupHelp(code).url },
    storeList: { label: `Apple: Liste aller Apple Stores (${land(code)})`, url: storeListSource(code).url },
    tax: taxSource(code),
  }),
};

