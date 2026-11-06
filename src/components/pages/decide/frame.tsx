/**
 * Pieces the four decision pages share (seo.md §16): the view context (labels in the page's language), the visible
 * "Updated" stamp, small table/keyword-line/chip helpers, breadcrumbs and the other-country links. Each page keeps
 * the same skeleton as the restock-times page: answer-first intro, hero tiles, question H2s, FAQ, sources.
 */
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Points, type Point } from "@/components/ui/Viz";
import type { Crumb } from "@/components/seo/Related";
import { storeByNumber, storesOf } from "@/lib/apple/catalog";
import { ALL_CODES, COUNTRIES, prefixOf, type Country, type CountryCode } from "@/lib/apple/countries";
import { trackingSince, dayRange } from "@/lib/content/restockTimes";
import { localStamp, localHourDay } from "@/lib/content/siteFacts";
import { alertHref } from "@/lib/seo/enrich";
import { pathInLocale, type Lang, type Locale } from "@/lib/i18n/locales";
import { appleStoreLabel, colorLabel, configLabel, countryLabel } from "@/lib/i18n/places";
import type { DecideCtx } from "@/lib/i18n/dict/en/decide";
import { equivalentPath, type EquivalentPage } from "../shared";

export const SITE = "https://pickupchecker.com";
/** "Nov 5, 2026, 10:12 AM EST": the visible "updated" stamp, in the country's reference zone (English pages). */
export const UPDATED = (tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

export function decideCtx(c: Country, lang: Lang): DecideCtx {
  const cc = c.cc;
  const stores = storesOf(cc);
  const since = trackingSince(cc);
  const today = localHourDay(new Date().toISOString(), c.timeZone).date;
  return {
    c, us: cc === "us", one: stores.length === 1, stores: stores.length, since, days: Math.max(1, dayRange(since, today).length),
    alert: alertHref({ model: "duo", country: cc }),
    cfg: (r) => configLabel(r, lang),
    colour: (color) => colorLabel(color, lang),
    storeName: (n) => { const s = storeByNumber(n); return s ? appleStoreLabel(s, lang) : n; },
    storeWhen: (iso, n) => { const s = storeByNumber(n); return s ? localStamp(iso, s, lang) : new Date(iso).toISOString().slice(0, 16).replace("T", " "); },
  };
}

export const pageUrl = (path: string, loc: Locale) => (loc.native ? pathInLocale(path, loc) : path);

export function crumbsFor(c: Country, lang: Lang, label: string): Crumb[] {
  return c.cc === "us" ? [{ href: "/", label: "PickupChecker" }, { label }] : [{ href: prefixOf(c.cc), label: lang === "en" ? c.short : countryLabel(c.cc, lang) }, { label }];
}

/** The same page in every other country, in the page's language. */
export function otherCountryLinks(page: EquivalentPage, cc: CountryCode, lang: Lang): { href: string; label: string }[] {
  return ALL_CODES.filter((k) => k !== cc).map((k) => ({ href: equivalentPath(k, page)!, label: lang === "en" ? COUNTRIES[k].short : countryLabel(k, lang) }));
}

const th = "border-b border-line-2 py-2 pe-3 text-start font-semibold text-ink";
export const td = "py-2 pe-3 align-top tabular-nums";
export const rowTh = "py-2 pe-3 text-start font-medium text-ink";

export function Table({ caption, head, children, min = "28rem" }: { caption: string; head: string[]; children: ReactNode; min?: string }) {
  return (
    <div className="my-5 overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ minWidth: min }}>
        <caption className="mb-2 text-start text-xs text-ink-3">{caption}</caption>
        <thead><tr>{head.map((h, i) => <th key={`${h}-${i}`} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Keyword lines inside the prose pane (the pane's list indent is turned off); plain strings become ticked lines. */
export function Keys({ items, className = "my-3" }: { items: (string | Point)[]; className?: string }) {
  return <Points items={items.map((p) => (typeof p === "string" ? { text: p, plain: p } : p))} className={`${className} ml-0!`} />;
}

export function ChipLinks({ items }: { items: { href: string; label: string }[] }) {
  return <div className="my-3 flex flex-wrap gap-1.5">{items.map((l) => <Link key={l.href} href={l.href} className="chip chip-sm no-underline!">{l.label}</Link>)}</div>;
}

export function SectionNav({ label, sections }: { label: string; sections: { id: string; nav: string }[] }) {
  return (
    <nav aria-label={label} className="mt-6 flex flex-wrap gap-2 text-sm">
      {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
    </nav>
  );
}

/** "38.4 h" or "41 min" (English figures; the dictionaries format their own sentences). */
export const hoursLabel = (sec: number) => (sec >= 3600 ? `${Math.round((sec / 3600) * 10) / 10} h` : `${Math.max(1, Math.round(sec / 60))} min`);
export const secsLabel = (s: number | null | undefined) => (s == null ? "–" : s >= 120 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`);
export const pctLabel = (x: number | null | undefined) => (x == null ? "–" : x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
