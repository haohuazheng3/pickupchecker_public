/**
 * French helpers shared by the French dictionaries (France, Belgium, Switzerland, Canada): the language tag for a
 * country's formats (Canada reads fr-CA: "1 649 $", "9 h 04"), country names with their preposition ("en France",
 * "au Canada"), region nouns with their gender, place prepositions ("dans le Rhône", "au Québec") and French
 * typography (narrow no-break space before ; ? ! %, no-break space before : and inside « »). Client-safe, no React.
 */
import type { Country, CountryCode } from "@/lib/apple/countries";
import type { Lang } from "@/lib/i18n/locales";

/** The format language for a country's numbers, prices and dates. */
export const L = (cc?: CountryCode | null): Lang => (cc === "ca" ? "fr-CA" : "fr");

/** Country names as French writes them (Intl says "R.A.S. chinoise de Hong Kong"). */
export const NAME: Record<CountryCode, string> = {
  us: "États-Unis", ca: "Canada", au: "Australie", uk: "Royaume-Uni", de: "Allemagne", fr: "France", it: "Italie", es: "Espagne",
  jp: "Japon", sg: "Singapour", hk: "Hong Kong", ae: "Émirats arabes unis", ch: "Suisse", nl: "Pays-Bas", se: "Suède",
  at: "Autriche", be: "Belgique", kr: "Corée du Sud", tw: "Taïwan",
};
/** "en France", "au Canada", "aux États-Unis". */
export const IN: Record<CountryCode, string> = {
  us: "aux États-Unis", ca: "au Canada", au: "en Australie", uk: "au Royaume-Uni", de: "en Allemagne", fr: "en France", it: "en Italie",
  es: "en Espagne", jp: "au Japon", sg: "à Singapour", hk: "à Hong Kong", ae: "aux Émirats arabes unis", ch: "en Suisse",
  nl: "aux Pays-Bas", se: "en Suède", at: "en Autriche", be: "en Belgique", kr: "en Corée du Sud", tw: "à Taïwan",
};
/** "de France", "du Canada", "des États-Unis". */
export const OF: Record<CountryCode, string> = {
  us: "des États-Unis", ca: "du Canada", au: "d’Australie", uk: "du Royaume-Uni", de: "d’Allemagne", fr: "de France", it: "d’Italie",
  es: "d’Espagne", jp: "du Japon", sg: "de Singapour", hk: "de Hong Kong", ae: "des Émirats arabes unis", ch: "de Suisse",
  nl: "des Pays-Bas", se: "de Suède", at: "d’Autriche", be: "de Belgique", kr: "de Corée du Sud", tw: "de Taïwan",
};

/** A country's word for its regions (Apple's store-list level), singular and plural, and whether it is feminine. */
export interface Noun { one: string; other: string; f: boolean }
const NOUNS: Record<string, Noun> = {
  state: { one: "État", other: "États", f: false },
  province: { one: "province", other: "provinces", f: true },
  area: { one: "région", other: "régions", f: true },
  department: { one: "département", other: "départements", f: false },
  prefecture: { one: "préfecture", other: "préfectures", f: true },
  emirate: { one: "émirat", other: "émirats", f: false },
  canton: { one: "canton", other: "cantons", f: false },
  region: { one: "région", other: "régions", f: true },
  county: { one: "comté", other: "comtés", f: false },
  city: { one: "ville", other: "villes", f: true },
};
const LAND: Noun = { one: "Land", other: "Länder", f: false };
export function noun(c: Pick<Country, "cc" | "regionNoun">): Noun {
  if (c.cc === "de" || c.cc === "at") return LAND;
  return NOUNS[c.regionNoun ?? "area"] ?? NOUNS.area;
}
export const NOUN_FORMS = NOUNS;
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * "dans le Rhône", "en Gironde", "au Québec", "à Paris": a place after "in". Regions of the French-speaking countries
 * take their own preposition; anything else (a city) takes "à". Quebec City has no city page, so "Québec" here is
 * always the province.
 */
const PREP: Record<string, string> = {
  "Alpes-Maritimes": "dans les Alpes-Maritimes",
  "Bas-Rhin": "dans le Bas-Rhin",
  "Bouches-du-Rhône": "dans les Bouches-du-Rhône",
  "Côte d’Or": "en Côte d’Or",
  Gironde: "en Gironde",
  "Hauts-de-Seine": "dans les Hauts-de-Seine",
  Hérault: "dans l’Hérault",
  "Loire-Atlantique": "en Loire-Atlantique",
  "Nord-Pas-de-Calais": "dans le Nord-Pas-de-Calais",
  Rhône: "dans le Rhône",
  "Seine-et-Marne": "en Seine-et-Marne",
  "Seine-Saint-Denis": "en Seine-Saint-Denis",
  Yvelines: "dans les Yvelines",
  "Région de Bruxelles-Capitale": "en Région de Bruxelles-Capitale",
  "Bâle-Ville": "à Bâle-Ville",
  Alberta: "en Alberta",
  "Colombie-Britannique": "en Colombie-Britannique",
  Manitoba: "au Manitoba",
  "Nouvelle-Écosse": "en Nouvelle-Écosse",
  Ontario: "en Ontario",
  Québec: "au Québec",
};
const COUNTRY_IN = new Map(Object.entries(NAME).map(([k, v]) => [v, IN[k as CountryCode]]));
/** A country's own name ("France", "Canada") takes its preposition too: "en France", "au Canada". */
export const dans = (place: string): string => PREP[place] ?? COUNTRY_IN.get(place) ?? `à ${place}`;

/** French typography on a finished string: no-break spaces before : » and after «, narrow ones before ; ? ! %. */
export function typo(s: string): string {
  return s.replace(/ ([:;?!%»])/g, (_m, p: string) => `${p === ":" || p === "»" ? " " : " "}${p}`).replace(/« /g, "« ");
}
/** typo() over plain data (strings, arrays, objects): client dictionaries and notification texts. */
export function typoData<T>(d: T): T {
  if (typeof d === "string") return typo(d) as T;
  if (Array.isArray(d)) return d.map((x) => typoData(x)) as T;
  if (typeof d === "function") return ((...a: unknown[]) => typoData((d as (...x: unknown[]) => unknown)(...a))) as T;
  if (d && typeof d === "object") return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typoData(v)])) as T;
  return d;
}
