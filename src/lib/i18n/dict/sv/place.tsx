/**
 * Swedish strings: place — the copy builders of a country's page tree (English: lib/seo/countryCopy.ts), written
 * for /sv-se/…: titles that lead with what Swedes type ("apple store sverige", "apple mall of scandinavia",
 * "iphone duo pris"), Answer-First intros, keyword sections, the price/tax section (moms ingår) and FAQs.
 * Built for Sweden; the other countries' branches are kept so the functions stay complete.
 */
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { priceOf, priceRange, scarcest, pairsPct, duoStoresNow, type IntlPlaceInput, type HomeCopyInput, type RestockTimesBrief } from "@/lib/seo/countryCopy";
import { CA_PROVINCE_TAX, CA_TAX_SOURCE, TAX_SOURCES, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax } from "@/content/country-tax";
import { alertHref, type FaqItem } from "@/lib/seo/enrich";
import { stamp } from "@/lib/i18n/format";
import type { Block, Faq, Source } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import type { Dict } from "../en";
import { SV, apple, color, dur, fit, klock, kr, land, n, noun, pc, pl, taxNote, taxWord, words } from "./util";

const TRACKING_START = Date.parse("2026-11-02T00:00:00Z");

/** "sedan bevakningen startade den 2 november" while the 30-day window reaches back to the start, else "de senaste 30 dagarna". */
function sinceWhen(now = Date.now()): string {
  return now - TRACKING_START < 30 * 86400_000 ? "sedan bevakningen startade den 2 november" : "de senaste 30 dagarna";
}

/** "2 nov. 15:04 CET" in the country's zone. */
function whenIn(cc: CountryCode, iso: string | Date): string {
  return stamp(SV, iso, COUNTRIES[cc].timeZone, true);
}

/** The Stockholm stores: there is no Apple Store inside Stockholm city, Solna and Täby are where Stockholm shops. */
const STOCKHOLM = new Set(["R626", "R505"]);

/* ------------------------------------------------------------------ sources */

/** Apple's Swedish pages, and Your Europe's VAT page in Swedish. */
function sources(code: Exclude<CountryCode, "us">): { pickupHelp: Source; storeList: Source; tax: Source } {
  const help = pickupHelp(code);
  const list = storeListSource(code);
  const tax: Source = code === "se"
    ? { label: "Your Europe (EU): momssatser i EU-länderna", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_sv.htm" }
    : TAX_SOURCES[code];
  return {
    pickupHelp: { label: `Apple: hjälp om leverans och hämtning (${land(code)}) – vad du ska ta med när du hämtar`, url: help.url },
    storeList: { label: `Apple: butikslista (${land(code)})`, url: list.url },
    tax,
  };
}

/* ------------------------------------------------------------------ tax */

function taxSentence(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `Apples ${kr(cc, duo)} för en iPhone Duo med 256GB är utan skatt; med ${region}s ${pc(t.rate)} ${CA_PROVINCE_TAX[region!].label} blir det ungefär ${kr(cc, t.total)}.`;
    return `Apples ${kr(cc, duo)} för en iPhone Duo med 256GB är utan skatt: beroende på provins tillkommer 5–15 %.`;
  }
  const r = includedRate(c);
  if (r == null) return `En iPhone Duo med 256GB kostar ${kr(cc, duo)}, och eftersom Hongkong saknar moms är det vad du betalar vid hämtning.`;
  return `En iPhone Duo med 256GB kostar ${kr(cc, duo)} i ${land(cc)}, ${pc(r)} ${taxWord(c)} ingår: priset på apple.com är det du betalar när du hämtar i butik.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = priceOf(cc, model) ?? 0;
  const src = cc === "us" ? TAX_SOURCES.ca : sources(cc).tax;
  const shop = c.buyPath ?? c.shopPath;
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      return {
        id: "price-with-tax",
        h2: `${m.name} pris i ${placeName} med skatt`,
        lead: `${m.name} med 256GB kostar **${kr(cc, base)} utan skatt**; med ${region}s ${pc(t.total)} ${t.label} blir det ungefär **${kr(cc, withProvinceTax(base, region!)!.total)}** i en butik i ${placeName}.`,
        blocks: [
          { t: "note", text: "**Skatten tas ut där du hämtar:** butikens provins avgör skattesatsen, inte din hemadress." },
          { t: "table", head: ["iPhone", "Pris på apple.com", `Med ${pc(t.total)} ${t.label}`], rows: rows.map(([label, p]) => [label, kr(cc, p), kr(cc, withProvinceTax(p, region!)!.total)]), caption: `${region}: Apples kanadensiska pris plus ${t.label} (${pc(t.total)})`, source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); priser från apple.com/ca` },
        ],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    return {
      id: "price-with-tax",
      h2: `${m.name} pris i Kanada med skatt, per provins`,
      lead: `Apples **${kr(cc, base)}** för en ${m.name} med 256GB är utan skatt; provinsen där du hämtar lägger på mellan ${pc(5)} och ${pc(15)}.`,
      blocks: [{
        t: "table",
        head: ["Provins", "Skatt", "Sats", `${m.short} 256GB med skatt`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, pc(CA_PROVINCE_TAX[p].total), kr(cc, withProvinceTax(base, p)!.total)]),
        caption: "Provinser med Apple Store: skatt vid hämtning i butik",
        source: `[${CA_TAX_SOURCE.label}](${CA_TAX_SOURCE.url}); priser från apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tw = taxWord(c);
  return {
    id: "price",
    h2: `${m.name} pris i ${land(cc)}: ${kr(cc, base)}, ${taxNote(c)}`,
    lead: r == null
      ? `**${kr(cc, base)}** för ${m.name} med 256GB på apple.com är vad du betalar vid hämtning i ${placeName}: Hongkong har **ingen moms**.`
      : `${m.name} med 256GB kostar **${kr(cc, base)}** i ${land(cc)}, **${pc(r)} ${tw} ingår** (${kr(cc, beforeTax(c, base))} utan ${tw}), och inget läggs till när du hämtar i ${placeName}.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "Pris på apple.com"] : ["iPhone", "Pris på apple.com", `Utan ${pc(r)} ${tw}`],
      rows: rows.map(([label, p]) => (r == null ? [label, kr(cc, p)] : [label, kr(cc, p), kr(cc, beforeTax(c, p))])),
      caption: `Apples priser i ${land(cc)}${r == null ? "" : `, ${tw} ingår`}`,
      source: `[${src.label}](${src.url}); priser från apple.com/${shop}`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `Vad kostar iPhone Duo med skatt i ${placeName}?`, a: `Ungefär ${kr(cc, t.total)} för 256GB: Apples ${kr(cc, duo)} plus ${region}s ${pc(t.rate)} ${CA_PROVINCE_TAX[region!].label}, som tas ut där du hämtar.` }
      : { q: "Ingår skatten i Apples kanadensiska pris?", a: `Nej. iPhone Duo med 256GB kostar ${kr(cc, duo)} utan skatt; GST, HST eller provinsskatt läggs till efter butikens provins, från ${pc(5)} i Alberta till ${pc(14.975)} i Québec.` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: "Finns det moms på en iPhone i Hongkong?", a: `Nej. Hongkong har ingen moms, så iPhone Duo med 256GB kostar ${kr(cc, duo)} vid hämtning – exakt priset på apple.com.` }
    : { q: `Ingår ${taxWord(c) === "GST" ? "GST:n" : `${taxWord(c)}en`} i priset på apple.com i ${land(cc)}?`, a: `Ja. ${kr(cc, duo)} för iPhone Duo med 256GB inkluderar ${pc(r)} ${taxWord(c)}; inget läggs till när du hämtar den i butik.` };
}

/* ------------------------------------------------------------------ region / city pages */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = i.name;
  return fit([
    `Apple Store ${w}: iPhone Duo i lager i ${k === 2 ? "båda butikerna" : `alla ${k} butiker`}`,
    `Apple Store ${w}: iPhone Duo i lager, live`,
    `Apple Store ${w}: iPhone i lager idag`,
    `Apple Store ${w}: iPhone i lager`,
  ]);
}

function priceBit(cc: CountryCode, region?: string): string {
  const c = COUNTRIES[cc];
  const duo = priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, ca ${kr(cc, t.total)} med skatt` : `, ${kr(cc, duo)} utan skatt`; }
  return `, ${kr(cc, duo)} ${taxNote(c)}`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = i.name;
  return fit([
    `${k} Apple Store-butiker i ${w}: ${i.stockNow.duo} har iPhone Duo att hämta nu, ${i.stockNow["18-pro-max"]} har 18 Pro Max. Lager live per butik, påfyllningstider${priceBit(i.cc, i.region)}.`,
    `${k} Apple Store-butiker i ${w}: ${i.stockNow.duo} har iPhone Duo att hämta nu, ${i.stockNow["18-pro-max"]} har 18 Pro Max. Live per butik, påfyllningstider.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `, i ${pl(i.cities, "stad", "städer")}` : "";
  return `**${pl(k, "Apple Store", "Apple Store-butiker")}** i ${i.name}${cities}: **${i.stockNow.duo}** har iPhone Duo att hämta nu, **${i.stockNow["18-pro-max"]}** har 18 Pro Max och **${i.stockNow["18-pro"]}** har 18 Pro.`;
}

function duoLead(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${have.length} av ${k} butiker** har iPhone Duo just nu: ${words(have.map((s) => apple(s)), 4)}.`;
  if (st.month > 0) return `**Ingen av de ${k} butikerna** har iPhone Duo just nu, men de har fyllt på den **${pl(st.month, "gång", "gånger")}** ${sinceWhen()}.`;
  return `**Ingen av de ${k} butikerna** har iPhone Duo just nu, och ingen påfyllning av Duo har loggats ${sinceWhen()}.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const k = i.stores.length;
  const have = duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**Loggat ${sinceWhen()}:** ${pl(st.month, "påfyllning av Duo", "påfyllningar av Duo")} i butikerna här`);
  if (st.lastRestock && last) items.push(`**Senaste påfyllning:** ${whenIn(i.cc, st.lastRestock.at)} på ${apple(last)}`);
  if (st.medianMs != null) items.push(`**Typisk tid i lager:** en påfylld Duo låg ute i ungefär ${dur(st.medianMs)} (median)`);
  items.push(`**Snabbaste vägen:** [bevaka iPhone Duo i ${w}](${alert}) i ${k <= 3 ? "de butiker" : `de ${Math.min(k, 5)} närmaste butikerna`} du kan ta dig till`);
  items.push("**En bevakning** = en butik × en exakt konfiguration; notisen kommer sekunder efter att butiken listar den");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**Det kan ändras på en minut:** snabbaste sättet att få en är en bevakning, inte att uppdatera apple.com om och om igen." });
  blocks.push({ t: "ul", items });
  return blocks;
}

/** "256GB Night Sky" (scarcest's English label) → "256GB natthimmel". */
const cfg = (label: string) => { const [st, ...rest] = label.split(" "); return `${st} ${color(rest.join(" "))}`; };

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const k = i.stores.length;
  const w = i.name;
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  return [
    { id: "iphone-duo", h2: `iPhone Duo i ${w}: vilka butiker har den nu?`, lead: duoLead(i), blocks: duoPoints(i, w, alert) },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max i ${w}: lager per butik`,
      lead: `**${i.stockNow["18-pro-max"]} av ${k} butiker** har iPhone 18 Pro Max, och **${pc(pairsPct(i, "18-pro-max"))}** av de ${n(k * pm)} kombinationerna av butik × konfiguration finns i lager här.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Svårast att hitta just nu:** ${words(scarce.map((x) => `${cfg(x.label)} (${x.stores} av ${k} butiker)`))}`] : []),
        `**iPhone 18 Pro:** i ${i.stockNow["18-pro"]} av ${k} butiker, ${pc(pairsPct(i, "18-pro"))} av kombinationerna i lager`,
        `**Loggat ${sinceWhen()}:** ${i.max.month ? pl(i.max.month, "påfyllning av 18 Pro Max", "påfyllningar av 18 Pro Max") : "ingen påfyllning av 18 Pro Max ännu"}`,
        ...(i.max.medianMs != null ? [`**Typisk tid i lager:** en påfylld Pro Max låg ute i ungefär ${dur(i.max.medianMs)} (median)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  const w = land(cc);
  const towns = [...new Set(storesOf(cc).map((s) => (STOCKHOLM.has(s.storeNumber) ? "Stockholm" : s.city)))].sort((a, b) => (a === "Stockholm" ? -1 : b === "Stockholm" ? 1 : a.localeCompare(b, "sv")));
  return fit([
    ...(cc === "se" ? [`Apple Store Sverige: ${towns.join(" & ")} – iPhone Duo i lager live`] : []),
    `Apple Store ${w}: iPhone Duo i lager i ${k === 2 ? "båda butikerna" : `alla ${k} butiker`}`,
    `Apple Store ${w}: iPhone Duo i lager, live`,
    `Apple Store ${w}: iPhone i lager`,
  ], 70);
}

function homeTitle(cc: CountryCode): string {
  const k = storesOf(cc).length;
  const w = land(cc);
  return fit([
    `iPhone Duo i lager i ${w}? Live från ${k === 1 ? "Apple Store" : `alla ${k} Apple Store`}`,
    `iPhone Duo i lager i ${w}? Live från Apple Store`,
    `iPhone i lager i ${w}: live från Apple Store`,
  ]);
}

function homeH1(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `iPhone-lagerkoll för Apple Store i ${land(cc)}` : `iPhone-lagerkoll för alla ${k} Apple Store-butiker i ${land(cc)}`;
}

function allStoresPhrase(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return k === 1 ? `den enda Apple Store-butiken i ${land(cc)}` : `alla ${k} Apple Store-butiker i ${land(cc)}`;
}

function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const k = storesOf(cc).length;
  if (k === 1) return `i ${cities[0].name}`;
  if (cities.length === 1) return `alla i ${cities[0].name}`;
  if (cities.length <= 4) return `i ${words(cities.map((x) => x.name).sort((a, b) => a.localeCompare(b, "sv")))}`;
  if (!c.regionNoun || regions.length === 1) return `i ${pl(cities.length, "stad", "städer")}`;
  return `i ${pl(cities.length, "stad", "städer")} i ${regions.length} ${noun(c, regions.length !== 1)}`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const w = land(cc);
  const all = k === 1 ? "Apple Store" : k === 2 ? "båda Apple Store-butikerna" : `alla ${k} Apple Store-butiker`;
  return {
    title: fit([`${m.name} i lager i ${w}: live i ${all}`, `${m.name} i lager i ${w}: live`, `${m.name} i lager i ${w}`], 70),
    h2: [`${m.name} nära mig: butikerna i ${w} som har den nu`, priceSection(cc, w, undefined, model).h2],
  };
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  const priceText = cc === "ca" ? `**${kr(cc, r.low)}** utan skatt` : `**${kr(cc, r.low)}**, ${taxNote(c)}`;
  const now = inStock === 0
    ? (k === 1 ? `Apple Store-butiken i ${land(cc)} har **inte** ${m.name} att hämta just nu` : `**Ingen** av de ${k} Apple Store-butikerna i ${land(cc)} har ${m.name} att hämta just nu`)
    : `**${inStock} av ${k}** Apple Store-butiker i ${land(cc)} har ${m.name} att hämta just nu`;
  return `${now} (kollas **var 15:e sekund**); priser från ${priceText}.`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(cc).length;
  const r = priceRange(cc, model);
  return fit([
    `Finns ${m.name} i lager i ${land(cc)}? ${inStock} av ${k} Apple Store-butiker har den att hämta nu. Live per butik och konfiguration, från ${kr(cc, r.low)}${cc === "ca" ? " utan skatt" : ""}, med påfyllningstider.`,
    `${m.name} i ${land(cc)}: ${inStock} av ${k} Apple Store-butiker har den nu. Lager live per butik och konfiguration, påfyllningstider och bevakningar.`,
  ], 155);
}

function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, n(catalogFor(m.key, cc).length), n(storesNow[m.key] ?? 0), n(restocks[m.key] ?? 0)]);
}

/* ------------------------------------------------------------------ country home */

function homeDescription(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return fit([
    `Finns iPhone Duo, 18 Pro eller 18 Pro Max att hämta i ${allStoresPhrase(cc)}? Live var 15:e sekund, ${k === 1 ? "priser" : "påfyllningstider, priser"} och notis när din butik fyller på.`,
    `iPhone Duo, 18 Pro och 18 Pro Max att hämta i ${allStoresPhrase(cc)}, live var 15:e sekund. Notis när din butik fyller på.`,
  ], 155);
}

function homeIntro(cc: CountryCode): string {
  const k = storesOf(cc).length;
  return `Just nu finns iPhone Duo att hämta i **{{duo.storesNow}} av ${k}** ${k === 1 ? "Apple Store-butik" : "Apple Store-butiker"} i ${land(cc)}, iPhone 18 Pro i **{{pro.storesNow}}** och iPhone 18 Pro Max i **{{pm.storesNow}}**.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const k = storesOf(cc).length;
  const stores = storesOf(cc);
  const w = land(cc);
  const by = cc === "se" ? "stad" : c.regionNoun ? noun(c) : "stad";
  return [
    {
      id: "iphone-stock",
      h2: `iPhone i lager i ${w}: Duo, 18 Pro och Pro Max per butik`,
      lead: `PickupChecker läser av apple.com:s tillgänglighet för hämtning i butik för varje konfiguration i ${allStoresPhrase(cc)} var 15:e sekund – per butik${k > 1 ? `, per ${by}` : ""} och per konfiguration.`,
      blocks: [
        { t: "table", head: ["Modell", "Konfigurationer", "Butiker med lager nu", "Loggade påfyllningar"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `Det här bevakas i ${w}, per {{asOf}}` },
        { t: "ul", items: [
          `**Täckning:** ${spreadPhrase(cc)} · priser och artikelnummer är Apples egna för ${w}`,
          "**Varje butik var 15:e sekund**, butikerna du bevakar var 5:e",
          "**Två kontroller krävs:** ett felaktigt svar från apple.com blir aldrig en falsk påfyllning eller ett falskt slutsålt",
          `**Varje bekräftad ändring** hamnar i [påfyllningsloggen](${i.restocksPath}), som matar påfyllningsdiagrammen på ${i.index?.indexable ? `[butikssidorna](${i.index.path})` : "butikssidan"}`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, w),
    {
      id: "alerts",
      h2: `Lagerbevakning för Apple Store i ${w}: notis när iPhone fylls på`,
      lead: `Att kolla är gratis; det du betalar för är att slippa kolla. Välj ${k === 1 ? "Apple Store-butiken" : "de Apple Store-butiker"} du kan ta dig till och exakt vilken telefon, så får du en notis sekunder efter att ${k === 1 ? "butiken" : "någon av dem"} listar den för hämtning i butik.`,
      blocks: [
        { t: "ol", items: [
          "Tryck på **Bevaka** och välj iPhone, lagring och färg.",
          k === 1 ? `Bocka i butiken: ${apple(stores[0])} i ${stores[0].city}.` : "Bocka i butikerna du kan ta dig till; de närmaste visas först, med avstånd längs vägen i kilometer och körtid.",
          "På iPhone: lägg till PickupChecker på hemskärmen och tillåt notiser ([så installerar du](/install)).",
          "När notisen kommer: öppna apple.com från den och välj Hämta i butik i just den butiken i kassan.",
        ] },
        { t: "table", head: ["Plan", "Pris (USD)", "Bevakningar"], rows: [["Plus", "$5 / månad", "10"], ["Pro", "$10 / månad", "20"], ["Max", "$20 / månad", "50"]], caption: "En bevakning = en butik × en exakt konfiguration · att titta är gratis ([priser](/pricing))" },
        { t: "note", text: "**Vår bedömning:** Duo är värd en bevakning i varje butik du når; för 18 Pro och Pro Max, titta på siffrorna live först." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(cc).length;
  const p = cc === "us" ? "" : `/${cc}`;
  const w = land(cc);
  const when = rt.n === 0
    ? `Ingen bekräftad ännu sedan bevakningen startade den 2 november. [När fyller Apple på iPhone Duo i ${w}?](${rt.path}) räknar varje påfyllning per lokal timme och dag när de kommer.`
    : rt.peakHour != null
      ? `De flesta kommer runt **${klock(rt.peakHour)} lokal tid**: ${pl(rt.n, "bekräftad påfyllning", "bekräftade påfyllningar")} i ${rt.stores} av ${rt.storesTotal} butiker sedan 2 november. [Timme för timme och dag för dag](${rt.path}).`
      : `${pl(rt.n, "bekräftad påfyllning", "bekräftade påfyllningar")} i ${rt.stores} av ${rt.storesTotal} butiker sedan 2 november, på för få dagar för att peka ut en vanlig tid ännu. [Timme för timme och dag för dag](${rt.path}).`;
  return [
    { q: `Vilka Apple Store-butiker i ${w} har iPhone Duo just nu?`, a: `{{duo.storesNow}} av ${k} vid senaste kontrollen ({{asOf}}). [iPhone Duo i lager i ${w}](${p}/stock/iphone-duo) visar varje butik och konfiguration, uppdaterat var 15:e sekund.` },
    { q: `När fyller Apple på iPhone Duo i ${w}?`, a: when },
    { q: "Hur snabba är notiserna?", a: `Butikerna du bevakar kollas var 5:e sekund, alla Apple Store-butiker i ${w} var 15:e. Ett första ”tillgänglig” kontrolleras igen inom en sekund så att ett fel hos Apple aldrig blir en notis, och notisen når din telefon ungefär 3 sekunder efter det.` },
    { q: "Vad kostar det?", a: "Lagerstatus live, kartan och påfyllningsloggen är gratis. Bevakningar kostar Plus $5/månad för 10, Pro $10 för 20 och Max $20 för 50, debiteras i amerikanska dollar; avsluta när du vill ([priser](/pricing))." },
    taxFaq(cc, w),
    { q: "Kan ni reservera telefonen åt mig?", a: `Nej. Vi säger till i samma ögonblick som en butik listar den; du köper på apple.com med Hämta i butik, och Apple håller den åt dig ([Apples hjälp om hämtning](${pickupHelp(cc).url})).` },
  ];
}

const home: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker iPhone-lagerkoll ${land(cc)}`,
  offer: "Lagerstatus live, karta och påfyllningslogg är gratis; bevakningar från $5/månad",
  itemList: (cc: CountryCode) => `Apple Store-butiker i ${land(cc)}`,
  restockTimesChip: "När den fylls på",
  storesByRegion: (cc: CountryCode) => `Butiker per ${noun(COUNTRIES[cc])}`,
  browse: (cc: CountryCode) => `Utforska lagret i ${land(cc)}`,
  selloutH2: (cc: CountryCode) => `Hur snabbt tar påfyllda iPhone slut i ${land(cc)}?`,
  selloutLabel: (cc: CountryCode) => `i Apple Store-butikerna i ${land(cc)}`,
  last24Label: (cc: CountryCode) => `i ${land(cc)}`,
  newsroom: "Apple Newsroom: iPhone Duo kommer till Apple Store-butiker världen över (23 okt. 2026, på engelska)",
};

/**
 * Store page <title> and H1: the store first (what Swedes type: "apple mall of scandinavia", "apple täby centrum",
 * "apple emporia"), then the promise. The two Stockholm stores carry "Stockholm" ("apple store stockholm"), Täby leads
 * with "Apple Store Täby" ("apple store täby"); elsewhere the town follows in parentheses when it is the only store there.
 */
function storeTitle(s: Store, region?: string): string {
  const stockholm = STOCKHOLM.has(s.storeNumber);
  const name = s.storeNumber === "R505" ? "Apple Store Täby Centrum" : apple(s);
  const shown = stockholm ? ", Stockholm" : region && !name.toLowerCase().includes(region.toLowerCase()) ? ` (${region})` : "";
  return fit([
    `${name}${shown}: iPhone i lager idag, hämtning & öppettider`,
    `${name}${shown}: iPhone i lager idag & öppettider`,
    `${name}${shown}: iPhone i lager idag`,
    `${name}: iPhone i lager idag & öppettider`,
    `${name}: iPhone i lager idag`,
    `${name}: iPhone i lager`,
  ]);
}

export const place: Dict["place"] = {
  sinceWhen,
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
  home,
  storeTitle,
  sources,
};
