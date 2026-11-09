/**
 * "Evidence first" wording (2026-11-09): the Key facts list under the lead of every restock-times page, in all twelve
 * languages, and the decision page's configuration wording, which describes past listings and never turns them into a
 * chance of buying ("easiest to get", "doubles your chances").
 */
import { describe, expect, it } from "vitest";
import { catalogFor, storesOf } from "@/lib/apple/catalog";
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import { emptyRestockTimes, type RestockTimes } from "@/lib/content/restockTimes";
import { decideFrom, type RestockEvent } from "@/lib/content/duoDecide";
import { PATTERN_MIN } from "@/lib/content/siteFacts";
import { dict } from "@/lib/i18n/dict";
import { LANGS, type Lang } from "@/lib/i18n/locales";
import type { RestockTimesView } from "@/lib/i18n/dict/en/views";
import type { ConfigsView } from "@/lib/i18n/dict/en/decide";

const LANG_COUNTRY: Record<Lang, CountryCode> = {
  en: "uk", ja: "jp", ko: "kr", "zh-TW": "tw", "zh-HK": "hk", de: "de", "de-CH": "ch", fr: "fr", "fr-CA": "ca", it: "it", es: "es", nl: "nl", sv: "se", ar: "ae",
};
const NOW = new Date("2026-11-08T12:00:00Z");

/** A country view with a usual hour, a sell-out figure and 120 restocks, as the page builds it. */
function view(c: Country, pattern = true): RestockTimesView {
  const t: RestockTimes = { ...emptyRestockTimes(c.cc, NOW), n: 120, stores: 5, days: 6, spanDays: 6, peakHour: pattern ? 9 : null };
  t.byHour[9] = 48; t.byHour[10] = 42; t.byHour[18] = 30;
  t.sellout = pattern ? { n: 80, medianSec: 70, within2min: 0.7, within20min: 0.95, fastestSec: 12 } : null;
  return {
    c, t, w: { from: 9, to: 11, share: 0.75 }, pattern, us: c.cc === "us", one: false, tracked: 7, stores: 5, duoNow: 1, weekend: 10,
    sell: t.sellout, recent: { restocks: 4, stores: 2 }, configs: 8, pairs: 40, storageRatio: 1.5, reportNames: [], alert: `/${c.cc}?model=duo#notify`,
    logHref: `/${c.cc}/restocks`, storesHref: `/${c.cc}/stores`,
  };
}

describe("Key facts: five to seven self-contained sentences in every language", () => {
  for (const lang of LANGS) {
    it(lang, () => {
      const c = COUNTRIES[LANG_COUNTRY[lang]];
      const V = dict(lang).views.restockTimes;
      const store = storesOf(c.cc)[0];
      const k = { top: { label: "512GB Test", restocks: 54 }, latest: { config: "256GB Test", store, at: "2026-11-08T09:41:00Z" } };
      expect(V.keyFactsTitle.length).toBeGreaterThan(1);

      const full = V.keyFacts(view(c), k);
      expect(full).toHaveLength(7);
      expect(new Set(full).size).toBe(full.length);
      // Every fact but the method line names the phone; the numbers travel with their sentence.
      for (const s of full.slice(0, -1)) expect(s, `${lang}: ${s}`).toContain("iPhone Duo");
      expect(full[0]).toContain("120");
      expect(full[1]).toContain("75");
      expect(full[2]).toContain("48");
      expect(full[3]).toContain("70");
      expect(full[3]).toContain("80");
      expect(full[4]).toContain("512GB Test");
      expect(full[4]).toContain("54");
      expect(full[4]).toContain("45");
      expect(full[5]).toContain("256GB Test");

      // No usual hour yet (and no ten timed restocks): the threshold is said instead, the hour and listing lines go.
      const thin = V.keyFacts(view(c, false), k);
      expect(thin).toHaveLength(5);
      expect(thin[1]).toContain(String(PATTERN_MIN));
      expect(thin.join(" ")).not.toContain("70");
      // Without a latest restock or a top configuration the list still stands on its own.
      expect(V.keyFacts(view(c), { top: null, latest: null })).toHaveLength(5);
    });
  }
});

describe("English wording describes past listings, not a chance of buying", () => {
  const PROBABILITY = /\b(odds|chances?|easiest|hardest|doubles?|best bet|more likely)\b/i;

  it("restock-times configuration lines", () => {
    const V = dict("en").views.restockTimes;
    const x = view(COUNTRIES.uk);
    const text = (p: { text: unknown }) => JSON.stringify(p.text);
    for (const p of V.configKeys(x)) expect(text(p)).not.toMatch(PROBABILITY);
    for (const p of V.configKeys({ ...x, storageRatio: null })) expect(text(p)).not.toMatch(PROBABILITY);
    expect(V.measured).toContain("not how many units were sold");
  });

  it("the configuration page's body copy, and the second colour quantified in every language", () => {
    const items = catalogFor("duo", "us");
    const stores = storesOf("us").slice(0, 12).map((s) => s.storeNumber);
    const colours = [...new Set(items.map((i) => i.color))];
    const a = items.find((i) => i.color === colours[0])!, b = items.find((i) => i.color === colours[1])!;
    const ev: RestockEvent[] = [];
    for (let i = 0; i < 9; i++) ev.push({ storeNumber: stores[i], partNumber: a.partNumber, at: new Date(Date.UTC(2026, 10, 2 + (i % 4), 15)).toISOString(), secs: 90 });
    for (let i = 0; i < 7; i++) ev.push({ storeNumber: stores[i], partNumber: b.partNumber, at: new Date(Date.UTC(2026, 10, 3 + (i % 3), 16)).toISOString(), secs: 60 });
    const d = decideFrom("us", ev, [], NOW).configs;
    for (const lang of LANGS) {
      const x: ConfigsView = {
        c: COUNTRIES.us, us: true, one: false, stores: 269, since: d.since, days: d.days, alert: "/#notify", d,
        cfg: (r) => `${r.storage} ${r.color}`, colour: (k) => k, storeName: (n) => n, storeWhen: (iso) => iso,
      };
      const V = dict(lang).decide.configs;
      const lead = V.colourLead(x);
      // "Watching the second colour adds its windows": its restock count is stated, not a multiplier on your chances.
      expect(lead, lang).toContain("7");
      if (lang !== "en") continue;
      // (methodLead says what the figure is not, "not a chance of buying", so it is checked for that sentence instead.)
      const body = [V.intro(x), V.easiestLead(x), V.storageLead(x), lead, ...V.shelfKeys(x), ...Object.values(V.h2(x)), ...Object.values(V.nav)];
      for (const s of body) expect(s).not.toMatch(PROBABILITY);
      expect(V.methodLead).toContain("not a chance of buying");
    }
  });
});
