"use client";
import { useMemo, useState } from "react";
import { STORES, statesWithStores, storesNear } from "@/lib/apple/catalog";

export interface StoreSelection { storeNumbers: string[]; zip?: string; radiusMiles?: number; lat?: number; lng?: number }

export function StorePicker({ value, onChange }: { value: StoreSelection; onChange: (v: StoreSelection) => void }) {
  const [mode, setMode] = useState<"near" | "zip" | "pick" | "all">(value.storeNumbers.length ? "pick" : value.lat != null ? "near" : value.zip ? "zip" : "near");
  const [state, setState] = useState<string>("");
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const states = useMemo(() => statesWithStores(), []);
  const locate = () => {
    if (!("geolocation" in navigator)) { setLocError("Location is not available in this browser — enter a ZIP instead."); return; }
    setLocating(true); setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); onChange({ storeNumbers: [], lat: Math.round(pos.coords.latitude * 1e4) / 1e4, lng: Math.round(pos.coords.longitude * 1e4) / 1e4, radiusMiles: value.radiusMiles ?? 50 }); },
      (err) => { setLocating(false); setLocError(err.code === err.PERMISSION_DENIED ? "Location permission was denied — enter a ZIP instead." : "Could not get your location — enter a ZIP instead."); },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  };
  const nearCount = value.lat != null && value.lng != null ? storesNear(value.lat, value.lng, value.radiusMiles ?? 50).length : 0;
  const list = useMemo(() => {
    const base = state ? STORES.filter((s) => s.state === state) : STORES;
    const needle = q.trim().toLowerCase();
    return (needle ? base.filter((s) => `${s.name} ${s.city} ${s.state}`.toLowerCase().includes(needle)) : base).slice(0, 60);
  }, [state, q]);

  const set = (m: typeof mode) => {
    setMode(m);
    if (m === "all") onChange({ storeNumbers: [] });
    if (m === "zip") onChange({ storeNumbers: [], zip: value.zip, radiusMiles: value.radiusMiles ?? 50 });
    if (m === "pick") onChange({ storeNumbers: value.storeNumbers });
    if (m === "near") { onChange({ storeNumbers: [], lat: value.lat, lng: value.lng, radiusMiles: value.radiusMiles ?? 50 }); if (value.lat == null) locate(); }
  };
  const toggleStore = (n: string) => {
    const has = value.storeNumbers.includes(n);
    onChange({ storeNumbers: has ? value.storeNumbers.filter((x) => x !== n) : [...value.storeNumbers, n] });
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist">
        <button type="button" className="chip" aria-pressed={mode === "near"} onClick={() => set("near")}>📍 Near me</button>
        <button type="button" className="chip" aria-pressed={mode === "zip"} onClick={() => set("zip")}>Near a ZIP code</button>
        <button type="button" className="chip" aria-pressed={mode === "pick"} onClick={() => set("pick")}>Pick stores</button>
        <button type="button" className="chip" aria-pressed={mode === "all"} onClick={() => set("all")}>All 269 US stores</button>
      </div>

      {mode === "near" && (
        <div className="mt-4">
          {value.lat == null ? (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn btn-primary" disabled={locating} onClick={locate}>{locating ? <><span className="spinner" /> Locating…</> : "Use my location"}</button>
              <span className="text-sm text-ink-3">Your browser asks once. We only keep the coordinates for this alert.</span>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
              <div className="pane-2 flex items-center justify-between px-4 py-3 text-sm"><span>📍 Located · <b className="text-ink">{nearCount}</b> store{nearCount === 1 ? "" : "s"} within {value.radiusMiles ?? 50} mi</span><button type="button" className="text-xs text-ink-3 underline" onClick={locate}>Refresh</button></div>
              <label className="block text-sm text-ink-2">Radius
                <select className="input mt-1" value={value.radiusMiles ?? 50} onChange={(e) => onChange({ ...value, storeNumbers: [], radiusMiles: Number(e.target.value) })}>
                  {[10, 25, 50, 100, 200].map((r) => <option key={r} value={r}>{r} miles</option>)}
                </select>
              </label>
            </div>
          )}
          {locError && <p className="mt-2 text-sm text-warn">{locError}</p>}
        </div>
      )}

      {mode === "zip" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <label className="block text-sm text-ink-2">ZIP code
            <input className="input mt-1" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} placeholder="10001" value={value.zip ?? ""} onChange={(e) => onChange({ storeNumbers: [], zip: e.target.value.replace(/\D/g, "").slice(0, 5), radiusMiles: value.radiusMiles ?? 50 })} />
          </label>
          <label className="block text-sm text-ink-2">Radius
            <select className="input mt-1" value={value.radiusMiles ?? 50} onChange={(e) => onChange({ ...value, storeNumbers: [], radiusMiles: Number(e.target.value) })}>
              {[10, 25, 50, 100, 200].map((r) => <option key={r} value={r}>{r} miles</option>)}
            </select>
          </label>
        </div>
      )}

      {mode === "pick" && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <select className="input" value={state} onChange={(e) => setState(e.target.value)} aria-label="State">
              <option value="">All states</option>
              {states.map((s) => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
            </select>
            <input className="input" placeholder="Search store or city" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search stores" />
          </div>
          <div className="mt-3 max-h-64 overflow-auto rounded-2xl border border-line">
            {list.map((s) => {
              const on = value.storeNumbers.includes(s.storeNumber);
              return (
                <button key={s.storeNumber} type="button" onClick={() => toggleStore(s.storeNumber)} aria-pressed={on}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/5 ${on ? "bg-white/10" : ""}`}>
                  <span><span className="font-medium">{s.name}</span> <span className="text-ink-3">· {s.city}, {s.state}</span></span>
                  <span className={`dot ${on ? "dot-ok" : ""}`} aria-hidden />
                </button>
              );
            })}
            {list.length === 0 && <div className="px-4 py-6 text-center text-sm text-ink-3">No stores match.</div>}
          </div>
          <div className="mt-2 text-xs text-ink-3">{value.storeNumbers.length} selected{value.storeNumbers.length >= 60 ? " (max 60)" : ""}</div>
        </div>
      )}

      {mode === "all" && <p className="mt-4 text-sm text-ink-2">You&apos;ll hear about every store nationwide. Great for shipping-free pickup anywhere you travel; expect more alerts on launch days.</p>}
    </div>
  );
}
