"use client";
/**
 * Tick the Apple Stores to watch. Every store in the country is ranked from an anchor — a ZIP / city /
 * state / store typed into the box, the city or state an SEO page handed in, the device's location, or a
 * store already chosen — ten at a time, "Show 10 more" at the end. Chosen stores outside that list follow
 * it ("Also chosen"), so a new search never hides what is ticked. Distances are only ever from the
 * visitor: the device's location (read silently when the browser already allows it) or a typed ZIP at its
 * Census centroid; by road, estimated, with a link to real directions. No origin, no distances.
 *
 * Another country's pages hand in that country's stores (`pool`): no ZIPs there, distances in its unit.
 * The dashboard can switch country (`switchable`); a country's list is then fetched from /api/stores/{cc}.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { STORES, distanceMiles, cityLine, appleName } from "@/lib/apple/catalog-us";
import { ALL_CODES, COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { centroid, driveMinutes, formatDrive, formatRoad, rankStores, searchAnchor, zipAt, type Anchor, type GeoStore } from "@/lib/geo";
import { useZipPoint } from "@/lib/useZipPoint";
import { recallHere, rememberHere } from "@/lib/lastPlace";
import type { PickerStore } from "./PhoneMatrix";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { LANG_TAG, fill, num } from "@/lib/i18n/format";
import { appleStoreLabel, cityLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

const PAGE = 10;
/** How many of the nearest stores start ticked, and how far away they may be. */
export const PRETICK = 5;
const PRETICK_MILES = 75;

type LocState = "idle" | "asking" | "ok" | "denied" | "unavailable";
/** What the picker remembers while the user steps away (adds a phone) and comes back. */
export interface PickerMemory { q: string; here: { lat: number; lng: number } | null; loc: LocState; state: string }
export const freshPickerMemory = (): PickerMemory => ({ q: "", here: null, loc: "idle", state: "" });

export interface StorePickerProps {
  value: string[];
  onToggle: (storeNumber: string) => void;
  /** Called once with the nearest stores when a ranked list first appears and nothing is ticked. */
  onPretick?: (storeNumbers: string[]) => void;
  /** How many more stores may be ticked right now. */
  room: number;
  /** Stores that already have an alert for the phone(s) being set up. */
  owned?: string[];
  /** Full state name and/or city name to list first (from the state and city pages). */
  preferState?: string;
  preferCity?: string;
  /** Owner-held memory so a remount keeps the location, search text and picked state. */
  memory?: PickerMemory;
  onMemory?: (patch: Partial<PickerMemory>) => void;
  /** Another country's stores (its pages); absent = the US. */
  pool?: PickerStore[];
  country?: CountryCode;
  /** Chosen stores of any country, so "Also chosen" can name them (the dashboard). */
  known?: PickerStore[];
  /** Offer a country switch (the dashboard). */
  switchable?: boolean;
}

type Row = GeoStore & { distance?: number };
const GEO_OPTS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

export function StorePicker({ value, onToggle, onPretick, room, owned = [], preferState, preferCity, memory, onMemory, pool, country, known, switchable = false }: StorePickerProps) {
  const d = useT().alerts.picker;
  const lang = useLang();
  const en = lang === "en";
  const [picked, setPicked] = useState<CountryCode>(country ?? "us");
  const [fetched, setFetched] = useState<Partial<Record<CountryCode, PickerStore[]>>>({});
  const active: CountryCode = switchable ? picked : (country ?? "us");
  const us = active === "us";
  const list: GeoStore[] = useMemo(() => (us ? STORES : active === country && pool ? pool : fetched[active] ?? []), [us, active, country, pool, fetched]);
  useEffect(() => {
    if (us || (active === country && pool) || fetched[active]) return;
    let live = true;
    void fetch(`/api/stores/${active}`).then((r) => (r.ok ? r.json() : null)).then((j: { stores?: PickerStore[] } | null) => { if (live && j?.stores) setFetched((f) => ({ ...f, [active]: j.stores })); }).catch(() => undefined);
    return () => { live = false; };
  }, [us, active, country, pool, fetched]);
  // Every store this picker can name: the US list, the page's country, the account's other countries, fetched lists.
  const byNumber = useMemo(() => new Map<string, GeoStore>([...STORES, ...(pool ?? []), ...(known ?? []), ...Object.values(fetched).flat()].map((s) => [s.storeNumber, s])), [pool, known, fetched]);
  const unit = COUNTRIES[active].unit;
  // Names in the page's language (Apple's own: i18n/places); a store from the server may carry them already.
  const regionName = (r: string) => regionLabel(active, r, lang);
  const nameOf = (s: GeoStore) => (s as Partial<PickerStore>).label ?? storeLabel(s, lang);
  const appleOf = (s: GeoStore) => (en ? `Apple ${s.name}` : appleStoreLabel(s, lang));
  const lineOf = (s: GeoStore) => (en || (s.country ?? "us") === "us" ? cityLine(s as Parameters<typeof cityLine>[0]) : (s as Partial<PickerStore>).cityLabel ?? cityLabel(s.country!, s.city, lang));
  const drive = (miles: number) => (driveMinutes(miles) === 0 ? d.here : formatDrive(miles, lang));
  const [mem] = useState(memory); // what the owner remembered from a previous mount
  const [loc, setLocState] = useState<LocState>(mem?.loc === "asking" ? "idle" : (mem?.loc ?? "idle"));
  const [here, setHereState] = useState<{ lat: number; lng: number } | null>(mem?.here ?? null);
  const [q, setQState] = useState(mem?.q ?? "");
  const [state, setStateState] = useState(mem?.state || (preferState ?? ""));
  const [more, setMore] = useState<{ key: string; n: number }>({ key: "", n: PAGE });
  const [seedAny] = useState(() => (value[0] ? byNumber.get(value[0]) : undefined)); // a store the page pre-ticked
  const seed = seedAny && (seedAny.country ?? "us") === active ? seedAny : undefined;
  const preferred = Boolean(preferCity || preferState);
  const setLoc = (v: LocState) => { setLocState(v); onMemory?.({ loc: v }); };
  const setHere = (v: { lat: number; lng: number } | null) => { setHereState(v); onMemory?.({ here: v }); };
  const setQ = (v: string) => { setQState(v); onMemory?.({ q: v }); };
  const setState = (v: string) => { setStateState(v); onMemory?.({ state: v }); };

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLoc("unavailable"); return; }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const h = { lat: pos.coords.latitude, lng: pos.coords.longitude }; rememberHere(h); setHere(h); setLoc("ok"); },
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      GEO_OPTS,
    );
  };
  // Ask right away when nothing says where to look. Otherwise read the location only if the browser already
  // allows it (no prompt), so distances are from the visitor rather than from a store.
  useEffect(() => {
    if (here || (mem && mem.loc !== "idle")) return;
    // Located before on this device (lib/lastPlace.ts): use that, no prompt; Near me asks again.
    const known = recallHere();
    if (known) { const t = window.setTimeout(() => { setHere(known); setLoc("ok"); }, 0); return () => window.clearTimeout(t); }
    if (!preferred && !seed) { const t = window.setTimeout(locate, 0); return () => window.clearTimeout(t); }
    let live = true;
    void navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((st) => { if (live && st.state === "granted") locate(); }).catch(() => undefined);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed place beats everything (a ZIP at its real centroid once loaded). A city or state page keeps its
  // own stores first — nearest to the visitor when the device's location is known. Then the device; then a
  // store already chosen; then a picked state.
  const zipPt = useZipPoint(us ? q : "");
  const anchor = useMemo<Anchor | null>(() => {
    if (zipPt) return zipAt(zipPt.zip, zipPt);
    if (q.trim()) return searchAnchor(q, us ? undefined : list, lang);
    const page = preferState ? list.filter((s) => s.state === preferState && (!preferCity || s.city === preferCity)) : [];
    const first = page.length ? new Set(page.map((s) => s.storeNumber)) : undefined;
    if (here) return { ...here, label: "you", kind: "here", first };
    if (page.length) {
      const c = centroid(page)!;
      return preferCity ? { ...c, label: cityLabel(active, preferCity, lang), kind: "place", first } : { ...c, label: regionLabel(active, preferState!, lang), kind: "state", first };
    }
    if (seed) return { lat: seed.lat, lng: seed.lng, label: en ? `${appleName(seed)}` : appleStoreLabel(seed, lang), kind: "store" };
    if (state) {
      const inState = list.filter((s) => s.state === state);
      const c = centroid(inState);
      if (c) return { ...c, label: regionLabel(active, state, lang), kind: "state", first: new Set(inState.map((s) => s.storeNumber)) };
    }
    return null;
  }, [zipPt, q, here, preferCity, preferState, state, seed, list, us, active, lang, en]);
  const ranked = useMemo<Row[]>(() => (anchor ? rankStores(anchor, list) : []), [anchor, list]);
  const key = anchor ? `${anchor.kind}:${anchor.label}` : "";
  const shown = more.key === key ? more.n : PAGE;
  const visible = ranked.slice(0, shown);
  // Distances only from the visitor: the device, else a typed ZIP's centroid. Never from a store or a city.
  const origin = zipPt ?? here ?? null;
  const fromLabel = zipPt ? fill(d.zip, { zip: zipPt.zip }) : here ? d.you : null;
  const extra = value.filter((n) => !visible.some((s) => s.storeNumber === n)).map((n) => byNumber.get(n)).filter((s): s is NonNullable<typeof s> => Boolean(s));
  // An account watching stores in several countries sees them grouped by country.
  const extraGroups = [...new Set(extra.map((s) => s.country ?? "us"))].map((cc) => ({ cc, stores: extra.filter((s) => (s.country ?? "us") === cc) }));
  const mixed = extraGroups.some((g) => g.cc !== active);

  // The nearest few start ticked — once, the first time a ranked list appears with nothing ticked.
  // Never from a whole state or a guessed ZIP area (that would save rules for the wrong town).
  const preticked = useRef(value.length > 0);
  const [pretickNote, setPretickNote] = useState(false);
  useEffect(() => {
    if (preticked.current || !onPretick || value.length > 0 || ranked.length === 0 || !anchor || anchor.kind === "state" || anchor.approx) return;
    // Only stores within a sensible drive start ticked; in a sparse area that may be just the nearest one.
    const near = ranked.filter((s) => (s.distance ?? Infinity) <= PRETICK_MILES);
    const pick = (near.length ? near : ranked.slice(0, 1)).slice(0, PRETICK).map((s) => s.storeNumber);
    const t = window.setTimeout(() => { preticked.current = true; setPretickNote(pick.length > 0); onPretick(pick); }, 0);
    return () => window.clearTimeout(t);
  }, [ranked, anchor, value.length, onPretick]);

  const states = useMemo(() => {
    const all = [...new Set(list.map((s) => s.state))];
    if (en) return all.sort();
    const name = (r: string) => regionLabel(active, r, lang);
    return all.sort((a, b) => name(a).localeCompare(name(b), LANG_TAG[lang]));
  }, [list, en, active, lang]);
  const regionNoun = d.regionNoun[active];
  const full = room <= 0;
  // A ZIP in another language: "ZIP 78701" said its way (the anchor's own label is English).
  const placeOf = (a: Anchor) => (a.kind === "zip" && !en ? fill(d.zip, { zip: zipPt?.zip ?? q.trim().match(/^\d{3,5}/)?.[0] ?? "" }) : a.label);
  const status = (anchor
    ? anchor.kind === "here" ? d.nearestYou
      : anchor.approx ? d.zipNotFound
      : anchor.kind === "zip" || anchor.kind === "store" ? fill(d.nearestTo, { place: placeOf(anchor) })
      : anchor.kind === "state" ? fill(d.regionFirst, { place: anchor.label })
      : fill(d.placeFirst, { place: anchor.label })
    : loc === "asking" ? d.finding
      : loc === "denied" || loc === "unavailable" ? (us ? d.noLocationUs : states.length > 1 ? fill(d.noLocationRegion, { noun: regionNoun }) : d.noLocation)
      : us ? d.promptUs : d.prompt)
    + (fromLabel ? ` · ${fill(d.byRoad, { unit: unit === "km" || !en ? d.km : d.miles, from: fromLabel })}` : anchor && us ? ` · ${d.zipForDistances}` : anchor ? ` · ${d.nearMeForDistances}` : "")
    + (owned.length ? ` · ${fill(d.alreadyOn, { n: num(lang, owned.length) })}` : pretickNote && value.length > 0 && !q.trim() ? ` · ${fill(d.preticked, { n: num(lang, Math.min(PRETICK, value.length)) })}` : "");

  const row = (s: GeoStore) => {
    const on = value.includes(s.storeNumber);
    const mine = owned.includes(s.storeNumber);
    const dist = origin ? distanceMiles(origin.lat, origin.lng, s.lat, s.lng) : null;
    return (
      <div key={s.storeNumber} className={`flex items-center hover:bg-ink/5 ${on ? "bg-accent/8" : full && !mine ? "opacity-50" : ""}`}>
        <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(s.storeNumber)} aria-disabled={!on && !mine && full}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left text-sm">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-accent bg-accent" : "border-ink/25 bg-pane"}`} style={on ? { color: "var(--accent-ink)" } : undefined} aria-hidden>{on ? "✓" : ""}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{nameOf(s)}</span><span className="block truncate text-xs text-ink-3">{lineOf(s)}</span></span>
          {mine && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-accent/12 text-accent" : "bg-warn/12 text-warn"}`}>{on ? d.on : d.turningOff}</span>}
          {dist != null && <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-ink-3" title={d.byRoadTitle}>≈{formatRoad(dist, COUNTRIES[s.country ?? "us"].unit, lang)}<br />{drive(dist)}</span>}
        </button>
        {dist != null && (
          <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" aria-label={fill(d.directionsTo, { store: appleOf(s) })} title={d.directions}
            className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-ink/8 hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
          </a>
        )}
      </div>
    );
  };

  return (
    <div>
      {switchable && (
        <select className="input mb-2" value={active} onChange={(e) => { setPicked(e.target.value as CountryCode); setQ(""); setState(""); }} aria-label={d.country}>
          {ALL_CODES.map((cc) => <option key={cc} value={cc}>{countryLabel(cc, lang)}</option>)}
        </select>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="input" inputMode="search" placeholder={us ? d.searchUs : states.length > 1 ? fill(d.searchRegion, { noun: regionNoun }) : d.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={d.find} autoComplete="off" />
        <button type="button" className="btn btn-ghost" onClick={locate} disabled={loc === "asking"} aria-busy={loc === "asking"}>
          {loc === "asking" ? <><span className="spinner" />{` ${d.locating}`}</> : <><span aria-hidden>📍</span>{` ${d.nearMe}`}</>}
        </button>
      </div>
      <p className="mt-2 min-h-5 text-xs text-ink-3" aria-live="polite">{status}</p>
      {(!anchor || anchor.kind === "state") && !q.trim() && loc !== "asking" && states.length > 1 && (
        <select className="input mt-2" value={state} onChange={(e) => setState(e.target.value)} aria-label={regionNoun[0].toUpperCase() + regionNoun.slice(1)}>
          <option value="">{fill(d.pickRegion, { noun: regionNoun })}</option>
          {states.map((s) => <option key={s} value={s}>{regionName(s)}</option>)}
        </select>
      )}
      <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line" role="group" aria-label={d.storesLabel}>
        {loc === "asking" && ranked.length === 0 && Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3"><div className="skeleton h-5 w-5 rounded-md" /><div className="skeleton h-4 w-1/2" /><div className="skeleton ml-auto h-3 w-16" /></div>
        ))}
        {visible.map(row)}
        {ranked.length > shown && (
          <button type="button" className="w-full px-4 py-3 text-center text-sm font-medium hover:bg-ink/5" style={{ color: "var(--ink-2)" }} onClick={() => setMore({ key, n: shown + PAGE })}>{fill(d.showMore, { n: num(lang, Math.min(PAGE, ranked.length - shown)) })}</button>
        )}
        {!anchor && q.trim() !== "" && <div className="px-4 py-6 text-center text-sm text-ink-3">{us ? d.noMatchUs : states.length > 1 ? fill(d.noMatchRegion, { noun: regionNoun }) : d.noMatch}</div>}
        {extra.length > 0 && !mixed && (
          <>
            <div className="bg-ink/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{`${d.alsoChosen} · ${num(lang, extra.length)}`}</div>
            {extra.map(row)}
          </>
        )}
        {mixed && extraGroups.map((g) => (
          <div key={g.cc} className="divide-y divide-line">
            <div className="bg-ink/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{`${d.alsoChosen} · ${countryLabel(g.cc, lang)} · ${num(lang, g.stores.length)}`}</div>
            {g.stores.map(row)}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Real directions in the visitor's maps app: Apple Maps on Apple devices, Google Maps elsewhere. */
function directionsUrl(s: { lat: number; lng: number; name: string }): string {
  const apple = typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return apple ? `https://maps.apple.com/?daddr=${s.lat},${s.lng}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;
}
