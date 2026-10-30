"use client";
/**
 * Pick exactly one Apple Store. On mount we ask for the location straight away (no extra tap) and
 * list the nearest stores; a city or state handed in from an SEO page lists those stores first and
 * skips the location prompt. A search box (store, city, state, ZIP) is always there as the fallback.
 */
import { useEffect, useMemo, useState } from "react";
import { STORES, stateCodeOf, storesNear, type Store } from "@/lib/apple/catalog";
import { norm } from "@/lib/search";

type Located = { lat: number; lng: number };
type LocState = "idle" | "asking" | "ok" | "denied" | "unavailable";

export interface StorePickerProps {
  value: string | null;
  onChange: (storeNumber: string) => void;
  /** Full state name and/or city name to list first (from the state and city pages). */
  preferState?: string;
  preferCity?: string;
}

const GEO_OPTS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

export function StorePicker({ value, onChange, preferState, preferCity }: StorePickerProps) {
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
  // Ask immediately unless an SEO page already told us where the user is looking.
  useEffect(() => {
    if (preferred || value) return;
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
      const inCity = STORES.filter((s) => s.state === preferState && s.city === preferCity);
      const rest = STORES.filter((s) => s.state === preferState && s.city !== preferCity).sort((a, b) => a.city.localeCompare(b.city));
      return [...inCity, ...rest].slice(0, 12);
    }
    if (state) return STORES.filter((s) => s.state === state).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    return [];
  }, [q, here, state, preferCity, preferState]);

  const selected = value ? STORES.find((s) => s.storeNumber === value) : null;

  return (
    <div>
      {selected && (
        <div className="pane-2 mb-3 flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span><span className="font-semibold">Apple {selected.name}</span> <span className="text-ink-3">· {selected.city}, {stateCodeOf(selected)}</span></span>
          <span className="dot dot-ok" aria-hidden />
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
      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        {loc === "asking" && !q && list.length === 0 && Array.from({ length: 5 }, (_, i) => <div key={i} className="flex items-center justify-between gap-3 px-4 py-3"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-10" /></div>)}
        {list.map((s) => {
          const on = s.storeNumber === value;
          return (
            <button key={s.storeNumber} type="button" onClick={() => onChange(s.storeNumber)} aria-pressed={on}
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-ink/5 ${on ? "bg-ink/8" : ""}`}>
              <span className="min-w-0"><span className="font-medium">{s.name}</span> <span className="text-ink-3">· {s.city}, {stateCodeOf(s)}</span></span>
              <span className="shrink-0 text-xs text-ink-3">{s.distance != null ? `${s.distance < 10 ? s.distance.toFixed(1) : Math.round(s.distance)} mi` : ""}</span>
            </button>
          );
        })}
        {loc !== "asking" && list.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-3">{q ? "No store matches — try the city or ZIP." : "Search for your store, tap Near me, or pick a state."}</div>}
      </div>
    </div>
  );
}
