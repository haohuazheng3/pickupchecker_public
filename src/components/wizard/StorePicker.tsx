"use client";
/**
 * Tick one or more Apple Stores — each one becomes its own alert. On mount we ask for the location
 * straight away (no extra tap) and list the nearest stores; a city or state handed in from an SEO page
 * lists those stores first and skips the location prompt. A search box (store, city, state, ZIP) is
 * always there as the fallback. Ticks survive a new search: they show as chips above the list.
 */
import { useEffect, useMemo, useState } from "react";
import { STORES, STORE_INDEX, stateCodeOf, storesNear, type Store } from "@/lib/apple/catalog";
import { norm } from "@/lib/search";
import { SAVE_CAP } from "@/lib/plans";

type Located = { lat: number; lng: number };
type LocState = "idle" | "asking" | "ok" | "denied" | "unavailable";

export interface StorePickerProps {
  value: string[];
  /** Tick or untick one store. The owner updates from its latest state, so taps never overwrite each other. */
  onToggle: (storeNumber: string) => void;
  /** Most stores that can be ticked at once (the per-account save cap). */
  max?: number;
  /** Full state name and/or city name to list first (from the state and city pages). */
  preferState?: string;
  preferCity?: string;
}

const GEO_OPTS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

export function StorePicker({ value, onToggle, max = 30, preferState, preferCity }: StorePickerProps) {
  const [loc, setLoc] = useState<LocState>("idle");
  const [here, setHere] = useState<Located | null>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>(preferState ?? "");
  const preferred = Boolean(preferCity || preferState);

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLoc("unavailable"); return; }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLoc("ok"); },
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      GEO_OPTS,
    );
  };
  // Ask immediately unless an SEO page already told us where the user is looking (or a store is pre-ticked).
  useEffect(() => {
    if (preferred || value.length) return;
    const t = window.setTimeout(locate, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const states = useMemo(() => [...new Set(STORES.map((s) => s.state))].sort(), []);
  const list = useMemo<(Store & { distance?: number })[]>(() => {
    const needle = norm(q);
    if (needle) {
      const zip = /^\d{3,5}$/.test(needle);
      return STORES.filter((s) => (zip ? (s.postalCode ?? "").startsWith(needle) : `${norm(s.name)} ${norm(s.city)} ${norm(s.state)} ${stateCodeOf(s).toLowerCase()}`.includes(needle))).slice(0, 12);
    }
    if (here) return storesNear(here.lat, here.lng, 400).slice(0, 8);
    if (preferCity && preferState) {
      // The city's own stores come first (nearest to each other), then neighbours by distance with miles shown.
      const inCity = STORES.filter((s) => s.state === preferState && s.city === preferCity);
      if (inCity.length) return storesNear(inCity[0].lat, inCity[0].lng, 400).slice(0, 12);
    }
    if (state) return STORES.filter((s) => s.state === state).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    // A store handed in by a page (store page, map, "Set it up again"): offer its neighbours, so adding a second
    // store is one tap. Anchored on the FIRST tick so the list holds still while more are ticked.
    const anchor = value.length ? STORE_INDEX.get(value[0]) : undefined;
    if (anchor) return storesNear(anchor.lat, anchor.lng, 400).slice(0, 8);
    return [];
  }, [q, here, state, preferCity, preferState, value]);

  const full = value.length >= max;
  const toggle = (n: string) => { if (value.includes(n) || !full) onToggle(n); };
  const chosen = value.map((n) => STORE_INDEX.get(n)).filter((s): s is Store => Boolean(s));
  // A whole state can be 50+ rows: fold past 12 until asked.
  const [showAll, setShowAll] = useState(false);
  const FOLD = 12;
  const folded = !showAll && !q && list.length > FOLD;
  const visible = folded ? list.slice(0, FOLD) : list;

  return (
    <div>
      {chosen.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Stores you ticked">
          {chosen.map((s) => (
            <button key={s.storeNumber} type="button" className="chip" data-on="true" onClick={() => toggle(s.storeNumber)} title="Remove" aria-label={`Remove Apple ${s.name}`}>
              {s.name} <span className="opacity-70">· {stateCodeOf(s)}</span> <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input className="input" placeholder="Search store, city, state or ZIP" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stores" autoComplete="off" />
        <button type="button" className="btn btn-ghost" onClick={locate} disabled={loc === "asking"} aria-busy={loc === "asking"}>
          {loc === "asking" ? <><span className="spinner" /> Locating…</> : "📍 Near me"}
        </button>
      </div>
      {loc === "denied" && !q && <p className="mt-2 text-sm text-warn">Location is off for this site — search above or pick a state.</p>}
      {loc === "unavailable" && !q && <p className="mt-2 text-sm text-warn">Could not get your location — search above or pick a state.</p>}
      {!q && !here && !preferred && (
        <select className="input mt-2" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
          <option value="">{loc === "asking" ? "Finding stores near you…" : "Pick a state"}</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <div className="mt-3 overflow-hidden rounded-2xl border border-line" role="group" aria-label="Stores">
        {loc === "asking" && !q && list.length === 0 && Array.from({ length: 5 }, (_, i) => <div key={i} className="flex items-center gap-3 px-4 py-3"><div className="skeleton h-5 w-5 rounded-md" /><div className="skeleton h-4 w-2/3" /><div className="skeleton ml-auto h-3 w-10" /></div>)}
        {visible.map((s) => {
          const on = value.includes(s.storeNumber);
          return (
            <button key={s.storeNumber} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(s.storeNumber)} disabled={!on && full}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-ink/5 disabled:opacity-50 ${on ? "bg-accent/8" : ""}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${on ? "border-accent bg-accent" : "border-ink/25 bg-pane"}`} style={on ? { color: "var(--accent-ink)" } : undefined} aria-hidden>{on ? "✓" : ""}</span>
              <span className="min-w-0 flex-1"><span className="font-medium">{s.name}</span> <span className="text-ink-3">· {s.city}, {stateCodeOf(s)}</span></span>
              <span className="shrink-0 text-xs text-ink-3">{s.distance != null ? `${s.distance < 10 ? s.distance.toFixed(1) : Math.round(s.distance)} mi` : ""}</span>
            </button>
          );
        })}
        {folded && <button type="button" className="w-full px-4 py-3 text-center text-sm font-medium text-ink-2 hover:bg-ink/5" onClick={() => setShowAll(true)}>Show all {list.length} stores</button>}
        {loc !== "asking" && list.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-3">{q ? "No store matches — try the city or ZIP." : "Search for your store, tap Near me, or pick a state."}</div>}
      </div>
      {full && (value.length === 0
        ? <p className="mt-2 text-sm text-warn">Your account already holds the most alert rules it can ({SAVE_CAP}). <a className="underline" href="/account">Delete some</a> to add more.</p>
        : <p className="mt-2 text-sm text-ink-3">That is as many stores as your account has room for ({max}). Untick one to pick another.</p>)}
    </div>
  );
}
