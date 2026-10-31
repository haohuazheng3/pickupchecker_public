/**
 * Where analytics need opt-in consent. FlowGlance (the only analytics) waits for "Accept" in the EU,
 * the EEA, the UK and Switzerland, and wherever we can't place the visitor; everywhere else it runs by
 * default and the footer's "Do not track me" turns it off. Shared by /api/geo and the client loader.
 */

/** EU 27 + Iceland, Liechtenstein, Norway (EEA) + United Kingdom + Switzerland. */
export const OPT_IN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
]);

/** An unknown country (local runs, privacy relays) asks first: the conservative default. */
export function consentRequiredFor(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toUpperCase();
  return !c || OPT_IN_COUNTRIES.has(c);
}

/** The visitor's choice: "granted" (Accept / Allow analytics) or "declined" (Decline / Do not track me). */
export const CONSENT_COOKIE = "pc_consent";
/** What /api/geo said ("ask" or "default"), so the lookup runs once per cookie lifetime, not on every page. */
export const REGION_COOKIE = "pc_region";
export const CHOICE_DAYS = 180;

export type Choice = "granted" | "declined";
export type Region = "ask" | "default";

export function choiceFrom(cookie: string): Choice | null {
  const m = cookie.match(/(?:^|;\s*)pc_consent=(granted|declined)(?:;|$)/);
  return m ? (m[1] as Choice) : null;
}

export function regionFrom(cookie: string): Region | null {
  const m = cookie.match(/(?:^|;\s*)pc_region=(ask|default)(?:;|$)/);
  return m ? (m[1] as Region) : null;
}

/**
 * Whether FlowGlance may run, or null while we still have to ask. An explicit choice always wins; a
 * Global Privacy Control signal counts as "Do not track me"; otherwise the region decides.
 */
export function analyticsAllowed(choice: Choice | null, region: Region, gpc: boolean): boolean | null {
  if (choice) return choice === "granted";
  if (gpc) return false;
  return region === "default" ? true : null;
}
