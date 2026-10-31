"use client";
/**
 * Tick the Apple Stores to watch. Every store in the country is ranked from an anchor — a ZIP / city /
 * state / store typed into the box, the city or state an SEO page handed in, the device's location, or a
 * store already chosen — ten at a time, "Show 10 more" at the end. Chosen stores outside that list follow
 * it ("Also chosen"), so a new search never hides what is ticked. Distances are only ever from the
 * visitor: the device's location (read silently when the browser already allows it) or a typed ZIP at its
 * Census centroid; by road, estimated, with a link to real directions. No origin, no distances.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { STORES, STORE_INDEX, distanceMiles, stateCodeOf, appleName } from "@/lib/apple/catalog";
import { centroid, formatDrive, formatMiles, rankStores, searchAnchor, zipAt, type Anchor } from "@/lib/geo";
import { useZipPoint } from "@/lib/useZipPoint";

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
}
const GEO_OPTS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

export function StorePicker({ value, onToggle, onPretick, room, owned = [], preferState, preferCity, memory, onMemory }: StorePickerProps) {
  const [mem] = useState(memory); // what the owner remembered from a previous mount
  const [loc, setLocState] = useState<LocState>(mem?.loc === "asking" ? "idle" : (mem?.loc ?? "idle"));
  const [here, setHereState] = useState<{ lat: number; lng: number } | null>(mem?.here ?? null);
  const [q, setQState] = useState(mem?.q ?? "");
  const [state, setStateState] = useState(mem?.state || (preferState ?? ""));
  const [more, setMore] = useState<{ key: string; n: number }>({ key: "", n: PAGE });
  const [seed] = useState(() => (value[0] ? STORE_INDEX.get(value[0]) : undefined)); // a store the page pre-ticked
  const preferred = Boolean(preferCity || preferState);
  const setLoc = (v: LocState) => { setLocState(v); onMemory?.({ loc: v }); };
  const setHere = (v: { lat: number; lng: number } | null) => { setHereState(v); onMemory?.({ here: v }); };
  const setQ = (v: string) => { setQState(v); onMemory?.({ q: v }); };
  const setState = (v: string) => { setStateState(v); onMemory?.({ state: v }); };

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLoc("unavailable"); return; }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoc("ok"); },
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      GEO_OPTS,
    );
  };
  // Ask right away when nothing says where to look. Otherwise read the location only if the browser already
  // allows it (no prompt), so distances are from the visitor rather than from a store.
  useEffect(() => {
    if (here || (mem && mem.loc !== "idle")) return;
    if (!preferred && !seed) { const t = window.setTimeout(locate, 0); return () => window.clearTimeout(t); }
    let live = true;
    void navigator.permissions?.query({ name: "geolocation" as PermissionName }).then((st) => { if (live && st.state === "granted") locate(); }).catch(() => undefined);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed place beats everything (a ZIP at its real centroid once loaded). A city or state page keeps its
  // own stores first — nearest to the visitor when the device's location is known. Then the device; then a
  // store already chosen; then a picked state.
  const zipPt = useZipPoint(q);
  const anchor = useMemo<Anchor | null>(() => {
    if (zipPt) return zipAt(zipPt.zip, zipPt);
    if (q.trim()) return searchAnchor(q);
    const page = preferState ? STORES.filter((s) => s.state === preferState && (!preferCity || s.city === preferCity)) : [];
    const first = page.length ? new Set(page.map((s) => s.storeNumber)) : undefined;
    if (here) return { ...here, label: "you", kind: "here", first };
    if (page.length) {
      const c = centroid(page)!;
      return preferCity ? { ...c, label: preferCity, kind: "place", first } : { ...c, label: preferState!, kind: "state", first };
    }
    if (seed) return { lat: seed.lat, lng: seed.lng, label: `${appleName(seed)}`, kind: "store" };
    if (state) {
      const inState = STORES.filter((s) => s.state === state);
      const c = centroid(inState);
      if (c) return { ...c, label: state, kind: "state", first: new Set(inState.map((s) => s.storeNumber)) };
    }
    return null;
  }, [zipPt, q, here, preferCity, preferState, state, seed]);
  const ranked = useMemo(() => (anchor ? rankStores(anchor) : []), [anchor]);
  const key = anchor ? `${anchor.kind}:${anchor.label}` : "";
  const shown = more.key === key ? more.n : PAGE;
  const visible = ranked.slice(0, shown);
  // Distances only from the visitor: the device, else a typed ZIP's centroid. Never from a store or a city.
  const origin = zipPt ?? here ?? null;
  const fromLabel = zipPt ? `ZIP ${zipPt.zip}` : here ? "you" : null;
  const extra = value.filter((n) => !visible.some((s) => s.storeNumber === n)).map((n) => STORE_INDEX.get(n)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  // The nearest few start ticked — once, the first time a ranked list appears with nothing ticked.
  // Never from a whole state or a guessed ZIP area (that would save rules for the wrong town).
  const preticked = useRef(value.length > 0);
  const [pretickNote, setPretickNote] = useState(false);
  useEffect(() => {
    if (preticked.current || !onPretick || value.length > 0 || ranked.length === 0 || !anchor || anchor.kind === "state" || anchor.approx) return;
    // Only stores within a sensible drive start ticked; in a sparse area that may be just the nearest one.
    const near = ranked.filter((s) => s.distance <= PRETICK_MILES);
    const pick = (near.length ? near : ranked.slice(0, 1)).slice(0, PRETICK).map((s) => s.storeNumber);
    const t = window.setTimeout(() => { preticked.current = true; setPretickNote(pick.length > 0); onPretick(pick); }, 0);
    return () => window.clearTimeout(t);
  }, [ranked, anchor, value.length, onPretick]);

  const states = useMemo(() => [...new Set(STORES.map((s) => s.state))].sort(), []);
  const full = room <= 0;
  const status = (anchor
    ? anchor.kind === "here" ? "Nearest to you"
      : anchor.approx ? `ZIP not found — nearest to that area`
      : anchor.kind === "zip" || anchor.kind === "store" ? `Nearest to ${anchor.label}`
      : anchor.kind === "state" ? `${anchor.label} A–Z, then the nearest beyond`
      : `${anchor.label} first, then the nearest beyond`
    : loc === "asking" ? "Finding stores near you…"
      : loc === "denied" || loc === "unavailable" ? "No location — type a ZIP or city, or pick a state"
      : "Type a ZIP or city, or tap Near me")
    + (fromLabel ? ` · miles by road from ${fromLabel}, estimated` : anchor ? " · type your ZIP for distances" : "")
    + (owned.length ? ` · ${owned.length} already on` : pretickNote && value.length > 0 && !q.trim() ? ` · nearest ${Math.min(PRETICK, value.length)} ticked` : "");

  const row = (s: (typeof STORES)[number]) => {
    const on = value.includes(s.storeNumber);
    const mine = owned.includes(s.storeNumber);
    const d = origin ? distanceMiles(origin.lat, origin.lng, s.lat, s.lng) : null;
    return (
      <div key={s.storeNumber} className={`flex items-center hover:bg-ink/5 ${on ? "bg-accent/8" : full && !mine ? "opacity-50" : ""}`}>
        <button type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(s.storeNumber)} aria-disabled={!on && !mine && full}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left text-sm">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-accent bg-accent" : "border-ink/25 bg-pane"}`} style={on ? { color: "var(--accent-ink)" } : undefined} aria-hidden>{on ? "✓" : ""}</span>
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span><span className="block truncate text-xs text-ink-3">{s.city}, {stateCodeOf(s)}</span></span>
          {mine && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-accent/12 text-accent" : "bg-warn/12 text-warn"}`}>{on ? "on" : "turning off"}</span>}
          {d != null && <span className="shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-ink-3" title="By road, estimated">≈{formatMiles(d)}<br />{formatDrive(d)}</span>}
        </button>
        {d != null && (
          <a href={directionsUrl(s)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to Apple ${s.name}`} title="Directions"
            className="mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-ink/8 hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11l18-8-8 18-2-8-8-2z" /></svg>
          </a>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="input" inputMode="search" placeholder="ZIP, city, state or store" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find stores" autoComplete="off" />
        <button type="button" className="btn btn-ghost" onClick={locate} disabled={loc === "asking"} aria-busy={loc === "asking"}>
          {loc === "asking" ? <><span className="spinner" /> Locating</> : <><span aria-hidden>📍</span> Near me</>}
        </button>
      </div>
      <p className="mt-2 min-h-5 text-xs text-ink-3" aria-live="polite">{status}</p>
      {(!anchor || anchor.kind === "state") && !q.trim() && loc !== "asking" && (
        <select className="input mt-2" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
          <option value="">Pick a state</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <div className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line" role="group" aria-label="Stores">
        {loc === "asking" && ranked.length === 0 && Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3"><div className="skeleton h-5 w-5 rounded-md" /><div className="skeleton h-4 w-1/2" /><div className="skeleton ml-auto h-3 w-16" /></div>
        ))}
        {visible.map(row)}
        {ranked.length > shown && (
          <button type="button" className="w-full px-4 py-3 text-center text-sm font-medium hover:bg-ink/5" style={{ color: "var(--ink-2)" }} onClick={() => setMore({ key, n: shown + PAGE })}>Show {Math.min(PAGE, ranked.length - shown)} more</button>
        )}
        {!anchor && q.trim() !== "" && <div className="px-4 py-6 text-center text-sm text-ink-3">No match — try a ZIP, city or state.</div>}
        {extra.length > 0 && (
          <>
            <div className="bg-ink/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Also chosen · {extra.length}</div>
            {extra.map(row)}
          </>
        )}
      </div>
    </div>
  );
}

/** Real directions in the visitor's maps app: Apple Maps on Apple devices, Google Maps elsewhere. */
function directionsUrl(s: { lat: number; lng: number; name: string }): string {
  const apple = typeof navigator !== "undefined" && /iPhone|iPad|Macintosh/.test(navigator.userAgent);
  return apple ? `https://maps.apple.com/?daddr=${s.lat},${s.lng}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;
}
