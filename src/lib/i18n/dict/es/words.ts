/**
 * Spanish (Spain) word helpers shared by the es server dictionaries: country phrases ("en España", "del Reino
 * Unido"), region nouns with their gender, the tax inside a price, hours ("las 9:00") and Apple's colour names
 * inside an English product name. Castilian, "tú", Apple España's wording («Recogida», «Disponible»).
 */
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { includedRate, taxName } from "@/content/country-tax";
import { num, price } from "@/lib/i18n/format";
import { colorLabel, countryLabel } from "@/lib/i18n/places";

export const L = "es" as const;

/** A number as Spain writes it ("1.234"; four digits stay "1234"). */
export const n = (x: number): string => num(L, x);
/** "21 %" (non-breaking space, any decimals kept: "14,975 %"). */
export const pc = (x: number): string => `${num(L, x)} %`;
/** A price in the store country's currency, as Spain writes it ("2339 €"). */
export const money = (c: Country | CountryCode, v: number): string => price(L, typeof c === "string" ? COUNTRIES[c] : c, v);

/** Short Spanish names where Intl's are long. */
const NAME: Partial<Record<CountryCode, string>> = { us: "Estados Unidos", hk: "Hong Kong" };
/** Names that take an article in Spanish. */
const ART: Partial<Record<CountryCode, string>> = { uk: "el Reino Unido", nl: "los Países Bajos", ae: "los Emiratos Árabes Unidos" };
/** "España", "Reino Unido". */
export const pais = (cc: CountryCode): string => NAME[cc] ?? countryLabel(cc, L);
const withArt = (cc: CountryCode): string => ART[cc] ?? pais(cc);
/** "en España", "en el Reino Unido". */
export const enPais = (cc: CountryCode): string => `en ${withArt(cc)}`;
/** "de España", "del Reino Unido", "de los Países Bajos". */
export const dePais = (cc: CountryCode): string => {
  const a = withArt(cc);
  return a.startsWith("el ") ? `del ${a.slice(3)}` : `de ${a}`;
};

/** A country's word for its regions (countries.ts regionNoun), with its gender. */
export interface Noun { one: string; other: string; f: boolean }
export const NOUNS: Record<string, Noun> = {
  state: { one: "estado", other: "estados", f: false },
  province: { one: "provincia", other: "provincias", f: true },
  area: { one: "zona", other: "zonas", f: true },
  department: { one: "departamento", other: "departamentos", f: false },
  prefecture: { one: "prefectura", other: "prefecturas", f: true },
  emirate: { one: "emirato", other: "emiratos", f: false },
  canton: { one: "cantón", other: "cantones", f: false },
  region: { one: "región", other: "regiones", f: true },
  // Sweden's län: "provincias" in Spanish.
  county: { one: "provincia", other: "provincias", f: true },
  city: { one: "ciudad", other: "ciudades", f: true },
};
export const noun = (c: Country, us = false): Noun => (us ? NOUNS.state : NOUNS[c.regionNoun ?? "area"] ?? NOUNS.area);
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "IVA", "GST", "impuesto sobre el consumo": the tax inside Apple's price. */
export function impuesto(c: Country): string {
  const t = taxName(c);
  return t === "VAT" ? "IVA" : t === "consumption tax" ? "impuesto sobre el consumo" : t === "sales tax" ? "impuesto sobre las ventas" : t;
}
/** What a price holds: "IVA incluido (21 %)"; Canada: before tax; Hong Kong: none. */
export function taxNote(c: Country): string {
  if (c.cc === "us") return "sin el impuesto sobre las ventas, que varía según el estado";
  if (c.cc === "ca") return "sin impuestos (GST/HST y los provinciales se suman aparte)";
  const r = includedRate(c);
  return r == null ? "sin IVA ni impuesto sobre las ventas" : `${impuesto(c)} incluido (${pc(r)})`;
}

/** "9:00" for a local hour (format.hour's Spanish form), "0:00" at midnight. */
export const h = (x: number): string => `${((x % 24) + 24) % 24}:00`;
/** "las 9:00" / "la 1:00". */
export const lasH = (x: number): string => `${((x % 24) + 24) % 24 === 1 ? "la" : "las"} ${h(x)}`;
/** "9:00–11:00". */
export const range = (from: number, to: number): string => `${h(from)}–${h(to)}`;
/** "entre las 9:00 y las 11:00". */
export const between = (from: number, to: number): string => `entre ${lasH(from)} y ${lasH(to)}`;

/** Apple's colour names inside an English product name: "iPhone Duo 256GB Night Sky" → "iPhone Duo 256GB Cielo nocturno". */
export const tc = (s: string): string => s.replace(/Night Sky|Star White|Black|Burgundy|Glacier|Silver/g, (m) => colorLabel(m, L));

/** An English hour label that reached a Spanish sentence ("10 AM", "noon") → "10:00". */
export function fixHour(s: string): string {
  if (s === "noon") return "12:00";
  if (s === "midnight") return "0:00";
  const m = s.match(/^(\d{1,2}) (AM|PM)$/);
  if (!m) return s;
  const x = Number(m[1]) % 12 + (m[2] === "PM" ? 12 : 0);
  return h(x);
}
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
/** An English weekday that reached a Spanish sentence → "lunes". */
export const fixDay = (s: string): string => (DAYS_EN.includes(s) ? DAYS_ES[DAYS_EN.indexOf(s)] : s);

/** "1 Apple Store" / "12 Apple Store": the brand stays invariable in Spanish, as Apple España writes it ("los Apple Store"). */
export const apples = (x: number): string => `${n(x)} Apple Store`;
/** "1 tienda" / "5 tiendas". */
export const tiendas = (x: number): string => `${n(x)} ${x === 1 ? "tienda" : "tiendas"}`;
/** "1 reposición" / "14 reposiciones". */
export const reposiciones = (x: number): string => `${n(x)} ${x === 1 ? "reposición" : "reposiciones"}`;
/** "1 ciudad" / "10 ciudades". */
export const ciudades = (x: number): string => `${n(x)} ${x === 1 ? "ciudad" : "ciudades"}`;
/** "1 día" / "3 días". */
export const dias = (x: number): string => `${n(x)} ${x === 1 ? "día" : "días"}`;
/** Verb agreement: "tiene" / "tienen". */
export const v = (x: number, one: string, many: string): string => (x === 1 ? one : many);

/** Countries Spanish treats as feminine ("toda España") vs masculine ("todo Japón"). */
const FEM_COUNTRIES = new Set<CountryCode>(["es", "fr", "it", "de", "ch", "se", "at", "be", "au", "kr"]);
/** "toda España", "todo Japón", "todo el Reino Unido", "todos los Países Bajos". */
export function todoPais(cc: CountryCode): string {
  const a = withArt(cc);
  if (a.startsWith("los ")) return `todos ${a}`;
  if (a.startsWith("el ")) return `todo ${a}`;
  return `${FEM_COUNTRIES.has(cc) ? "toda" : "todo"} ${a}`;
}
/** "los lunes", "los sábados". */
export const losDias = (day: string): string => { const d = fixDay(day); return /o$/.test(d) ? `los ${d}s` : `los ${d}`; };
/** Other trackers' published check intervals (plans.ts OTHER_TRACKERS), in Spanish. */
export function otherTrackers(en: string): string {
  const m = en.match(/^(\d+) seconds to (\d+) minutes$/);
  return m ? `de ${m[1]} segundos a ${m[2]} minutos` : en;
}
/** A duration after "about": "alrededor de 1 min", but "menos de un minuto" as it is. */
export const aprox = (d: string): string => (/^menos /.test(d) ? d : `alrededor de ${d}`);
