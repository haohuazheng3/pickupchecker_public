import { PendingLink as Link } from "@/components/ui/PendingLink";
import { stateCodeOf, storeTimeZone, storePath, mapPath, DEFAULT_MODEL, type Store } from "@/lib/apple/catalog";
import { normalizeHours, compressHours, hoursGroups, todayLabel, directionsUrl, telHrefFor, hoursText, fullAddress, DAY_SHORT, type DayHours, type OpenStatus } from "@/lib/seo/enrich";
import { t, pageLocale } from "@/lib/i18n/server";
import type { Dict } from "@/lib/i18n/dict";
import type { Lang } from "@/lib/i18n/locales";
import { LANG_TAG, weekdays } from "@/lib/i18n/format";

function statusClass(s: OpenStatus): string {
  return s === "open" ? "text-accent" : s === "before" ? "text-warn" : "text-ink-3";
}

/**
 * A time zone for a label: English its city ("New York", from "America/New_York"); other languages the zone's own
 * name in that language ("アメリカ東部時間"), the city if Intl has none.
 */
export function zoneName(tz: string, lang: Lang): string {
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  if (lang === "en") return city;
  try {
    return new Intl.DateTimeFormat(LANG_TAG[lang], { timeZone: tz, timeZoneName: "longGeneric" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? city;
  } catch {
    return city;
  }
}

/**
 * Opening hours in the page's language. English keeps enrich's own wording (its source); other languages build the
 * same lines from the dictionary (`viaDict` forces that path, which is how the English templates are checked).
 */
export function hoursIn(lang: Lang, d: Dict["modules"]["hours"], viaDict = lang !== "en") {
  const short = (i: number) => (viaDict ? weekdays(lang, "short")[(i + 1) % 7] : DAY_SHORT[i]); // Monday = 0, as enrich counts
  const day = (h: Pick<DayHours, "opens" | "closes">) => (!viaDict ? hoursText(h) : h.opens && h.closes ? `${h.opens}–${h.closes}` : d.closed);
  const week = (w: DayHours[]): string => {
    if (!viaDict) return compressHours(w);
    const groups = hoursGroups(w);
    if (groups.length === 1 && groups[0].days.length === 7) return w[0].opens && w[0].closes ? d.everyDay(day(w[0])) : d.closed;
    return groups.map((g) => `${g.days.length === 1 ? short(g.days[0]) : `${short(g.days[0])}–${short(g.days[g.days.length - 1])}`} ${day(w[g.days[0]])}`).join(" · ");
  };
  /** todayLabel's "Open now · closes 21:00" / "Opens at 10:00" / "Closed today · opens tomorrow at 10:00". */
  const status = (w: DayHours[], today: ReturnType<typeof todayLabel>): string => {
    if (!viaDict) return today.label;
    const next = () => {
      for (let k = 1; k <= 7; k++) {
        const i = (today.dayIndex + k) % 7;
        if (w[i].opens) return d.nextOpen(k === 1 ? null : short(i), w[i].opens!);
      }
      return null;
    };
    if (today.status === "closed") return d.closedToday(next());
    if (today.status === "before") return d.opensAt(today.today.opens!);
    if (today.status === "open") return d.openNow(today.today.closes!);
    return d.closedNow(next());
  };
  return { short, day, week, status };
}

/** Address, phone, compressed hours, today's status in the store's zone, apple.com and directions links. */
export function StoreInfo({ store, showMapLink = true, compact = false, now = new Date() }: { store: Store; showMapLink?: boolean; compact?: boolean; now?: Date }) {
  const d = t().modules.hours;
  const h = hoursIn(pageLocale().lang, d);
  const week = normalizeHours(store.hours);
  const tz = storeTimeZone(store);
  const today = todayLabel(week, tz, now);
  const tel = telHrefFor(store.phone, store.country);
  const us = (store.country ?? "us") === "us";
  const code = stateCodeOf(store);
  return (
    <div className={compact ? "text-sm" : ""}>
      <address className="not-italic text-ink-2">
        {us ? <>{(store.street ?? "").trim()}, {store.city}, {code} {store.postalCode}</> : fullAddress(store)}
        {store.phone && <> · {tel ? <a href={tel} className="underline decoration-line-2 hover:text-ink">{store.phone}</a> : store.phone}</>}
      </address>
      <p className="mt-1 text-ink-2">
        <span className={`font-medium ${statusClass(today.status)}`}>{h.status(week, today)}</span>
        <span className="text-ink-3">{d.today(h.day(today.today), h.week(week))}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={directionsUrl(store)} target="_blank" rel="noopener noreferrer" className="underline decoration-line-2 hover:text-ink">{d.directions}</a>
        {store.url && <a href={store.url} target="_blank" rel="nofollow noopener noreferrer" className="underline decoration-line-2 hover:text-ink">{d.applePage}</a>}
        {showMapLink && <Link href={`${mapPath(store.country)}?store=${store.storeNumber}&model=${DEFAULT_MODEL}`} className="underline decoration-line-2 hover:text-ink">{d.liveMap}</Link>}
        {compact && <Link href={storePath(store)} className="underline decoration-line-2 hover:text-ink">{d.storePage}</Link>}
      </div>
    </div>
  );
}

/** Mon→Sun list with today highlighted (store's zone). */
export function HoursTable({ store, now = new Date() }: { store: Store; now?: Date }) {
  const d = t().modules.hours;
  const lang = pageLocale().lang;
  const h = hoursIn(lang, d);
  const week = normalizeHours(store.hours);
  const today = todayLabel(week, storeTimeZone(store), now);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">{d.title}</div><span className={`text-xs font-medium ${statusClass(today.status)}`}>{h.status(week, today)}</span></div>
      <ul className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {week.map((x, i) => (
          <li key={x.day} className={`contents ${i === today.dayIndex ? "font-semibold text-ink" : "text-ink-2"}`}>
            <span>{h.short(i)}</span><span className="tabular-nums">{h.day(x)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">{d.local(zoneName(storeTimeZone(store), lang))}</p>
    </div>
  );
}
