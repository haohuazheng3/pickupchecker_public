import Link from "next/link";
import { stateCodeOf, storeTimeZone, storePath, DEFAULT_MODEL, type Store } from "@/lib/apple/catalog";
import { normalizeHours, compressHours, todayLabel, directionsUrl, telHref, hoursText, type OpenStatus } from "@/lib/seo/enrich";

function statusClass(s: OpenStatus): string {
  return s === "open" ? "text-accent" : s === "before" ? "text-warn" : "text-ink-3";
}

/** Address, phone, compressed hours, today's status in the store's zone, apple.com and directions links. */
export function StoreInfo({ store, showMapLink = true, compact = false, now = new Date() }: { store: Store; showMapLink?: boolean; compact?: boolean; now?: Date }) {
  const week = normalizeHours(store.hours);
  const tz = storeTimeZone(store);
  const today = todayLabel(week, tz, now);
  const tel = telHref(store.phone);
  const code = stateCodeOf(store);
  return (
    <div className={compact ? "text-sm" : ""}>
      <address className="not-italic text-ink-2">
        {(store.street ?? "").trim()}, {store.city}, {code} {store.postalCode}
        {store.phone && <> · {tel ? <a href={tel} className="underline decoration-line-2 hover:text-ink">{store.phone}</a> : store.phone}</>}
      </address>
      <p className="mt-1 text-ink-2">
        <span className={`font-medium ${statusClass(today.status)}`}>{today.label}</span>
        <span className="text-ink-3"> · today {hoursText(today.today)} · {compressHours(week)}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={directionsUrl(store)} target="_blank" rel="noopener noreferrer" className="underline decoration-line-2 hover:text-ink">Directions</a>
        {store.url && <a href={store.url} target="_blank" rel="nofollow noopener noreferrer" className="underline decoration-line-2 hover:text-ink">apple.com store page</a>}
        {showMapLink && <Link href={`/map?store=${store.storeNumber}&model=${DEFAULT_MODEL}`} className="underline decoration-line-2 hover:text-ink">Live map</Link>}
        {compact && <Link href={storePath(store)} className="underline decoration-line-2 hover:text-ink">Store page</Link>}
      </div>
    </div>
  );
}

/** Mon→Sun list with today highlighted (store's zone). */
export function HoursTable({ store, now = new Date() }: { store: Store; now?: Date }) {
  const week = normalizeHours(store.hours);
  const today = todayLabel(week, storeTimeZone(store), now);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">Hours</div><span className={`text-xs font-medium ${statusClass(today.status)}`}>{today.label}</span></div>
      <ul className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {week.map((d, i) => (
          <li key={d.day} className={`contents ${i === today.dayIndex ? "font-semibold text-ink" : "text-ink-2"}`}>
            <span>{d.short}</span><span className="tabular-nums">{hoursText(d)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-3">Local time ({storeTimeZone(store).split("/").pop()?.replace(/_/g, " ")}). Pickup orders are collected during these hours.</p>
    </div>
  );
}
