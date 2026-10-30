"use client";
/**
 * Tick the Apple Stores to watch. Every store in the country is ranked by distance from an anchor — the
 * device's location (asked on mount), a ZIP / city / state / store typed into the box, the city or state
 * an SEO page handed in, or a store a page pre-ticked — ten at a time, "Show 10 more" at the end. Rows
 * carry miles and a driving estimate from the visitor. Nothing above the list changes height while
 * ticking, so the next row stays where it was. Stores that already have an alert for the phone(s) on
 * screen are tagged: "on" while ticked, "turning off" once unticked.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { STORES, STORE_INDEX, distanceMiles, stateCodeOf, appleName } from "@/lib/apple/catalog";
import { centroid, formatDrive, formatMiles, rankStores, searchAnchor, type Anchor } from "@/lib/geo";

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
  // Ask right away unless a page already said where to look, or we asked before (remount).
  useEffect(() => {
    if (preferred || seed || here || (mem && mem.loc !== "idle")) return;
    const t = window.setTimeout(locate, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed place beats everything; then the device; then what the page handed in; then a picked state.
  const anchor = useMemo<Anchor | null>(() => {
    if (q.trim()) return searchAnchor(q);
    if (here) return { ...here, label: "you", kind: "here" };
    if (preferCity && preferState) {
      const inCity = STORES.filter((s) => s.state === preferState && s.city === preferCity);
      const c = centroid(inCity);
      if (c) return { ...c, label: preferCity, kind: "place", first: new Set(inCity.map((s) => s.storeNumber)) };
    }
    if (seed) return { lat: seed.lat, lng: seed.lng, label: `${appleName(seed)}`, kind: "store" };
    if (state) {
      const inState = STORES.filter((s) => s.state === state);
      const c = centroid(inState);
      if (c) return { ...c, label: state, kind: "state", first: new Set(inState.map((s) => s.storeNumber)) };
    }
    return null;
  }, [q, here, preferCity, preferState, state, seed]);
  const ranked = useMemo(() => (anchor ? rankStores(anchor) : []), [anchor]);
  const key = anchor ? `${anchor.kind}:${anchor.label}` : "";
  const shown = more.key === key ? more.n : PAGE;
  const visible = ranked.slice(0, shown);
  // Distances are from the visitor when known, else from the anchor (none for a whole state).
  const origin = here ?? (anchor && anchor.kind !== "state" ? anchor : null);

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
      : anchor.approx ? `No store in that ZIP area — nearest we know of`
      : anchor.kind === "zip" || anchor.kind === "store" ? `Nearest to ${anchor.label}`
      : anchor.kind === "state" ? `${anchor.label} A–Z, then the nearest beyond`
      : `${anchor.label} first, then the nearest beyond`
    : loc === "asking" ? "Finding stores near you…"
      : loc === "denied" || loc === "unavailable" ? "No location — type a ZIP or city, or pick a state"
      : "Type a ZIP or city, or tap Near me") + (owned.length ? ` · ${owned.length} already on` : pretickNote && value.length > 0 ? ` · nearest ${Math.min(PRETICK, value.length)} ticked` : "");

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input className="input" inputMode="search" placeholder="ZIP, city, state or store" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find stores" autoComplete="off" />
        <button type="button" className="btn btn-ghost" onClick={locate} disabled={loc === "asking"} aria-busy={loc === "asking"}>
          {loc === "asking" ? <><span className="spinner" /> Locating</> : <><span aria-hidden>📍</span> Near me</>}
        </button>
      </div>
      <p className="mt-2 h-5 truncate text-xs text-ink-3" aria-live="polite">{status}</p>
      {(!anchor || anchor.kind === "state") && !q.trim() && loc !== "asking" && (
        <select className="input mt-2" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
          <option value="">Pick a state</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line" role="group" aria-label="Stores">
        {loc === "asking" && ranked.length === 0 && Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3"><div className="skeleton h-5 w-5 rounded-md" /><div className="skeleton h-4 w-1/2" /><div className="skeleton ml-auto h-3 w-16" /></div>
        ))}
        {visible.map((s) => {
          const on = value.includes(s.storeNumber);
          const mine = owned.includes(s.storeNumber);
          const d = origin ? (origin === anchor ? s.distance : distanceMiles(origin.lat, origin.lng, s.lat, s.lng)) : null;
          return (
            <button key={s.storeNumber} type="button" role="checkbox" aria-checked={on} onClick={() => onToggle(s.storeNumber)} aria-disabled={!on && !mine && full}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-ink/5 ${on ? "bg-accent/8" : full && !mine ? "opacity-50" : ""}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-accent bg-accent" : "border-ink/25 bg-pane"}`} style={on ? { color: "var(--accent-ink)" } : undefined} aria-hidden>{on ? "✓" : ""}</span>
              <span className="min-w-0 flex-1"><span className="block truncate font-medium">{s.name}</span><span className="block truncate text-xs text-ink-3">{s.city}, {stateCodeOf(s)}</span></span>
              {mine && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${on ? "bg-accent/12 text-accent" : "bg-warn/12 text-warn"}`}>{on ? "on" : "turning off"}</span>}
              {d != null && <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-3">{formatMiles(d)} · {formatDrive(d)}</span>}
            </button>
          );
        })}
        {ranked.length > shown && (
          <button type="button" className="w-full px-4 py-3 text-center text-sm font-medium text-ink-2 hover:bg-ink/5" onClick={() => setMore({ key, n: shown + PAGE })}>Show {Math.min(PAGE, ranked.length - shown)} more</button>
        )}
        {!anchor && q.trim() !== "" && <div className="px-4 py-6 text-center text-sm text-ink-3">No match — try a ZIP, city or state.</div>}
      </div>
    </div>
  );
}
