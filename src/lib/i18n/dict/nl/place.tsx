/**
 * Dutch strings: place — the copy builders of the country pages, written for the Netherlands (/nl-nl) and Belgium
 * (/nl-be): titles, Answer-First intros, keyword sections, price/btw sections and FAQs, from live numbers.
 * Same functions, arguments and return shapes as English (lib/seo/countryCopy.ts). Other countries get a correct
 * Dutch fallback (Canada's provincial tax, Hong Kong without VAT), though only NL and BE have Dutch pages.
 */
import * as CC from "@/lib/seo/countryCopy";
import type { IntlPlaceInput, HomeCopyInput, RestockTimesBrief } from "@/lib/seo/countryCopy";
import { CA_PROVINCE_TAX, beforeTax, includedRate, pickupHelp, storeListSource, withProvinceTax, TAX_SOURCES } from "@/content/country-tax";
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { alertHref, type FaqItem } from "@/lib/seo/enrich";
import type { KeywordSection } from "@/components/content/KeywordSections";
import type { Block, Faq, Source } from "@/lib/content/types";
import { num, pct, price, stamp, list, fitTitleW, hour, unit, secs } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, countryLabel, regionLabel } from "@/lib/i18n/places";
import type { Dict } from "../en";

const L = "nl" as const;
const money = (cc: CountryCode, v: number) => price(L, COUNTRIES[cc], v);
const n$ = (v: number) => num(L, v);
/** "Nederland", "België". */
const land = (cc: CountryCode) => countryLabel(cc, L);
/** "in Nederland", "in de Verenigde Staten", "in het Verenigd Koninkrijk". */
const ARTICLE: Partial<Record<CountryCode, string>> = { us: "de ", uk: "het ", ae: "de " };
const inC = (cc: CountryCode) => `in ${ARTICLE[cc] ?? ""}${land(cc)}`;
/** Apple's own store in the reader's language: NL apple.com/nl, Belgium's Dutch store apple.com/be-nl. */
const SHOP: Partial<Record<CountryCode, string>> = { nl: "nl", be: "be-nl" };
const shopOf = (cc: CountryCode) => SHOP[cc] ?? COUNTRIES[cc].buyPath ?? COUNTRIES[cc].shopPath;
/** The Dutch word for a country's regions (Dutch provinces, Belgian gewesten…). */
const NOUN: Record<string, [string, string]> = {
  state: ["staat", "staten"], province: ["provincie", "provincies"], area: ["gebied", "gebieden"], department: ["departement", "departementen"],
  prefecture: ["prefectuur", "prefecturen"], emirate: ["emiraat", "emiraten"], canton: ["kanton", "kantons"], region: ["gewest", "gewesten"],
  county: ["provincie", "provincies"], city: ["stad", "steden"],
};
const noun = (cc: CountryCode, many = false) => (NOUN[COUNTRIES[cc].regionNoun ?? "area"] ?? NOUN.area)[many ? 1 : 0];
/** The tax inside the price, in Dutch. */
const taxWord = (cc: CountryCode) => { const t = COUNTRIES[cc].taxNote; return /^VAT/.test(t) ? "btw" : /^GST/.test(t) ? "GST" : /^consumption/.test(t) ? "consumptiebelasting" : "btw"; };
/** "inclusief 21% btw", "zonder btw" (Hong Kong), "exclusief btw" (Canada, the US). */
const taxNote = (cc: CountryCode) => { const r = includedRate(COUNTRIES[cc]); return r == null ? (cc === "hk" ? "zonder btw" : "exclusief belasting") : `inclusief ${pct(L, r)} ${taxWord(cc)}`; };
/** A count with its noun. */
const cnt = (n: number, one: string, many: string) => `${n$(n)} ${n === 1 ? one : many}`;
/** "2 dagen", "1 u 5 min": how long a listing stayed up. */
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
/** A place named in Dutch (idempotent: a Dutch name passes through). */
const placeName = (i: IntlPlaceInput) => (i.kind === "city" ? cityLabel(i.cc, i.name, L) : regionLabel(i.cc, i.name, L));
const appleOf = (s: Store) => appleStoreLabel(s, L);
const fitT = (v: string[], max = 60) => fitTitleW(v, max);

/* ------------------------------------------------------------------ time */

/** "sinds we op 2 november begonnen te meten" while the 30-day window still reaches back to the start, else "in de afgelopen 30 dagen". */
function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${CC.INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "sinds we op 2 november begonnen te meten" : "in de afgelopen 30 dagen";
}
/** The short label of the same window: "Sinds 2 november" / "Laatste 30 dagen". */
const sinceShort = (now = Date.now()) => (now - Date.parse(`${CC.INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "Sinds 2 november" : "Laatste 30 dagen");

/** "3 nov, 10:05 CET" in the country's zone. */
function whenIn(cc: CountryCode, iso: string | Date): string {
  return stamp(L, iso, COUNTRIES[cc].timeZone, true);
}

/** A place that is also a US Apple Store city or state gets its country ("Manchester, Verenigd Koninkrijk"). */
function placeLabel(cc: CountryCode, name: string): string {
  return CC.placeLabel(cc, name) === name ? name : `${name}, ${land(cc)}`;
}

/* ------------------------------------------------------------------ tax */

function taxSentence(cc: CountryCode, region?: string): string {
  const duo = CC.priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `Apple vraagt ${money(cc, duo)} voor een iPhone Duo met 256GB, exclusief belasting; met ${pct(L, t.rate)} ${CA_PROVINCE_TAX[region!].label} van ${region} kom je op ongeveer ${money(cc, t.total)}.`;
    return `Apple vraagt ${money(cc, duo)} voor een iPhone Duo met 256GB, exclusief belasting: daar komt per provincie 5% tot 15% bij.`;
  }
  const r = includedRate(COUNTRIES[cc]);
  if (r == null) return `Een iPhone Duo met 256GB kost ${money(cc, duo)}, en zonder btw in Hongkong is dat precies wat je betaalt bij het ophalen.`;
  return `Een iPhone Duo met 256GB kost ${money(cc, duo)} ${inC(cc)}, inclusief ${pct(L, r)} ${taxWord(cc)}: de apple.com-prijs geldt ook bij ophalen.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

/** The EU's VAT page in Dutch, for the two Dutch-speaking countries; the English source elsewhere. */
function taxSource(cc: CountryCode): Source {
  if (cc === "nl" || cc === "be") return { label: "Your Europe (Europese Unie): btw-tarieven in de EU-lidstaten", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_nl.htm" };
  return TAX_SOURCES[cc as Exclude<CountryCode, "us">];
}

function priceSection(cc: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[cc];
  const m = modelByKey(model)!;
  const base = CC.priceOf(cc, model) ?? 0;
  const src = taxSource(cc);
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = CC.priceOf(cc, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  if (cc === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const table: Block = {
        t: "table",
        head: ["iPhone", "Prijs op apple.com", `Met ${pct(L, t.total)} ${t.label}`],
        rows: rows.map(([label, p]) => [label, money(cc, p), money(cc, withProvinceTax(p, region!)!.total)]),
        caption: `${region}: Apples Canadese prijs plus ${t.label} (${pct(L, t.total)})`,
        source: `[${src.label}](${src.url}); prijzen van apple.com/ca`,
      };
      return {
        id: "price-with-tax",
        h2: `${m.name} prijs in ${placeName} met belasting`,
        lead: `De ${m.name} met 256GB kost **${money(cc, base)} exclusief belasting**; met de belasting van ${region} (${pct(L, t.total)}) kom je in een winkel in ${placeName} op ongeveer **${money(cc, withProvinceTax(base, region!)!.total)}**.`,
        blocks: [{ t: "note", text: "**Belasting geldt waar je ophaalt:** de provincie van de winkel bepaalt het tarief, niet je woonadres." }, table],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `${m.name} prijs in Canada met belasting, per provincie`,
      lead: `Apples **${money(cc, base)}** voor een ${m.name} met 256GB is exclusief belasting; de provincie van de winkel telt die erbij, van **${money(cc, withProvinceTax(base, cheapest)!.total)}** in ${cheapest} (${pct(L, CA_PROVINCE_TAX[cheapest].total)}) tot **${money(cc, withProvinceTax(base, dearest)!.total)}** in ${dearest} (${pct(L, CA_PROVINCE_TAX[dearest].total)}).`,
      blocks: [{
        t: "table",
        head: ["Provincie", "Belasting", "Tarief", `${m.short} 256GB met belasting`],
        rows: provinces.map((p) => [p, CA_PROVINCE_TAX[p].label, pct(L, CA_PROVINCE_TAX[p].total), money(cc, withProvinceTax(base, p)!.total)]),
        caption: "Provincies met een Apple Store: belasting bij ophalen in de winkel",
        source: `[${src.label}](${src.url}); prijzen van apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxWord(cc);
  return {
    id: "price",
    h2: `${m.name} prijs ${inC(cc)}: ${money(cc, base)}, ${taxNote(cc)}`,
    lead: r == null
      ? `**${money(cc, base)}** voor de ${m.name} met 256GB op apple.com is wat je betaalt bij het ophalen in ${placeName}: Hongkong kent **geen btw**.`
      : `De ${m.name} met 256GB kost **${money(cc, base)}** ${inC(cc)}, **${pct(L, r)} ${tn} inbegrepen** (${money(cc, beforeTax(c, base))} zonder ${tn}). Bij het ophalen in ${placeName} komt er niets meer bij.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "Prijs op apple.com"] : ["iPhone", "Prijs op apple.com", `Zonder ${pct(L, r)} ${tn}`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(cc, p)] : [label, money(cc, p), money(cc, beforeTax(c, p))])),
      caption: `Prijzen van Apple ${inC(cc)}${r == null ? "" : `, ${tn} inbegrepen`}`,
      source: `[${src.label}](${src.url}); prijzen van apple.com/${shopOf(cc)}`,
    }],
  };
}

function taxFaq(cc: CountryCode, placeName: string, region?: string): FaqItem {
  const duo = CC.priceOf(cc, "duo") ?? 0;
  if (cc === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `Wat kost de iPhone Duo met belasting in ${placeName}?`, a: `Ongeveer ${money(cc, t.total)} voor 256GB: Apples ${money(cc, duo)} plus ${pct(L, t.rate)} ${CA_PROVINCE_TAX[region!].label} van ${region}, berekend waar je ophaalt.` }
      : { q: "Is de Canadese prijs van Apple inclusief belasting?", a: `Nee. De iPhone Duo met 256GB kost ${money(cc, duo)} exclusief belasting; GST, HST of provinciale belasting komt erbij volgens de provincie van de winkel, van 5% in Alberta tot ${pct(L, 14.975)} in Quebec.` };
  }
  const r = includedRate(COUNTRIES[cc]);
  return r == null
    ? { q: "Betaal je btw op een iPhone in Hongkong?", a: `Nee. Hongkong kent geen btw of omzetbelasting, dus de iPhone Duo met 256GB kost bij het ophalen ${money(cc, duo)}, precies de prijs op apple.com.` }
    : { q: `Is de prijs op apple.com ${inC(cc)} inclusief ${taxWord(cc)}?`, a: `Ja. De ${money(cc, duo)} voor de iPhone Duo met 256GB is inclusief ${pct(L, r)} ${taxWord(cc)}; bij het ophalen in de winkel komt er niets bij.` };
}

/* ------------------------------------------------------------------ region / city pages */

function placeTitle(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeLabel(i.cc, placeName(i));
  if (n === 1) return fitT([`Apple Store in ${w}: iPhone Duo-voorraad live`, `Apple Store in ${w}: iPhone-voorraad`, `Apple Store ${w}: iPhone-voorraad`]);
  return fitT([
    `Apple Stores in ${w}: iPhone Duo-voorraad live in ${n === 2 ? "beide" : `alle ${n}`}`,
    `Apple Stores in ${w}: iPhone Duo-voorraad live`,
    `Apple Stores in ${w}: iPhone-voorraad vandaag`,
    `Apple Stores ${w}: iPhone-voorraad`,
  ]);
}

/** The description's price clause. */
function priceBit(cc: CountryCode, region?: string): string {
  const duo = CC.priceOf(cc, "duo");
  if (duo == null) return "";
  if (cc === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, ca. ${money(cc, t.total)} met belasting` : `, ${money(cc, duo)} excl. belasting`; }
  const r = includedRate(COUNTRIES[cc]);
  return r == null ? `, ${money(cc, duo)}` : `, ${money(cc, duo)} incl. ${taxWord(cc)}`;
}

const yesNo = (v: number) => (v > 0 ? "ja" : "nee");

function placeDescription(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeLabel(i.cc, placeName(i));
  if (n === 1) {
    const one = appleOf(i.stores[0]);
    return fitT([
      `${one} in ${w}: iPhone Duo ${i.stockNow.duo ? "nu klaar om op te halen" : "nu niet op voorraad"}, 18 Pro Max ${i.stockNow["18-pro-max"] ? "wel" : "niet"}. Live voorraad, aanvultijden${priceBit(i.cc, i.region)}.`,
      `${one} in ${w}: live iPhone-voorraad om op te halen en aanvultijden.`,
    ], 155);
  }
  return fitT([
    `${cnt(n, "Apple Store", "Apple Stores")} in ${w}: ${n$(i.stockNow.duo)} met de iPhone Duo nu klaar om op te halen, ${n$(i.stockNow["18-pro-max"])} met de 18 Pro Max. Live per winkel, aanvultijden${priceBit(i.cc, i.region)}.`,
    `${cnt(n, "Apple Store", "Apple Stores")} in ${w}: ${n$(i.stockNow.duo)} met iPhone Duo-voorraad om op te halen, ${n$(i.stockNow["18-pro-max"])} met de 18 Pro Max. Live per winkel, aanvultijden.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const w = placeName(i);
  if (n === 1) return `**${appleOf(i.stores[0])}** is de enige Apple Store in ${w}. Nu op te halen: iPhone Duo **${yesNo(i.stockNow.duo)}**, 18 Pro Max **${yesNo(i.stockNow["18-pro-max"])}**, 18 Pro **${yesNo(i.stockNow["18-pro"])}**.`;
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? ` (${cnt(i.cities, "stad", "steden")})` : "";
  return `**${cnt(n, "Apple Store", "Apple Stores")}** in ${w}${cities}. Nu op te halen: de iPhone Duo bij **${n$(i.stockNow.duo)}**, de 18 Pro Max bij **${n$(i.stockNow["18-pro-max"])}** en de 18 Pro bij **${n$(i.stockNow["18-pro"])}**.`;
}

/** The scarcest configurations of a model across the place's stores (colour names in Dutch). */
function scarcest(i: IntlPlaceInput, model: ModelKey, k = 2): { label: string; stores: number }[] {
  return CC.scarcest(i, model, 99).map((x) => {
    const cut = x.label.indexOf(" ");
    return { label: cut < 0 ? x.label : `${x.label.slice(0, cut)} ${colorLabel(x.label.slice(cut + 1), L)}`, stores: x.stores };
  }).slice(0, k);
}

function duoLead(i: IntlPlaceInput): string {
  const n = i.stores.length;
  const have = CC.duoStoresNow(i);
  const st = i.duo;
  const since = sinceWhen();
  if (n === 1) {
    const one = appleOf(i.stores[0]);
    if (have.length > 0) return `**${one}** heeft nu een iPhone Duo om op te halen.`;
    if (st.month > 0) return `**${one}** heeft nu geen iPhone Duo, maar kreeg er **${n$(st.month)} keer** nieuwe voorraad van ${since}.`;
    return `**${one}** heeft nu geen iPhone Duo, en ${since} is er nog geen nieuwe Duo-voorraad gelogd.`;
  }
  if (have.length > 0) return `**${n$(have.length)} van de ${n$(n)} winkels** ${have.length === 1 ? "heeft" : "hebben"} nu een iPhone Duo: ${list(L, have.map(appleOf), 4, (k) => `nog ${n$(k)}`)}.`;
  if (st.month > 0) return `**Geen van de ${n$(n)} winkels** heeft nu een iPhone Duo, maar ze kregen er **${n$(st.month)} keer** nieuwe voorraad van ${since}.`;
  return `**Geen van de ${n$(n)} winkels** heeft nu een iPhone Duo, en ${since} is er nog geen nieuwe Duo-voorraad gelogd.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const n = i.stores.length;
  const have = CC.duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${sinceShort()}:** ${n$(st.month)} keer nieuwe Duo-voorraad in ${n === 1 ? "deze winkel" : "deze winkels"}`);
  if (st.lastRestock && last) items.push(`**Laatste aanvulling:** ${whenIn(i.cc, st.lastRestock.at)} bij ${appleOf(last)}`);
  if (st.medianMs != null) items.push(`**Hoe lang hij te koop staat:** een aangevulde Duo bleef zo'n ${dur(st.medianMs)} beschikbaar (mediaan)`);
  const which = n <= 3 ? "bij de winkels waar je kunt komen" : `bij de ${Math.min(n, 5)} dichtstbijzijnde winkels waar je kunt komen`;
  items.push(n === 1 ? `**Snelste route:** [stel een iPhone Duo-alert in voor ${appleOf(i.stores[0])}](${alert})` : `**Snelste route:** [stel een iPhone Duo-alert in voor ${w}](${alert}), ${which}`);
  items.push("**Eén alert** = één winkel × één exacte configuratie; de push komt seconden nadat een winkel hem aanbiedt");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**Dat kan binnen een minuut veranderen:** de snelste manier om er een te krijgen is een alert, niet apple.com blijven verversen." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const n = i.stores.length;
  const w = placeName(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  const pmNow = i.stockNow["18-pro-max"];
  return [
    {
      id: "iphone-duo",
      h2: n === 1 ? `iPhone Duo in ${w}: heeft ${appleOf(i.stores[0])} hem nu?` : `iPhone Duo in ${w}: welke winkels hem nu hebben`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: n === 1 ? `iPhone 18 Pro Max in ${w}: voorraad nu` : `iPhone 18 Pro Max in ${w}: voorraad per winkel`,
      lead: n === 1
        ? `**${appleOf(i.stores[0])}** ${pmNow ? "heeft de iPhone 18 Pro Max op voorraad" : "heeft de iPhone 18 Pro Max nu niet op voorraad"}: **${pct(L, CC.pairsPct(i, "18-pro-max"))}** van de ${n$(pm)} configuraties ligt klaar om op te halen.`
        : `**${n$(pmNow)} van de ${n$(n)} winkels** ${pmNow === 1 ? "heeft" : "hebben"} een iPhone 18 Pro Max, en **${pct(L, CC.pairsPct(i, "18-pro-max"))}** van de ${n$(n * pm)} combinaties van winkel × configuratie hier is op voorraad.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Nu het schaarst:** ${list(L, scarce.map((x) => `${x.label} (${n === 1 ? (x.stores ? "op voorraad" : "niet op voorraad") : `${n$(x.stores)} van ${n$(n)} winkels`})`))}`] : []),
        `**iPhone 18 Pro:** ${n === 1 ? (i.stockNow["18-pro"] ? "op voorraad" : "nu niet op voorraad") : `in ${n$(i.stockNow["18-pro"])} van de ${n$(n)} winkels`}, ${pct(L, CC.pairsPct(i, "18-pro"))} van de ${n === 1 ? "configuraties" : "combinaties"} beschikbaar`,
        `**${sinceShort()}:** ${i.max.month ? `${n$(i.max.month)} keer nieuwe 18 Pro Max-voorraad` : "nog geen nieuwe 18 Pro Max-voorraad"}`,
        ...(i.max.medianMs != null ? [`**Hoe lang hij te koop staat:** een aangevulde Pro Max bleef zo'n ${dur(i.max.medianMs)} beschikbaar (mediaan)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const w = land(cc);
  return fitT([
    `Apple Store ${w}: ${n === 1 ? "de enige winkel" : `alle ${n} winkels`}, iPhone-voorraad live`,
    `Apple Stores ${inC(cc)}: iPhone Duo-voorraad live`,
    `Apple Stores ${w}: iPhone-voorraad live`,
  ], 70);
}

function homeTitle(cc: CountryCode): string {
  const n = storesOf(cc).length;
  const w = land(cc);
  return fitT([
    n === 1 ? `Apple Store ${w}: iPhone Duo-voorraad live, elke 15 sec.` : `iPhone Duo-voorraad ${inC(cc)}: alle ${n} Apple Stores live`,
    `iPhone-voorraad ${w}: ${cnt(n, "Apple Store", "Apple Stores")}, elke 15 sec.`,
    `iPhone-voorraad ${w}: elke 15 sec. gecheckt`,
  ]);
}

function homeH1(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return n === 1 ? `iPhone-voorraadchecker voor de Apple Store ${inC(cc)}` : `iPhone-voorraadchecker voor alle ${n$(n)} Apple Stores ${inC(cc)}`;
}

function allStoresPhrase(cc: CountryCode): string {
  const n = storesOf(cc).length;
  return n === 1 ? `de enige Apple Store ${inC(cc)}` : `alle ${n$(n)} Apple Stores ${inC(cc)}`;
}

function spreadPhrase(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const regions = statesWithStores(cc);
  const cities = citiesWithStores(cc);
  const n = storesOf(cc).length;
  if (n === 1) return `in ${cityLabel(cc, cities[0].name, L)}`;
  if (cities.length === 1) return `allemaal in ${cityLabel(cc, cities[0].name, L)}`;
  if (!c.regionNoun || regions.length === 1) return `in ${cnt(cities.length, "stad", "steden")}`;
  return `in ${cnt(cities.length, "stad", "steden")}, verspreid over ${n$(regions.length)} ${noun(cc, regions.length !== 1)}`;
}

function modelPageTitles(cc: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const all = n === 1 ? "de Apple Store" : n === 2 ? "beide Apple Stores" : `alle ${n} Apple Stores`;
  return {
    title: fitT([`${m.name} op voorraad ${inC(cc)}: live in ${all}`, `${m.name} op voorraad ${inC(cc)}: live`, `${m.name}-voorraad ${inC(cc)}`], 70),
    h2: [`${m.name} in de buurt: welke winkels ${inC(cc)} hem nu hebben`, priceSection(cc, land(cc), undefined, model).h2],
  };
}

function modelIntro(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const r = CC.priceRange(cc, model);
  const priceTxt = cc === "ca" ? `**${money(cc, r.low)}** exclusief belasting` : `**${money(cc, r.low)}**, ${taxNote(cc)}`;
  const lead = n === 1
    ? (inStock === 0 ? `De Apple Store ${inC(cc)} heeft de ${m.name} nu **niet** om op te halen` : `De Apple Store ${inC(cc)} heeft de ${m.name} **nu** om op te halen`)
    : (inStock === 0 ? `**Geen** van de ${n$(n)} Apple Stores ${inC(cc)} heeft de ${m.name} nu om op te halen` : `**${n$(inStock)} van de ${n$(n)}** Apple Stores ${inC(cc)} ${inStock === 1 ? "heeft" : "hebben"} de ${m.name} nu om op te halen`);
  return `${lead} (elke **15 seconden** gecontroleerd); prijzen vanaf ${priceTxt}.`;
}

function modelDescription(cc: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const n = storesOf(cc).length;
  const r = CC.priceRange(cc, model);
  const now = n === 1 ? (inStock ? "De Apple Store heeft hem nu om op te halen." : "De Apple Store heeft hem nu niet.") : `${n$(inStock)} van de ${n$(n)} Apple Stores ${inStock === 1 ? "heeft" : "hebben"} hem nu om op te halen.`;
  return fitT([
    `Is de ${m.name} op voorraad ${inC(cc)}? ${now} Live per winkel en configuratie, vanaf ${money(cc, r.low)}${cc === "ca" ? " excl. belasting" : ""}, met aanvultijden.`,
    `${m.name} ${inC(cc)}: ${now} Live voorraad per winkel en configuratie, aanvultijden en alerts.`,
  ], 155);
}

function modelRows(cc: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = cc === "us" ? "" : `/${cc}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, n$(catalogFor(m.key, cc).length), n$(storesNow[m.key] ?? 0), n$(restocks[m.key] ?? 0)]);
}

function homeDescription(cc: CountryCode): string {
  const c = COUNTRIES[cc];
  const n = storesOf(cc).length;
  const cur = c.currency === "EUR" ? "euro" : c.currency;
  const where = n === 1 ? `bij ${appleOf(storesOf(cc)[0])}` : `in ${allStoresPhrase(cc)}`;
  return fitT([
    `Zie live of de iPhone Duo, 18 Pro of Pro Max klaarligt ${where}, elke 15 seconden gecheckt. Met aanvultijden, prijzen in ${cur} en pushalerts.`,
    `Zie live of de iPhone Duo, 18 Pro of Pro Max klaarligt ${where}, elke 15 seconden gecheckt. Plus aanvultijden, prijzen en pushalerts.`,
    `Zie live of de iPhone Duo, 18 Pro of Pro Max klaarligt ${where}, elke 15 seconden gecheckt, met pushalerts.`,
  ], 160);
}

function homeIntro(cc: CountryCode): string {
  const n = storesOf(cc).length;
  if (n === 1) {
    const s = appleOf(storesOf(cc)[0]);
    return `Op dit moment liggen er bij ${s} **{{duo.pairsNow}} van de {{duo.pairsTotal}}** iPhone Duo-configuraties klaar om op te halen, **{{pro.pairsNow}}** van de iPhone 18 Pro en **{{pm.pairsNow}}** van de iPhone 18 Pro Max.`;
  }
  return `Op dit moment ligt de iPhone Duo klaar om op te halen in **{{duo.storesNow}} van de ${n$(n)}** Apple Stores ${inC(cc)}, de iPhone 18 Pro in **{{pro.storesNow}}** en de iPhone 18 Pro Max in **{{pm.storesNow}}**.`;
}

/** Where people look for a store that isn't there (Google Ads: "apple store rotterdam" 1,600, "apple store utrecht" 1,300 a month). */
const NO_STORE_HERE: Partial<Record<CountryCode, string>> = {
  nl: "**Geen Apple Store in Rotterdam of Utrecht:** vanuit Rotterdam is Apple Den Haag het dichtstbij (hemelsbreed zo'n 20 km), vanuit Utrecht Apple Amsterdam (zo'n 35 km)",
  be: "**Geen Apple Store in Antwerpen of Gent:** Apple Brussels is de enige in België, hemelsbreed zo'n 45 km van Antwerpen en 50 km van Gent",
};

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const cc = i.cc;
  const c = COUNTRIES[cc];
  const n = storesOf(cc).length;
  const stores = storesOf(cc);
  const unitWord = c.unit === "mi" ? "mijl" : "kilometers";
  return [
    {
      id: "iphone-stock",
      h2: `iPhone-voorraad ${inC(cc)}: Duo, 18 Pro en Pro Max per winkel`,
      lead: `PickupChecker leest elke 15 seconden op apple.com welke configuraties klaarliggen om op te halen in ${allStoresPhrase(cc)}: per winkel${n > 1 ? `, per ${c.regionNoun ? noun(cc) : "stad"}` : ""} en per configuratie.`,
      blocks: [
        { t: "table", head: ["Model", "Configuraties", "Winkels met voorraad nu", "Aanvullingen gelogd"], rows: modelRows(cc, i.storesNow, i.restocks), caption: `Wat de check ${inC(cc)} omvat, stand van {{asOf}}` },
        { t: "ul", items: [
          `**Dekking:** ${spreadPhrase(cc)} · prijzen en artikelnummers zijn die van Apple ${land(cc)}`,
          "**Elke winkel elke 15 seconden**, de winkels van je alerts elke 5",
          "**Pas na twee checks telt het:** één haperend antwoord van apple.com wordt nooit een nep-aanvulling of nep-uitverkocht",
          `**Elke bevestigde wijziging** komt in het [voorraadlogboek](${i.restocksPath}), de bron van de grafieken op ${i.index?.indexable ? `[de winkelpagina's](${i.index.path})` : "de winkelpagina"}`,
          ...(NO_STORE_HERE[cc] ? [NO_STORE_HERE[cc]!] : []),
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(cc, land(cc)),
    {
      id: "alerts",
      h2: `Apple Store-voorraad checken ${inC(cc)}, met een alert bij nieuwe voorraad`,
      lead: `Checken is gratis; je betaalt pas om níet meer te hoeven checken. Kies de Apple Store${n === 1 ? "" : "s"} waar je kunt komen en de exacte iPhone, en je telefoon krijgt een push seconden nadat ${n === 1 ? "de winkel" : "een van die winkels"} hem aanbiedt om op te halen.`,
      blocks: [
        { t: "ol", items: [
          "Tik op **Waarschuw me** en kies de iPhone, de opslag en de kleur.",
          n === 1 ? `Vink de winkel aan: ${appleOf(stores[0])} in ${cityLabel(cc, stores[0].city, L)}.` : `Vink de winkels aan waar je kunt komen; de dichtstbijzijnde staan bovenaan, met ${unitWord} over de weg en reistijd.`,
          "Zet PickupChecker op een iPhone op je beginscherm en sta meldingen toe ([zo installeer je het](/install)).",
          "Komt de push binnen, open dan apple.com vanuit de melding en reken af met ophalen in die winkel.",
        ] },
        { t: "table", head: ["Abonnement", "Prijs (USD)", "Alerts"], rows: [["Plus", "$5 / maand", "10"], ["Pro", "$10 / maand", "20"], ["Max", "$20 / maand", "50"]], caption: "Eén alert = één winkel × één exacte configuratie · rondkijken is gratis ([prijzen](/pricing))" },
        { t: "note", text: "**Onze mening:** de Duo is een alert waard bij elke winkel waar je kunt komen; kijk bij de 18 Pro en Pro Max eerst naar de live cijfers." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(cc: CountryCode, rt: RestockTimesBrief): Faq[] {
  const n = storesOf(cc).length;
  const p = cc === "us" ? "" : `/${cc}`;
  const one = n === 1 ? appleOf(storesOf(cc)[0]) : null;
  const at = one ? `bij ${one}` : `in ${n$(rt.stores)} van de ${n$(rt.storesTotal)} winkels`;
  const when = rt.n === 0
    ? `Nog geen bevestigde aanvulling sinds we op 2 november begonnen te meten. [Wanneer is de iPhone Duo weer op voorraad ${inC(cc)}?](${rt.path}) telt ze per lokaal uur en per dag zodra ze binnenkomen.`
    : rt.peakHour != null
      ? `De meeste rond **${hour(L, rt.peakHour, true)} lokale tijd**: ${cnt(rt.n, "bevestigde aanvulling", "bevestigde aanvullingen")} ${at} sinds 2 november. [Per uur en per dag](${rt.path}).`
      : `${cnt(rt.n, "bevestigde aanvulling", "bevestigde aanvullingen")} ${at} sinds 2 november, op te weinig dagen om al een vast uur te noemen. [Per uur en per dag](${rt.path}).`;
  return [
    one
      ? { q: `Heeft ${one} de iPhone Duo nu op voorraad?`, a: `Bij de laatste check ({{asOf}}) lagen er {{duo.pairsNow}} van de {{duo.pairsTotal}} configuraties klaar. [iPhone Duo-voorraad ${inC(cc)}](${p}/stock/iphone-duo) toont ze allemaal, elke 15 seconden bijgewerkt.` }
      : { q: `Welke Apple Stores ${inC(cc)} hebben de iPhone Duo nu?`, a: `{{duo.storesNow}} van de ${n$(n)} bij de laatste check ({{asOf}}). [iPhone Duo-voorraad ${inC(cc)}](${p}/stock/iphone-duo) noemt elke winkel en configuratie, elke 15 seconden bijgewerkt.` },
    { q: `Wanneer is de iPhone Duo weer op voorraad ${inC(cc)}?`, a: when },
    { q: "Hoe snel zijn de alerts?", a: `De winkels van je alerts worden elke 5 seconden gecontroleerd, ${n === 1 ? `de Apple Store ${inC(cc)}` : `elke Apple Store ${inC(cc)}`} elke 15. Een eerste "beschikbaar" wordt binnen een seconde opnieuw gecheckt, zodat een storing bij Apple nooit een alert wordt, en de push staat zo'n 3 seconden later op je telefoon.` },
    { q: "Wat kost het?", a: "Live voorraad, de kaart en het voorraadlogboek zijn gratis. Alerts: Plus $5 per maand voor 10, Pro $10 voor 20 en Max $20 voor 50, afgerekend in Amerikaanse dollars; altijd opzegbaar ([prijzen](/pricing))." },
    taxFaq(cc, land(cc)),
    { q: "Kunnen jullie de iPhone voor me reserveren?", a: `Nee. Wij laten je weten zodra een winkel hem aanbiedt; jij koopt op apple.com met ophalen in de winkel, en Apple legt hem voor je apart ([Apple: hulp bij ophalen](${sources(cc as Exclude<CountryCode, "us">).pickupHelp.url})).` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (cc: CountryCode) => `PickupChecker iPhone-voorraadchecker ${land(cc)}`,
  offer: "Live voorraad, kaart en voorraadlogboek zijn gratis; alerts vanaf $5 per maand",
  itemList: (cc: CountryCode) => `Apple Stores ${inC(cc)}`,
  restockTimesChip: "Wanneer er voorraad komt",
  storesByRegion: (cc: CountryCode) => `Winkels per ${noun(cc)}`,
  browse: (cc: CountryCode) => `Voorraad ${inC(cc)} bekijken`,
  selloutH2: (cc: CountryCode) => `Hoe snel is nieuwe iPhone-voorraad ${inC(cc)} uitverkocht?`,
  selloutLabel: (cc: CountryCode) => (storesOf(cc).length === 1 ? `in de Apple Store ${inC(cc)}` : `in de Apple Stores ${inC(cc)}`),
  last24Label: (cc: CountryCode) => inC(cc),
  newsroom: "Apple Newsroom: iPhone Duo verkrijgbaar in Apple Stores wereldwijd (23 oktober 2026)",
};

/**
 * Store page <title> and H1: "Apple Den Haag: iPhone-voorraad, ophalen & openingstijden". People search the store's
 * name as they say it ("apple brussel"), so a store named after its city reads with the Dutch city name.
 */
function storeTitle(s: Store, region?: string): string {
  const cc = s.country ?? "us";
  const city = cityLabel(cc, s.city, L);
  const name = s.name === s.city && city !== s.city ? `Apple ${city}` : appleOf(s);
  const shown = region && !name.toLowerCase().includes(region.toLowerCase()) && !s.name.toLowerCase().includes(region.toLowerCase()) ? region : null;
  const r = shown ? ` (${shown})` : "";
  return fitT([
    `${name}${r}: iPhone-voorraad vandaag, ophalen & openingstijden`,
    `${name}${r}: iPhone-voorraad, ophalen & openingstijden`,
    `${name}${r}: iPhone-voorraad vandaag & openingstijden`,
    `${name}: iPhone-voorraad, ophalen & openingstijden`,
    `${name}: iPhone-voorraad & openingstijden`,
    `${name}: iPhone-voorraad`,
    `${name} – voorraad`,
  ]);
}

/** Apple's pickup help and store list in Dutch (NL: apple.com/nl; Belgium: the be-nl store and the benl store list). */
function sources(code: Exclude<CountryCode, "us">): { pickupHelp: Source; storeList: Source; tax: Source } {
  if (code === "nl") return {
    pickupHelp: { label: "Apple: hulp bij levering en ophalen (Nederland): wat je meeneemt bij het ophalen", url: "https://www.apple.com/nl/shop/help/shipping_delivery" },
    storeList: { label: "Apple: lijst van Apple Stores (Nederland)", url: "https://www.apple.com/nl/retail/storelist/" },
    tax: taxSource(code),
  };
  if (code === "be") return {
    pickupHelp: { label: "Apple: hulp bij levering en ophalen (België): wat je meeneemt bij het ophalen", url: "https://www.apple.com/be-nl/shop/help/shipping_delivery" },
    storeList: { label: "Apple: lijst van Apple Stores (België)", url: "https://www.apple.com/benl/retail/storelist/" },
    tax: taxSource(code),
  };
  return { pickupHelp: pickupHelp(code), storeList: storeListSource(code), tax: TAX_SOURCES[code] };
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
  home: homeLabels,
  storeTitle,
  sources,
};

