/** The country list the header switch and the footer show (server: whether each has a store index needs its stores). */
import { placeTarget } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES } from "@/lib/apple/countries";
import { LANGS } from "@/lib/i18n/locales";
import { countryLabel } from "@/lib/i18n/places";
import type { SwitchCountry } from "./CountrySwitcher";

let cached: SwitchCountry[] | null = null;
export function switchCountries(): SwitchCountry[] {
  cached ??= ALL_CODES.map((cc) => ({
    cc, name: COUNTRIES[cc].name, short: COUNTRIES[cc].short, index: Boolean(placeTarget(cc)?.indexable),
    names: Object.fromEntries(LANGS.filter((l) => l !== "en").map((l) => [l, countryLabel(cc, l)])),
  }));
  return cached;
}
