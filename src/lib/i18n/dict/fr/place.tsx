/**
 * Chaînes françaises : place — les textes des pages pays en français (France, Belgique, Suisse, Canada) : titres,
 * introductions « réponse d’abord », sections par mot-clé, prix et taxes, FAQ, à partir des chiffres en direct.
 * Canada : prix Apple avant taxes, TPS / TVH / TVQ / TVP / TVD par province ; ailleurs TVA incluse (20 %, 21 %, 8,1 %).
 * Mêmes arguments et mêmes formes de retour que l’anglais (lib/seo/countryCopy.ts).
 */
import type { Dict } from "../en";
import * as cc from "@/lib/seo/countryCopy";
import type { IntlPlaceInput, HomeCopyInput, RestockTimesBrief } from "@/lib/seo/countryCopy";
import { MODELS, catalogFor, citiesWithStores, statesWithStores, storesOf, modelByKey, type ModelKey, type Store } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { CA_PROVINCE_TAX, TAX_SOURCES, beforeTax, includedRate, taxName, withProvinceTax, pickupHelp, storeListSource } from "@/content/country-tax";
import type { Source } from "@/lib/content/types";
import type { Block, Faq } from "@/lib/content/types";
import type { KeywordSection } from "@/components/content/KeywordSections";
import type { FaqItem } from "@/lib/seo/enrich";
import { alertHref, fmtDuration } from "@/lib/seo/enrich";
import { fitTitleW, list, num, plural, price, stamp, hour } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, colorLabel, regionLabel } from "@/lib/i18n/places";
import { IN, NAME, L, cap, dans, noun } from "./util";

/* ------------------------------------------------------------------ small helpers */

const money = (code: CountryCode, v: number) => price(L(code), COUNTRIES[code], v);
const N = (code: CountryCode | undefined, v: number) => num(L(code), v);
const rate = (code: CountryCode, r: number) => `${num(L(code), r)} %`;
const apple = (s: Store) => appleStoreLabel(s, L(s.country));
/** "TVA", "TPS", "taxe à la consommation": the tax inside a price. */
function taxFr(c: Country): string {
  const t = taxName(c);
  return t === "VAT" ? "TVA" : t === "GST" ? "TPS" : t === "consumption tax" ? "taxe à la consommation" : "taxe";
}
/** "TVA (20 %) incluse" / "avant taxes" (Canada) / "sans taxe de vente" (Hong Kong). */
export function taxNote(code: CountryCode): string {
  const c = COUNTRIES[code];
  if (!c.pricesIncludeTax) return code === "ca" ? "avant taxes (TPS/TVH et taxe provinciale)" : "avant taxe de vente";
  const r = includedRate(c);
  return r == null ? "sans taxe de vente" : `${taxFr(c)} (${rate(code, r)}) incluse`;
}
/** A place given in French: the country itself reads "en France", anything else "à Paris", "au Québec". */
function where(code: CountryCode, place: string): string {
  return place === NAME[code] || place === COUNTRIES[code].name ? IN[code] : dans(place);
}
/** The French name of a page's place (the input carries the English one). */
function placeName(i: IntlPlaceInput): string {
  const lg = L(i.cc);
  return i.kind === "state" ? regionLabel(i.cc, i.name, lg) : cityLabel(i.cc, i.name, lg);
}
/** A place that is also a US store city or state gets its country: "London (Canada)". */
function labelOf(code: CountryCode, name: string): string {
  return cc.placeLabel(code, name) !== name ? `${name} (${NAME[code]})` : name;
}
const provinceFr = (p: string) => regionLabel("ca", p, "fr-CA");

/* ------------------------------------------------------------------ Canada: provincial taxes in French */

/** The provincial part's French name: TVP (C.-B.), TVD (Manitoba), TVQ (Québec). */
const PST: Record<string, string> = { "British Columbia": "TVP", Manitoba: "TVD", Quebec: "TVQ" };
function caLabel(p: string): string {
  const t = CA_PROVINCE_TAX[p];
  return t.hst ? "TVH" : t.pst ? `TPS + ${PST[p] ?? "taxe provinciale"}` : "TPS";
}
/** "la TPS de 5 % et la TVQ de 9,975 %". */
function caParts(p: string): string {
  const t = CA_PROVINCE_TAX[p];
  if (t.hst) return `la TVH de ${rate("ca", t.hst)}`;
  if (t.pst) return `la TPS de ${rate("ca", t.gst)} et la ${PST[p] ?? "taxe provinciale"} de ${rate("ca", t.pst)}`;
  return `la TPS de ${rate("ca", t.gst)}, sans taxe de vente provinciale`;
}

/* ------------------------------------------------------------------ sources in French */

/** Apple's online store path for French readers (prices, pickup help). */
const SHOP: Partial<Record<CountryCode, string>> = { fr: "fr", be: "be-fr", ch: "ch-fr", ca: "ca" };
const RETAIL: Partial<Record<CountryCode, string>> = { fr: "fr", be: "befr", ch: "chfr", ca: "ca/fr" };
const EU_FR: Source = { label: "Your Europe (Union européenne) : taux de TVA appliqués dans les pays de l’UE", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_fr.htm" };
const TAX_FR: Partial<Record<CountryCode, Source>> = {
  fr: EU_FR,
  be: EU_FR,
  ch: { label: "Administration fédérale des contributions (AFC) : taux de TVA en Suisse", url: "https://www.estv.admin.ch/estv/fr/accueil/taxe-sur-la-valeur-ajoutee/taux-tva-suisse.html" },
  ca: { label: "Agence du revenu du Canada : calculatrice de la TPS/TVH et tableau des taux", url: "https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/tps-tvh-entreprises/facturer-percevoir-quel-taux/calculatrice.html" },
};
function taxSource(code: Exclude<CountryCode, "us">): Source {
  return TAX_FR[code] ?? { label: `${TAX_SOURCES[code].label} (en anglais)`, url: TAX_SOURCES[code].url };
}
function pickupHelpFr(code: CountryCode): Source {
  const p = SHOP[code];
  // Apple's Canadian help page exists in English only (the /ca/fr/shop help answers 404).
  if (p && code !== "ca") return { label: `Apple : aide Livraison et retrait (${NAME[code]}), ce qu’il faut apporter au retrait`, url: `https://www.apple.com/${p}/shop/help/shipping_delivery` };
  const en = pickupHelp(code);
  return { label: `Apple : aide Livraison et retrait (${NAME[code]}, en anglais), ce qu’il faut apporter au retrait`, url: en.url };
}
function storeListFr(code: CountryCode): Source {
  const p = RETAIL[code];
  if (p) return { label: `Apple : liste des magasins (${NAME[code]})`, url: `https://www.apple.com/${p}/retail/storelist/` };
  return { label: `Apple : liste des magasins (${NAME[code]}, en anglais)`, url: storeListSource(code).url };
}
const shopPath = (code: CountryCode) => SHOP[code] ?? COUNTRIES[code].buyPath ?? COUNTRIES[code].shopPath;

/* ------------------------------------------------------------------ time */

function sinceWhen(now = Date.now()): string {
  return now - Date.parse(`${cc.INTL_TRACKING_SINCE}T00:00:00Z`) < 30 * 86400_000 ? "depuis le début du suivi, le 2 novembre" : "sur les 30 derniers jours";
}
function whenIn(code: CountryCode, iso: string | Date): string {
  return stamp(L(code), iso, COUNTRIES[code].timeZone, true);
}

/* ------------------------------------------------------------------ tax */

function taxSentence(code: CountryCode, region?: string): string {
  const c = COUNTRIES[code];
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    if (t) return `L’iPhone Duo 256GB est à ${money(code, duo)} avant taxes chez Apple ; ${dans(provinceFr(region!))}, avec ${caParts(region!)}, il revient à environ ${money(code, t.total)}.`;
    return `L’iPhone Duo 256GB est à ${money(code, duo)} avant taxes chez Apple : selon la province, de 5 % à 15 % s’ajoutent au paiement.`;
  }
  const r = includedRate(c);
  if (r == null) return `Un iPhone Duo 256GB coûte ${money(code, duo)} ${IN[code]}, sans taxe de vente : c’est ce que vous payez au retrait.`;
  return `Un iPhone Duo 256GB coûte ${money(code, duo)} ${IN[code]}, ${taxFr(c)} de ${rate(code, r)} incluse : le prix d’apple.com est celui que vous payez au retrait.`;
}

const PRICE_ROWS: [ModelKey, string][] = [["duo", "256GB"], ["duo", "1TB"], ["18-pro-max", "256GB"], ["18-pro-max", "1TB"], ["18-pro", "256GB"]];

function priceSection(code: CountryCode, placeName: string, region?: string, model: ModelKey = "duo"): KeywordSection {
  const c = COUNTRIES[code];
  const m = modelByKey(model)!;
  const base = cc.priceOf(code, model) ?? 0;
  const rows: [string, number][] = PRICE_ROWS.flatMap(([k, st]) => { const p = cc.priceOf(code, k, st); return p == null ? [] : [[`${modelByKey(k)!.name} ${st}`, p] as [string, number]]; });
  const src = code === "us" ? TAX_SOURCES.ca : taxSource(code);
  if (code === "ca") {
    const t = region ? CA_PROVINCE_TAX[region] : undefined;
    if (t) {
      const R = provinceFr(region!);
      const table: Block = {
        t: "table",
        head: ["iPhone", "Prix apple.com", `Avec ${rate(code, t.total)} de ${caLabel(region!)}`],
        rows: rows.map(([label, p]) => [label, money(code, p), money(code, withProvinceTax(p, region!)!.total)]),
        caption: `${R} : prix canadien d’Apple plus ${caLabel(region!)} (${rate(code, t.total)})`,
        source: `[${src.label}](${src.url}) ; prix d’apple.com/ca`,
      };
      return {
        id: "price-with-tax",
        h2: `Combien coûte l’${m.name} ${dans(placeName)} avec les taxes ?`,
        lead: `L’${m.name} 256GB est à **${money(code, base)} avant taxes** ; ${dans(R)}, avec ${caParts(region!)}, il revient à environ **${money(code, withProvinceTax(base, region!)!.total)}** en magasin${placeName !== R ? ` ${dans(placeName)}` : ""}.`,
        blocks: [{ t: "note", text: "**La taxe dépend du lieu de retrait :** c’est la province du magasin qui fixe le taux, pas votre adresse." }, table],
      };
    }
    const provinces = Object.keys(CA_PROVINCE_TAX).filter((p) => storesOf("ca").some((s) => s.state === p));
    const cheapest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total < CA_PROVINCE_TAX[a].total ? b : a));
    const dearest = provinces.reduce((a, b) => (CA_PROVINCE_TAX[b].total > CA_PROVINCE_TAX[a].total ? b : a));
    return {
      id: "price-with-tax",
      h2: `Combien coûte l’${m.name} au Canada avec les taxes, province par province ?`,
      lead: `Les **${money(code, base)}** d’Apple pour un ${m.name} 256GB s’entendent avant taxes ; la province du magasin de retrait les ajoute : de **${money(code, withProvinceTax(base, cheapest)!.total)}** ${dans(provinceFr(cheapest))} (${rate(code, CA_PROVINCE_TAX[cheapest].total)}) à **${money(code, withProvinceTax(base, dearest)!.total)}** ${dans(provinceFr(dearest))} (${rate(code, CA_PROVINCE_TAX[dearest].total)}).`,
      blocks: [{
        t: "table",
        head: ["Province", "Taxe", "Taux", `${m.short} 256GB taxes comprises`],
        rows: provinces.map((p) => [provinceFr(p), caLabel(p), rate(code, CA_PROVINCE_TAX[p].total), money(code, withProvinceTax(base, p)!.total)]),
        caption: "Provinces avec un Apple Store : taxe de vente sur un retrait en magasin",
        source: `[${src.label}](${src.url}) ; prix d’apple.com/ca`,
      }],
    };
  }
  const r = includedRate(c);
  const tn = taxFr(c);
  return {
    id: "price",
    h2: `Prix de l’${m.name} ${IN[code]} : ${money(code, base)}, ${taxNote(code)}`,
    lead: r == null
      ? `Les **${money(code, base)}** affichés sur apple.com pour l’${m.name} 256GB sont ce que vous payez au retrait ${where(code, placeName)} : il n’y a **ni taxe de vente ni TVA**.`
      : `L’${m.name} 256GB est à **${money(code, base)}** ${IN[code]}, **${tn} de ${rate(code, r)} incluse** (${money(code, beforeTax(c, base))} hors taxes), et rien ne s’ajoute au retrait ${where(code, placeName)}.`,
    blocks: [{
      t: "table",
      head: r == null ? ["iPhone", "Prix apple.com"] : ["iPhone", "Prix apple.com", `Hors ${tn} (${rate(code, r)})`],
      rows: rows.map(([label, p]) => (r == null ? [label, money(code, p)] : [label, money(code, p), money(code, beforeTax(c, p))])),
      caption: `Prix d’Apple ${IN[code]}${r == null ? "" : `, ${tn} incluse`}`,
      source: `[${src.label}](${src.url}) ; prix d’apple.com/${shopPath(code)}`,
    }],
  };
}

function taxFaq(code: CountryCode, placeName: string, region?: string): FaqItem {
  const c = COUNTRIES[code];
  const duo = cc.priceOf(code, "duo") ?? 0;
  if (code === "ca") {
    const t = region ? withProvinceTax(duo, region) : null;
    return t
      ? { q: `Combien coûte l’iPhone Duo avec les taxes ${dans(placeName)} ?`, a: `Environ ${money(code, t.total)} pour le 256GB : les ${money(code, duo)} d’Apple plus ${rate(code, t.rate)} de ${caLabel(region!)} (${provinceFr(region!)}), perçus là où vous le retirez.` }
      : { q: "Le prix canadien d’Apple inclut-il les taxes ?", a: `Non. L’iPhone Duo 256GB est à ${money(code, duo)} avant taxes ; la TPS, la TVH ou la taxe provinciale s’ajoutent selon la province du magasin, de 5 % en Alberta à 14,975 % au Québec.` };
  }
  const r = includedRate(c);
  return r == null
    ? { q: `Y a-t-il une taxe sur un iPhone ${IN[code]} ?`, a: `Non. Il n’y a ni taxe de vente ni TVA ${IN[code]} : l’iPhone Duo 256GB coûte ${money(code, duo)} au retrait, exactement le prix d’apple.com.` }
    : { q: `Le prix d’apple.com ${IN[code]} inclut-il la ${taxFr(c)} ?`, a: `Oui. Les ${money(code, duo)} de l’iPhone Duo 256GB incluent ${rate(code, r)} de ${taxFr(c)} ; rien ne s’ajoute quand vous le retirez en magasin.` };
}

/* ------------------------------------------------------------------ region / city pages */

function placeTitle(i: IntlPlaceInput): string {
  const k = i.stores.length;
  const w = labelOf(i.cc, placeName(i));
  return fitTitleW([
    ...(k > 1 ? [`Apple Store ${w} : stock iPhone Duo en direct (${N(i.cc, k)} magasins)`] : []),
    `Apple Store ${w} : stock iPhone Duo en direct`,
    `Apple Store ${w} : stock iPhone du jour`,
    `Apple Store ${w} : stock iPhone`,
  ]);
}

function priceBit(code: CountryCode, region?: string): string {
  const duo = cc.priceOf(code, "duo");
  if (duo == null) return "";
  if (code === "ca") { const t = region ? withProvinceTax(duo, region) : null; return t ? `, environ ${money(code, t.total)} taxes comprises ${dans(provinceFr(region!))}` : `, ${money(code, duo)} avant taxes`; }
  return `, ${money(code, duo)} ${taxNote(code)}`;
}

function placeDescription(i: IntlPlaceInput): string {
  const k = N(i.cc, i.stores.length);
  const w = dans(labelOf(i.cc, placeName(i)));
  return fitTitleW([
    `iPhone Duo en retrait en ce moment dans ${N(i.cc, i.stockNow.duo)} des ${k} Apple Store ${w}, 18 Pro Max dans ${N(i.cc, i.stockNow["18-pro-max"])}. Stock en direct par magasin, heures de retour en stock${priceBit(i.cc, i.region)}.`,
    `iPhone Duo en retrait en ce moment dans ${N(i.cc, i.stockNow.duo)} des ${k} Apple Store ${w}, 18 Pro Max dans ${N(i.cc, i.stockNow["18-pro-max"])}. Stock en direct par magasin, retours en stock.`,
  ], 155);
}

function placeIntro(i: IntlPlaceInput): string {
  const lg = L(i.cc);
  const cities = i.kind === "state" && i.cities && i.cities > 1 ? `, répartis dans ${plural(lg, i.cities, { one: "# ville", other: "# villes" })}` : "";
  return `**${plural(lg, i.stores.length, { one: "# Apple Store", other: "# Apple Store" })}** ${dans(placeName(i))}${cities} ; en retrait en ce moment, l’iPhone Duo est disponible dans **${N(i.cc, i.stockNow.duo)}**, le 18 Pro Max dans **${N(i.cc, i.stockNow["18-pro-max"])}** et le 18 Pro dans **${N(i.cc, i.stockNow["18-pro"])}**.`;
}

/** The two scarcest configurations of a model at a place, in French ("256GB Ciel nocturne"). */
function scarcest(i: IntlPlaceInput, model: ModelKey, k = 2): { label: string; stores: number }[] {
  const items = catalogFor(model, i.cc);
  const counts = new Map<string, number>(items.map((c) => [c.partNumber, 0]));
  for (const s of i.stores) for (const p of i.stock.get(s.storeNumber)?.perModel[model].parts ?? []) if (counts.has(p)) counts.set(p, (counts.get(p) ?? 0) + 1);
  const by = new Map(items.map((c) => [c.partNumber, c]));
  return [...counts.entries()].map(([p, n]) => ({ label: `${by.get(p)!.storage} ${colorLabel(by.get(p)!.color, L(i.cc))}`, stores: n })).sort((a, b) => a.stores - b.stores).slice(0, k);
}

function duoLead(i: IntlPlaceInput): string {
  const lg = L(i.cc);
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  if (have.length > 0) return `**${N(i.cc, have.length)} ${k === 1 ? "magasin sur 1" : `des ${N(i.cc, k)} magasins`}** ${have.length === 1 ? "affiche" : "affichent"} un iPhone Duo en ce moment : ${list(lg, have.map((s) => apple(s)), 4, (r) => `${N(i.cc, r)} autres`)}.`;
  const none = k === 1 ? "**Le magasin** n’affiche pas" : `**Aucun des ${N(i.cc, k)} magasins** n’affiche`;
  if (st.month > 0) return `${none} d’iPhone Duo en ce moment, mais ${k === 1 ? "il a été réapprovisionné" : "ils ont été réapprovisionnés"} **${plural(lg, st.month, { one: "# fois", other: "# fois" })}** ${sinceWhen()}.`;
  return `${none} d’iPhone Duo en ce moment, et aucun retour en stock du Duo n’a été enregistré ${sinceWhen()}.`;
}

function duoPoints(i: IntlPlaceInput, w: string, alert: string): Block[] {
  const lg = L(i.cc);
  const k = i.stores.length;
  const have = cc.duoStoresNow(i);
  const st = i.duo;
  const last = st.lastRestock ? i.stores.find((s) => s.storeNumber === st.lastRestock!.storeNumber) : undefined;
  const items: string[] = [];
  if (have.length > 0 && st.month > 0) items.push(`**${cap(sinceWhen())} :** ${plural(lg, st.month, { one: "# retour en stock du Duo", other: "# retours en stock du Duo" })} dans ces magasins`);
  if (st.lastRestock && last) items.push(`**Dernier retour en stock :** ${whenIn(i.cc, st.lastRestock.at)} chez ${apple(last)}`);
  if (st.medianMs != null) items.push(`**Durée typique :** un Duo revenu en stock est resté affiché environ ${fmtDuration(st.medianMs, lg)} (médiane)`);
  const targets = k === 1 ? "le magasin" : k <= 3 ? `les ${k === 2 ? "deux" : "trois"} magasins` : `les ${Math.min(k, 5)} magasins les plus proches`;
  items.push(`**Le plus rapide :** [créez une alerte iPhone Duo ${dans(w)}](${alert}) sur ${targets} où vous pouvez vous rendre`);
  items.push("**Une alerte** = un magasin × une configuration exacte ; la notification arrive quelques secondes après qu’un magasin l’affiche");
  const blocks: Block[] = [];
  if (have.length === 0 && st.month === 0) blocks.push({ t: "note", text: "**Cela peut changer d’une minute à l’autre :** le moyen le plus rapide d’en avoir un, c’est une alerte, pas d’actualiser apple.com." });
  blocks.push({ t: "ul", items });
  return blocks;
}

function placeSections(i: IntlPlaceInput): KeywordSection[] {
  const lg = L(i.cc);
  const k = i.stores.length;
  const w = placeName(i);
  const alert = alertHref({ model: "duo", state: i.regionSlug, city: i.kind === "city" ? i.citySlug : undefined, country: i.cc });
  const scarce = scarcest(i, "18-pro-max");
  const pm = catalogFor("18-pro-max", i.cc).length;
  const of = (x: number) => `${N(i.cc, x)} ${k === 1 ? "magasin sur 1" : `des ${N(i.cc, k)} magasins`}`;
  return [
    {
      id: "iphone-duo",
      h2: `iPhone Duo ${dans(w)} : quels magasins l’ont en ce moment ?`,
      lead: duoLead(i),
      blocks: duoPoints(i, w, alert),
    },
    {
      id: "iphone-18-pro-max",
      h2: `iPhone 18 Pro Max ${dans(w)} : le stock magasin par magasin`,
      lead: `L’iPhone 18 Pro Max est en stock dans **${of(i.stockNow["18-pro-max"])}**, soit **${cc.pairsPct(i, "18-pro-max")} %** des ${N(i.cc, k * pm)} couples magasin × configuration d’ici.`,
      blocks: [{ t: "ul", items: [
        ...(scarce.length ? [`**Les plus rares en ce moment :** ${list(lg, scarce.map((x) => `${x.label} (${N(i.cc, x.stores)} sur ${N(i.cc, k)})`))}`] : []),
        `**iPhone 18 Pro :** dans ${of(i.stockNow["18-pro"])}, ${cc.pairsPct(i, "18-pro")} % des couples en stock`,
        `**${cap(sinceWhen())} :** ${i.max.month ? plural(lg, i.max.month, { one: "# retour en stock du 18 Pro Max", other: "# retours en stock du 18 Pro Max" }) : "aucun retour en stock du 18 Pro Max pour l’instant"}`,
        ...(i.max.medianMs != null ? [`**Durée typique :** un Pro Max revenu en stock est resté affiché environ ${fmtDuration(i.max.medianMs, lg)} (médiane)`] : []),
      ] }],
    },
    priceSection(i.cc, w, i.cc === "ca" ? i.region : undefined),
  ];
}

/* ------------------------------------------------------------------ country: store index and home */

function storesIndexTitle(code: CountryCode): string {
  const k = storesOf(code).length;
  return fitTitleW([
    ...(k > 1 ? [`Apple Store ${NAME[code]} : stock iPhone Duo en direct dans les ${N(code, k)} magasins`] : []),
    `Apple Store ${NAME[code]} : stock iPhone Duo en direct`,
    `Apple Store ${NAME[code]} : stock iPhone en direct`,
  ], 70);
}

function homeTitle(code: CountryCode): string {
  const stores = storesOf(code);
  const k = stores.length;
  if (k === 1) {
    const city = cityLabel(code, stores[0].city, L(code));
    return fitTitleW([`Apple Store ${NAME[code]} : stock iPhone Duo à ${city}, en direct`, `Apple Store ${NAME[code]} : stock iPhone Duo à ${city}`, `Stock iPhone Duo ${IN[code]} : ${apple(stores[0])}`]);
  }
  return fitTitleW([
    `Stock iPhone Duo ${IN[code]} : les ${N(code, k)} Apple Store, toutes les 15 s`,
    `Stock iPhone Duo ${IN[code]} : ${N(code, k)} Apple Store, toutes les 15 s`,
    `Stock iPhone ${IN[code]} : ${N(code, k)} Apple Store en direct`,
  ]);
}

function homeH1(code: CountryCode): string {
  const stores = storesOf(code);
  const k = stores.length;
  if (k === 1) {
    const city = cityLabel(code, stores[0].city, L(code));
    return `Stock iPhone en direct à l’Apple Store ${/^[aeiouyhâéèêîôû]/i.test(city) ? `d’${city}` : `de ${city}`}`;
  }
  return `Stock iPhone en direct dans les ${N(code, k)} Apple Store ${IN[code]}`;
}

function allStoresPhrase(code: CountryCode): string {
  const k = storesOf(code).length;
  return k === 1 ? `l’Apple Store ${IN[code]}` : `les ${N(code, k)} Apple Store ${IN[code]}`;
}

function spreadPhrase(code: CountryCode): string {
  const c = COUNTRIES[code];
  const lg = L(code);
  const regions = statesWithStores(code);
  const cities = citiesWithStores(code);
  const k = storesOf(code).length;
  const villes = plural(lg, cities.length, { one: "# ville", other: "# villes" });
  if (k === 1) return `à ${cityLabel(code, cities[0].name, lg)}`;
  if (cities.length === 1) return `tous à ${cityLabel(code, cities[0].name, lg)}`;
  if (!c.regionNoun || regions.length === 1) return `dans ${villes}`;
  const nn = noun(c);
  return `dans ${villes} ${cities.length === 1 ? "répartie" : "réparties"} sur ${N(code, regions.length)} ${regions.length === 1 ? nn.one : nn.other}`;
}

function modelPageTitles(code: CountryCode, model: ModelKey): { title: string; h2: string[] } {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const all = k === 1 ? "dans l’Apple Store" : `dans les ${N(code, k)} Apple Store`;
  return {
    title: fitTitleW([`${m.name} en stock ${IN[code]} : en direct ${all}`, `${m.name} en stock ${IN[code]} : en direct`, `Stock ${m.name} ${IN[code]}`], 70),
    h2: [`${m.name} près de chez moi : quels magasins ${IN[code]} l’ont en ce moment ?`, priceSection(code, NAME[code], undefined, model).h2],
  };
}

function modelIntro(code: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = cc.priceRange(code, model);
  const p = code === "ca" ? `**${money(code, r.low)}** avant taxes` : `**${money(code, r.low)}**, ${taxNote(code)}`;
  const now = inStock === 0
    ? (k === 1 ? `**L’Apple Store** ${IN[code]} n’affiche pas l’${m.name} en retrait en ce moment` : `**Aucun** des ${N(code, k)} Apple Store ${IN[code]} n’affiche l’${m.name} en retrait en ce moment`)
    : `**${N(code, inStock)} ${k === 1 ? "sur 1" : `des ${N(code, k)}`}** Apple Store ${IN[code]} ${inStock === 1 ? "affiche" : "affichent"} l’${m.name} en retrait en ce moment`;
  return `${now} (vérifiés **toutes les 15 secondes**) ; prix à partir de ${p}.`;
}

function modelDescription(code: CountryCode, model: ModelKey, inStock: number): string {
  const m = modelByKey(model)!;
  const k = storesOf(code).length;
  const r = cc.priceRange(code, model);
  const of = k === 1 ? `${N(code, inStock)} sur 1` : `${N(code, inStock)} des ${N(code, k)}`;
  return fitTitleW([
    `L’${m.name} est-il en stock ${IN[code]} ? ${of} Apple Store l’ont en retrait en ce moment. En direct par magasin et configuration, dès ${money(code, r.low)}${code === "ca" ? " avant taxes" : ""}, avec les heures de retour en stock.`,
    `${m.name} ${IN[code]} : ${of} Apple Store l’ont en ce moment. Stock de retrait en direct par magasin et configuration, retours en stock et alertes.`,
  ], 155);
}

function modelRows(code: CountryCode, storesNow: Record<ModelKey, number>, restocks: Record<ModelKey, number>): string[][] {
  const prefix = code === "us" ? "" : `/${code}`;
  return MODELS.map((m) => [`[${m.name}](${prefix}/stock/${m.slug})`, N(code, catalogFor(m.key, code).length), N(code, storesNow[m.key] ?? 0), N(code, restocks[m.key] ?? 0)]);
}

function homeDescription(code: CountryCode): string {
  const k = storesOf(code).length;
  return `Le stock en retrait des iPhone Duo, 18 Pro et 18 Pro Max dans ${allStoresPhrase(code)}, vérifié en direct toutes les 15 secondes. ${k === 1 ? "Prix" : "Heures de retour en stock, prix"} en ${COUNTRIES[code].currency} ; une notification dès que votre magasin est réapprovisionné.`;
}

function homeIntro(code: CountryCode): string {
  const k = storesOf(code).length;
  const of = k === 1 ? "sur 1" : `des ${N(code, k)}`;
  return `En ce moment, l’iPhone Duo est en stock pour le retrait dans **{{duo.storesNow}} ${of}** Apple Store ${IN[code]}, l’iPhone 18 Pro dans **{{pro.storesNow}}** et l’iPhone 18 Pro Max dans **{{pm.storesNow}}**.`;
}

function homeSections(i: HomeCopyInput): KeywordSection[] {
  const code = i.cc;
  const c = COUNTRIES[code];
  const stores = storesOf(code);
  const k = stores.length;
  const lg = L(code);
  return [
    {
      id: "iphone-stock",
      h2: `Stock iPhone ${IN[code]} : Duo, 18 Pro et Pro Max magasin par magasin`,
      lead: `PickupChecker lit la disponibilité en retrait en magasin d’apple.com pour chaque configuration dans ${allStoresPhrase(code)} toutes les 15 secondes, par magasin${k > 1 ? `, par ${c.regionNoun ? noun(c).one : "ville"}` : ""} et par configuration.`,
      blocks: [
        { t: "table", head: ["Modèle", "Configurations", "Magasins avec du stock", "Retours en stock enregistrés"], rows: modelRows(code, i.storesNow, i.restocks), caption: `Ce que couvre la vérification ${IN[code]} · état au {{asOf}}` },
        { t: "ul", items: [
          `**Couverture :** ${spreadPhrase(code)} · les prix et références sont ceux d’Apple ${IN[code]}`,
          "**Chaque magasin toutes les 15 secondes**, ceux de vos alertes toutes les 5",
          "**Deux vérifications pour compter :** une réponse erronée d’apple.com ne devient jamais un faux retour en stock ni une fausse rupture",
          `**Chaque changement confirmé** entre dans le [journal des retours en stock](${i.restocksPath}), qui alimente les graphiques de ${i.index?.indexable ? `[chaque page magasin](${i.index.path})` : "la page du magasin"}`,
        ] },
        { t: "img", id: "phone-notification" },
      ],
    },
    priceSection(code, NAME[code]),
    {
      id: "alerts",
      h2: `Alertes de stock Apple Store ${IN[code]} : comment ça marche ?`,
      lead: `Consulter le stock est gratuit ; ce qui est payant, c’est de ne plus avoir à le consulter. Choisissez ${k === 1 ? "l’Apple Store" : "les Apple Store"} où vous pouvez aller et l’iPhone exact : votre téléphone reçoit une notification quelques secondes après que ${k === 1 ? "le magasin" : "l’un d’eux"} l’affiche en retrait en magasin.`,
      blocks: [
        { t: "ol", items: [
          "Touchez **M’alerter** et choisissez l’iPhone, la capacité et la couleur.",
          k === 1 ? `Cochez le magasin : ${apple(stores[0])} à ${cityLabel(code, stores[0].city, lg)}.` : "Cochez les magasins où vous pouvez vous rendre ; les plus proches s’affichent en premier, avec la distance par la route en kilomètres et le temps de trajet.",
          "Sur iPhone, ajoutez PickupChecker à l’écran d’accueil et autorisez les notifications ([comment l’installer](/install)).",
          "Quand la notification arrive, ouvrez apple.com depuis celle-ci et payez en choisissant le retrait dans ce magasin.",
        ] },
        { t: "table", head: ["Formule", "Prix (USD)", "Alertes"], rows: [["Plus", "$5 / mois", "10"], ["Pro", "$10 / mois", "20"], ["Max", "$20 / mois", "50"]], caption: "Une alerte = un magasin × une configuration exacte · consulter le stock est gratuit ([tarifs](/pricing))" },
        { t: "note", text: "**Notre avis :** l’iPhone Duo mérite une alerte dans chaque magasin accessible ; pour les 18 Pro et Pro Max, regardez d’abord les chiffres en direct." },
        { t: "img", id: "apple-store-pickup-counter" },
      ],
    },
  ];
}

function homeFaq(code: CountryCode, rt: RestockTimesBrief): Faq[] {
  const k = storesOf(code).length;
  const p = code === "us" ? "" : `/${code}`;
  const count = plural(L(code), rt.n, { one: "# retour en stock confirmé", other: "# retours en stock confirmés" });
  const where = rt.storesTotal === 1 ? "" : ` dans ${N(code, rt.stores)} des ${N(code, rt.storesTotal)} magasins`;
  const when = rt.n === 0
    ? `Aucun confirmé depuis le début du suivi, le 2 novembre. [Quand Apple réapprovisionne-t-il l’iPhone Duo ${IN[code]} ?](${rt.path}) les compte un par un, par heure locale et par jour.`
    : rt.peakHour != null
      ? `La plupart arrivent vers **${hour(L(code), rt.peakHour, true)}, heure locale** : ${count}${where} depuis le 2 novembre. [Heure par heure et jour par jour](${rt.path}).`
      : `${cap(count)}${where} depuis le 2 novembre, sur trop peu de jours pour dégager une heure habituelle. [Heure par heure et jour par jour](${rt.path}).`;
  return [
    { q: `Quels Apple Store ${IN[code]} ont l’iPhone Duo en ce moment ?`, a: `{{duo.storesNow}} sur ${N(code, k)} à la dernière vérification ({{asOf}}). [Stock iPhone Duo ${IN[code]}](${p}/stock/iphone-duo) détaille chaque magasin et chaque configuration, mis à jour toutes les 15 secondes.` },
    { q: `Quand Apple réapprovisionne-t-il l’iPhone Duo ${IN[code]} ?`, a: when },
    { q: "Les alertes sont-elles rapides ?", a: `Les magasins de vos alertes sont vérifiés toutes les 5 secondes, ${k === 1 ? `l’Apple Store ${IN[code]}` : `chaque Apple Store ${IN[code]}`} toutes les 15. Un premier « disponible » est revérifié dans la seconde, pour qu’un bug d’Apple ne devienne jamais une alerte, et la notification arrive sur votre téléphone environ 3 secondes plus tard.` },
    { q: "Combien ça coûte ?", a: "Le stock en direct, la carte et le journal des retours en stock sont gratuits. Les alertes : Plus à $5/mois pour 10, Pro à $10 pour 20 et Max à $20 pour 50, facturées en dollars américains ; résiliable à tout moment ([tarifs](/pricing))." },
    taxFaq(code, NAME[code]),
    { q: "Pouvez-vous me réserver le téléphone ?", a: `Non. Nous vous prévenons dès qu’un magasin l’affiche ; vous l’achetez sur apple.com avec retrait en magasin, et Apple le met de côté pour vous ([aide d’Apple sur le retrait](${pickupHelpFr(code).url})).` },
  ];
}

const homeLabels: Dict["place"]["home"] = {
  appName: (code) => `PickupChecker : stock iPhone ${IN[code]}`,
  offer: "Stock en direct, carte et journal des retours gratuits ; alertes dès $5/mois",
  itemList: (code) => `Apple Store ${IN[code]}`,
  restockTimesChip: "Quand il revient en stock",
  storesByRegion: (code) => `Magasins par ${noun(COUNTRIES[code]).one}`,
  browse: (code) => `Parcourir le stock ${IN[code]}`,
  selloutH2: (code) => `En combien de temps un retour en stock d’iPhone est-il épuisé ${IN[code]} ?`,
  selloutLabel: (code) => `dans les Apple Store ${IN[code]}`,
  last24Label: (code) => IN[code],
  newsroom: "Apple Newsroom : l’iPhone Duo arrive dans les Apple Store du monde entier (23 octobre 2026, en anglais)",
};

/** Store <title> and H1: the store as people search it ("Apple Champs-Élysées", "Apple Store Lille"), then the promise. */
export function storeTitleVariants(lead: string, region: string | null): string[] {
  const r = region ? ` (${region})` : "";
  return [
    `${lead}${r} : stock iPhone du jour, retrait et horaires`,
    `${lead}${r} : stock iPhone, retrait et horaires`,
    `${lead}${r} : stock iPhone et horaires`,
    `${lead} : stock iPhone du jour, retrait et horaires`,
    `${lead} : stock iPhone, retrait et horaires`,
    `${lead} : stock iPhone et horaires`,
    `${lead} : stock iPhone`,
    `${lead} – stock`,
  ];
}

function storeTitle(s: Store, region?: string): string {
  const lg = L(s.country);
  // A store named after its city ("Lille", "Brussels") reads as people search it: "Apple Store Lille", "Apple Store Bruxelles".
  const lead = s.name === s.city ? `Apple Store ${cityLabel(s.country, s.city, lg)}` : appleStoreLabel(s, lg);
  const shown = region && !lead.toLowerCase().includes(region.toLowerCase()) && !s.name.toLowerCase().includes(region.toLowerCase()) ? region : null;
  return fitTitleW(storeTitleVariants(lead, shown));
}

export const place: Dict["place"] = {
  sinceWhen,
  placeLabel: labelOf,
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
  sources: (code) => ({ pickupHelp: pickupHelpFr(code), storeList: storeListFr(code), tax: taxSource(code) }),
};
