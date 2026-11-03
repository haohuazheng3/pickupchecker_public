/**
 * German helpers shared by the German server strings: country names with the right preposition ("in der
 * Schweiz", "in den USA"), the tax inside Apple's price (MwSt. / MWST), money and numbers the way the page's
 * country writes them (Swiss pages: "CHF 1'449"), and model names with Apple's German colour names.
 * Standard German with ß: Swiss pages are derived automatically (ß → ss).
 */
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { includedRate } from "@/content/country-tax";
import { fitTitleW, num, pct as pctIn, price, hour, titleWidth, type Forms, plural as pluralIn } from "@/lib/i18n/format";
import { colorLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";

export const LANG: Lang = "de";
/** Numbers and money as the country writes them: Swiss pages "1'449", "CHF 1'449". */
export const fmtLang = (cc?: CountryCode): Lang => (cc === "ch" ? "de-CH" : "de");
export const n = (x: number, cc?: CountryCode): string => num(fmtLang(cc), x);
export const pct = (x: number): string => pctIn(LANG, x);
export const money = (c: Country, v: number): string => price(fmtLang(c.cc), c, v);
/** "# Restock" forms → "31 Restocks". */
export const count = (x: number, f: Forms, cc?: CountryCode): string => pluralIn(fmtLang(cc), x, f);
export const plural = (x: number, one: string, other: string, cc?: CountryCode): string => count(x, { one: `# ${one}`, other: `# ${other}` }, cc);
/** "9 Uhr", "9–11 Uhr". */
export const uhr = (h: number): string => hour(LANG, h % 24);
export const span = (from: number, to: number): string => `${from % 24}–${to % 24} Uhr`;

/** The country in German: its short name and the phrase after a place ("in der Schweiz"). */
const LAND: Record<CountryCode, { name: string; in: string }> = {
  us: { name: "USA", in: "in den USA" },
  ca: { name: "Kanada", in: "in Kanada" },
  au: { name: "Australien", in: "in Australien" },
  uk: { name: "Großbritannien", in: "in Großbritannien" },
  de: { name: "Deutschland", in: "in Deutschland" },
  fr: { name: "Frankreich", in: "in Frankreich" },
  it: { name: "Italien", in: "in Italien" },
  es: { name: "Spanien", in: "in Spanien" },
  jp: { name: "Japan", in: "in Japan" },
  sg: { name: "Singapur", in: "in Singapur" },
  hk: { name: "Hongkong", in: "in Hongkong" },
  ae: { name: "VAE", in: "in den VAE" },
  ch: { name: "Schweiz", in: "in der Schweiz" },
  nl: { name: "Niederlande", in: "in den Niederlanden" },
  se: { name: "Schweden", in: "in Schweden" },
  at: { name: "Österreich", in: "in Österreich" },
  be: { name: "Belgien", in: "in Belgien" },
  kr: { name: "Südkorea", in: "in Südkorea" },
  tw: { name: "Taiwan", in: "in Taiwan" },
};
export const land = (cc: CountryCode): string => LAND[cc].name;
export const inLand = (cc: CountryCode): string => LAND[cc].in;

/** Names that need an article after "in" (Intl's long names included). */
const WITH_ARTICLE: Record<string, string> = {
  Schweiz: "in der Schweiz",
  USA: "in den USA",
  "Vereinigte Staaten": "in den Vereinigten Staaten",
  "Vereinigtes Königreich": "im Vereinigten Königreich",
  Niederlande: "in den Niederlanden",
  VAE: "in den VAE",
  "Vereinigte Arabische Emirate": "in den Vereinigten Arabischen Emiraten",
  "Sonderverwaltungsregion Hongkong": "in Hongkong",
};
/** "in München", "in der Schweiz": a place name (already German) after "in". */
export const inOrt = (name: string): string => WITH_ARTICLE[name] ?? (/^Kanton /.test(name) ? `im ${name}` : `in ${name}`);
/** The bare name for headings: Intl's long Hong Kong name shortened. */
export const ort = (name: string): string => (name === "Sonderverwaltungsregion Hongkong" ? "Hongkong" : name);

/** The tax inside Apple's price: its name and rate; null rate = none (Hong Kong) or added on top (US, Canada). */
export function steuer(c: Country): { name: string; rate: number | null } {
  const name = c.cc === "ch" ? "MWST" : c.cc === "jp" ? "Verbrauchsteuer" : c.cc === "au" || c.cc === "sg" ? "GST" : c.cc === "ca" ? "GST/HST" : c.cc === "us" ? "Sales Tax" : "MwSt.";
  return { name, rate: includedRate(c) };
}
/** "inkl. 19 % MwSt.", "inkl. 8,1 % MWST", Canada "zzgl. Steuern der Provinz", Hong Kong "ohne Umsatzsteuer". */
export function taxNote(c: Country): string {
  const t = steuer(c);
  if (t.rate != null) return `inkl. ${pct(t.rate)} ${t.name}`;
  if (c.cc === "ca") return "zzgl. GST/HST und Provinzsteuer";
  if (c.cc === "us") return "zzgl. Sales Tax je nach Bundesstaat";
  return "ohne Umsatzsteuer (Hongkong)";
}

/** Apple's German colour names inside a model name from the English data ("iPhone Duo 512GB Night Sky" → "… Nachthimmel"). */
const COLORS = ["Night Sky", "Star White", "Black", "Burgundy", "Glacier", "Silver"];
export function modelDe(name: string): string {
  let out = name;
  for (const c of COLORS) out = out.replace(new RegExp(`\\b${c}\\b`), colorLabel(c, LANG));
  return out;
}

/** A region of a country in German: "Bundesland", "Kanton" (with plural). */
const REGION_WORD: Record<string, { one: string; other: string }> = {
  state: { one: "Bundesland", other: "Bundesländer" },
  province: { one: "Provinz", other: "Provinzen" },
  area: { one: "Region", other: "Regionen" },
  department: { one: "Département", other: "Départements" },
  prefecture: { one: "Präfektur", other: "Präfekturen" },
  emirate: { one: "Emirat", other: "Emirate" },
  canton: { one: "Kanton", other: "Kantone" },
  region: { one: "Region", other: "Regionen" },
  county: { one: "Provinz", other: "Provinzen" },
  city: { one: "Stadt", other: "Städte" },
};
/** The US and Australia have states, Germany and Austria Bundesländer. */
export function regionWord(c: Country, many = false): string {
  if ((c.cc === "us" || c.cc === "au") && c.regionNoun === "state") return many ? "Bundesstaaten" : "Bundesstaat";
  const w = REGION_WORD[c.regionNoun ?? "area"] ?? REGION_WORD.area;
  return many ? w.other : w.one;
}
export const REGION_FORMS = REGION_WORD;
export { COUNTRIES };

/** "Ganz Bayern", "Die ganze Schweiz": a whole place, at the start of a label. */
const WHOLE: Record<string, string> = { Schweiz: "Die ganze Schweiz", Niederlande: "Die ganzen Niederlande", USA: "Die ganzen USA", VAE: "Die ganzen VAE" };
export const ganz = (name: string): string => WHOLE[name] ?? `Ganz ${ort(name)}`;
/** "in ganz Deutschland", "in der ganzen Schweiz". */
const ACROSS: Partial<Record<CountryCode, string>> = { ch: "in der ganzen Schweiz", nl: "in den ganzen Niederlanden", us: "in den ganzen USA", ae: "in den ganzen VAE" };
export const ganzIn = (cc: CountryCode): string => ACROSS[cc] ?? `in ganz ${land(cc)}`;
/** Dative plural of a region word, after "in": "in 8 Bundesländern", "in 3 Kantonen". */
const DATIVE: Record<string, string> = { Bundesländer: "Bundesländern", Kantone: "Kantonen", Emirate: "Emiraten", Städte: "Städten" };
export const dativ = (plural: string): string => DATIVE[plural] ?? plural;
/** "Bundesland" → capitalised for headings (German nouns already are; kept for symmetry). */
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * fitTitleW for German: measures each variant as Swiss pages print it (ß → ss is one character longer), so a
 * title that fits in Germany never runs over in Switzerland.
 */
export function fitDe(variants: string[], max = 60, cc?: CountryCode): string {
  const swiss = cc === undefined || cc === "ch";
  for (const v of variants) if (titleWidth(swiss ? v.replace(/ß/g, "ss") : v) <= max) return v;
  return fitTitleW(variants, swiss ? max - 1 : max);
}
/** "zwischen 9 und 11 Uhr". */
export const zwischen = (from: number, to: number): string => `zwischen ${from % 24} und ${to % 24} Uhr`;
/** A model's short name inside a compound: "18 Pro Max" → "18-Pro-Max" (→ "18-Pro-Max-Restocks"). */
export const hy = (s: string): string => s.trim().replace(/\s+/g, "-");
/** Ends a sentence once: "… inkl. 19 % MwSt." never gets a second period. */
export const satz = (s: string): string => (s.endsWith(".") ? s : `${s}.`);
