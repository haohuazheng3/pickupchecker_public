import type { CountryCode } from "@/lib/apple/countries";

/** The country listed most often (ties: the US first, then the first seen). */
function most(list: CountryCode[]): CountryCode | undefined {
  const counts = new Map<CountryCode, number>();
  for (const c of list) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] === "us" ? -1 : b[0] === "us" ? 1 : 0))[0]?.[0];
}

/**
 * Which country's phones (prices) and stores the /account alert editor opens on.
 *
 * 1. the country most of the member's active rules are in;
 * 2. with none active, the country of the rules they had before (switched off, not deleted);
 * 3. else the country of the language they use the site in (users.locale → page locale: de-de → de);
 * 4. else the US.
 *
 * Steps 2–3 exist because of a 2026-11-11 ops-review finding: a German Plus member (locale de-de) unticked
 * both Frankfurt stores and the editor fell straight back to the US list — dollar prices and "Maine Mall
 * ≈6,963 km" pre-ticked as nearest store — before they cancelled.
 */
export function editorHomeCountry(active: CountryCode[], past: CountryCode[], localeCountry?: CountryCode): CountryCode {
  return most(active) ?? most(past) ?? localeCountry ?? "us";
}
