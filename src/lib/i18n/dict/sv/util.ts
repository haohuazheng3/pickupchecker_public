/**
 * Swedish helpers shared by the sv dictionaries (pure, server and test safe): numbers, plurals, prices, durations,
 * Apple Sweden's colour names inside product names, the country's name and its tax wording.
 */
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import type { Store } from "@/lib/apple/catalog";
import { fitTitleW, hour, list, num, pct, plural, price, secs, unit } from "@/lib/i18n/format";
import { appleStoreLabel, colorLabel, countryLabel } from "@/lib/i18n/places";
import { includedRate } from "@/content/country-tax";

export const SV = "sv" as const;

/** 12 345 */
export const n = (x: number): string => num(SV, x);
/** 25 → "25 %" */
export const pc = (x: number): string => pct(SV, x);
/** A share 0–1 as a whole percent; under half a percent "<1 %", never a misleading "0 %". */
export const share = (x: number): string => (x > 0 && x < 0.005 ? "<1 %" : pct(SV, Math.round(x * 100)));
/** "1 butik" / "3 butiker". */
export const pl = (x: number, one: string, other: string): string => plural(SV, x, { one: `# ${one}`, other: `# ${other}` });
/** "a, b och c"; beyond `max`: "a, b, c och 4 till". */
export const words = (items: string[], max = 6): string => list(SV, items, max, (k) => `${n(k)} till`);
export const fit = fitTitleW;
export const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "Sverige", "USA", "Storbritannien". */
export const land = (cc: CountryCode): string => countryLabel(cc, SV);
/** A price in the country's currency, Swedish style ("26 995 kr"). */
export const kr = (cc: CountryCode, v: number): string => price(SV, COUNTRIES[cc], v);
/** "Apple Mall of Scandinavia". */
export const apple = (s: Pick<Store, "storeNumber" | "name">): string => appleStoreLabel(s, SV);
/** "kl. 9" */
export const klock = (h: number): string => hour(SV, h);
/** "kl. 9–11" (a window of local hours [from, to)). */
export const range = (from: number, to: number): string => `kl. ${from}–${to % 24}`;
/** "mellan kl. 9 och 11". */
export const between = (from: number, to: number): string => `mellan kl. ${from} och ${to % 24}`;

/** How long stock stayed listed: "under en minut", "12 min", "2 tim 15 min", "3 d 4 tim". */
export function dur(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return "under en minut";
  const m = Math.floor(s / 60);
  if (m < 60) return unit(SV, m, "m");
  const h = Math.floor(m / 60);
  if (h < 24) return secs(SV, m * 60);
  const d = Math.floor(h / 24);
  return h % 24 ? `${unit(SV, d, "d")} ${unit(SV, h % 24, "h")}` : unit(SV, d, "d");
}

const COLORS = ["Night Sky", "Star White", "Burgundy", "Glacier", "Silver", "Black"];
/** Apple Sweden's colour name ("natthimmel"). */
export const color = (c: string): string => colorLabel(c, SV);
/** "iPhone Duo 256GB Night Sky" → "iPhone Duo 256GB natthimmel": a product or configuration name as Apple Sweden writes it. */
export function prod(name: string): string {
  for (const c of COLORS) {
    if (name === c) return colorLabel(c, SV);
    if (name.endsWith(` ${c}`)) return `${name.slice(0, -c.length)}${colorLabel(c, SV)}`;
  }
  return name;
}

/** What a country's stores are grouped by. Sweden's groups (Skåne, Solna, Uppland) are no single kind of area: "område". */
const NOUN: Record<string, [string, string]> = {
  state: ["delstat", "delstater"],
  province: ["provins", "provinser"],
  area: ["område", "områden"],
  department: ["departement", "departement"],
  prefecture: ["prefektur", "prefekturer"],
  emirate: ["emirat", "emirat"],
  canton: ["kanton", "kantoner"],
  county: ["område", "områden"],
  region: ["region", "regioner"],
  city: ["stad", "städer"],
};
export const NOUNS = NOUN;
export function noun(c: Pick<Country, "regionNoun">, plural = false): string {
  const f = NOUN[c.regionNoun ?? "area"] ?? NOUN.area;
  return plural ? f[1] : f[0];
}

/** The tax inside the price, in Swedish: "moms", "GST", "konsumtionsskatt". */
export function taxWord(c: Country): string {
  if (/^VAT/.test(c.taxNote)) return "moms";
  if (/^GST/.test(c.taxNote)) return "GST";
  if (/^consumption tax/.test(c.taxNote)) return "konsumtionsskatt";
  return "skatt";
}
/** One phrase after a price: "inkl. moms (25 %)". */
export function taxNote(c: Country): string {
  if (c.cc === "us") return "exkl. delstaternas försäljningsskatt";
  if (c.cc === "ca") return "exkl. GST/HST och provinsskatt";
  const r = includedRate(c);
  if (r == null) return "ingen moms i Hongkong";
  return `inkl. ${taxWord(c)} (${pc(r)})`;
}
