"use client";
/**
 * Live pickup-stock map: every US Apple Store as a dot, sized and colored by how many of the
 * selected configurations it lists for pickup right now. Re-polls /api/map every 20 s.
 * MapLibre + OpenFreeMap tiles (no key, no quota); the library loads only on this page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import type * as maplibregl from "maplibre-gl";
import { MODELS, PART_INDEX, modelKeyFor, storagesFor, colorsFor, STORAGE_ORDER, COLOR_META, type ModelKey } from "@/lib/apple/catalog";
import type { MapSnapshot } from "@/lib/stock/queries";
import { LiveAgo } from "@/components/site/LiveAgo";
import { MAP_INK, MAP_WORKER_URL as WORKER_URL, mapStyleFor } from "@/lib/map";
import { currentTheme, onThemeChange, type Theme } from "@/lib/theme";

export interface MapStore { n: string; name: string; city: string; state: string; code: string; path: string; cityHref: string; stateHref: string; lat: number; lng: number }
function dotColor(t: Theme) { const ink = MAP_INK[t]; return ["match", ["get", "state"], "ok", ink.ok, "unknown", ink.unknown, ink.none] as unknown as string; }

export interface MapFocus { model: ModelKey | "all"; store?: string; stores?: string[]; stateCode?: string }

type Bounds = [[number, number], [number, number]];
const REGIONS: Record<string, Bounds> = {
  "Lower 48": [[-125.5, 24.3], [-66.5, 49.5]],
  Alaska: [[-170, 51], [-130, 72]],
  Hawaii: [[-161, 18.5], [-154, 22.5]],
  "Puerto Rico": [[-67.5, 17.8], [-65.2, 18.6]],
};
const REFRESH_MS = 20_000;

type ModelFilter = ModelKey | "all";
interface Filter { model: ModelFilter; storage: string; color: string }

interface StoreView extends MapStore { parts: string[]; checked: string | null }

function boundsOf(pts: { lat: number; lng: number }[], pad = 0.5): Bounds | null {
  if (!pts.length) return null;
  const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat);
  return [[Math.min(...lngs) - pad, Math.min(...lats) - pad * 0.7], [Math.max(...lngs) + pad, Math.max(...lats) + pad * 0.7]];
}

export function StockMap({ stores, initial, focus }: { stores: MapStore[]; initial: MapSnapshot; focus: MapFocus }) {
  const [snap, setSnap] = useState<MapSnapshot>(initial);
  const [filter, setFilter] = useState<Filter>({ model: focus.model, storage: "", color: "" });
  const [selected, setSelected] = useState<string | null>(focus.store ?? null);
  const [locating, setLocating] = useState(false);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const libRef = useRef<typeof maplibregl | null>(null);

  // ---- live data
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch("/api/map", { cache: "no-store" });
        if (res.ok && !stop) setSnap((await res.json()) as MapSnapshot);
      } catch { /* keep the last snapshot */ }
    };
    const id = setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    const vis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", vis);
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => { stop = true; clearInterval(id); clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, []);

  // ---- filtering
  const matches = useCallback((part: string) => {
    const item = PART_INDEX.get(part);
    if (!item) return false;
    if (filter.model !== "all" && modelKeyFor(item.model) !== filter.model) return false;
    if (filter.storage && item.storage !== filter.storage) return false;
    if (filter.color && item.color !== filter.color) return false;
    return true;
  }, [filter]);

  const views = useMemo<StoreView[]>(() => stores.map((s) => {
    const row = snap.stores[s.n];
    return { ...s, parts: (row?.a ?? []).filter(matches), checked: row?.c ?? null };
  }), [stores, snap, matches]);

  const stats = useMemo(() => {
    const withStock = views.filter((v) => v.parts.length > 0);
    const configs = withStock.reduce((n, v) => n + v.parts.length, 0);
    const byState = new Map<string, { code: string; name: string; stores: number; withStock: number; configs: number }>();
    for (const v of views) {
      const e = byState.get(v.code) ?? { code: v.code, name: v.state, stores: 0, withStock: 0, configs: 0 };
      e.stores++;
      if (v.parts.length) { e.withStock++; e.configs += v.parts.length; }
      byState.set(v.code, e);
    }
    const states = [...byState.values()].sort((a, b) => b.withStock - a.withStock || b.configs - a.configs || a.name.localeCompare(b.name));
    const checked = views.filter((v) => v.checked).length;
    const newest = views.reduce<string | null>((acc, v) => (v.checked && (!acc || v.checked > acc) ? v.checked : acc), null);
    return { withStock: withStock.length, configs, states, checked, newest };
  }, [views]);

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: views.map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
      properties: { n: v.n, name: v.name, city: v.city, code: v.code, count: v.parts.length, state: v.parts.length ? "ok" : v.checked ? "idle" : "unknown" },
    })),
  }), [views]);

  // ---- map lifecycle
  useEffect(() => {
    let cancelled = false;
    const el = mapEl.current;
    if (!el) return;
    (async () => {
      let lib: typeof maplibregl;
      try { lib = await import("maplibre-gl"); } catch { setMapError("The map library could not be loaded."); return; }
      if (cancelled) return;
      libRef.current = lib;
      lib.setWorkerUrl(WORKER_URL);
      const focusStore = focus.store ? stores.find((s) => s.n === focus.store) : undefined;
      const focusBounds = focus.stores?.length ? boundsOf(stores.filter((s) => focus.stores!.includes(s.n)), 0.3) : focus.stateCode ? boundsOf(stores.filter((s) => s.code === focus.stateCode)) : null;
      const map = new lib.Map({
        container: el, style: mapStyleFor(currentTheme()), minZoom: 2, maxZoom: 16, attributionControl: { compact: true },
        ...(focusStore ? { center: [focusStore.lng, focusStore.lat] as [number, number], zoom: 11 } : { bounds: focusBounds ?? REGIONS["Lower 48"], fitBoundsOptions: { padding: 40 } }),
      });
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __pcMap?: maplibregl.Map }).__pcMap = map;
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-left");
      map.on("error", (e: maplibregl.ErrorEvent) => { if (!map.isStyleLoaded()) setMapError(`Map tiles unavailable (${e.error?.message ?? "network"})`); });
      // Theme toggle: swap the basemap but keep our sources/layers, then recolour them.
      const KEEP_SOURCES = ["stores", "me"], KEEP_LAYERS = ["halo", "dots", "labels", "me-halo", "me"];
      const offTheme = onThemeChange((t: Theme) => {
        map.setStyle(mapStyleFor(t), { transformStyle: (prev, next) => prev ? { ...next, sources: { ...next.sources, ...Object.fromEntries(Object.entries(prev.sources).filter(([k]) => KEEP_SOURCES.includes(k))) }, layers: [...next.layers, ...prev.layers.filter((l) => KEEP_LAYERS.includes(l.id))] } : next });
        map.once("style.load", () => {
          const ink = MAP_INK[t];
          if (map.getLayer("halo")) map.setPaintProperty("halo", "circle-color", ink.ok);
          if (map.getLayer("dots")) { map.setPaintProperty("dots", "circle-color", dotColor(t)); map.setPaintProperty("dots", "circle-stroke-color", ink.stroke); }
          if (map.getLayer("labels")) { map.setPaintProperty("labels", "text-color", ink.label); map.setPaintProperty("labels", "text-halo-color", ink.halo); }
          if (map.getLayer("me-halo")) map.setPaintProperty("me-halo", "circle-color", ink.me);
          if (map.getLayer("me")) { map.setPaintProperty("me", "circle-color", ink.me); map.setPaintProperty("me", "circle-stroke-color", ink.stroke); }
        });
      });
      map.once("remove", offTheme);
      const popup = new lib.Popup({ closeButton: false, closeOnClick: false, offset: 14, className: "pc-popup" });
      map.on("load", () => {
        if (cancelled) return;
        setMapError(null); // a transient error before the style finished loading is not fatal
        map.addSource("stores", { type: "geojson", data: geojson });
        map.addLayer({ id: "halo", type: "circle", source: "stores", filter: [">", ["get", "count"], 0], paint: { "circle-radius": ["interpolate", ["linear"], ["get", "count"], 1, 13, 10, 20, 30, 30], "circle-color": MAP_INK[currentTheme()].ok, "circle-opacity": 0.14, "circle-blur": 0.5 } });
        map.addLayer({ id: "dots", type: "circle", source: "stores", paint: {
          "circle-radius": ["case", [">", ["get", "count"], 0], ["interpolate", ["linear"], ["get", "count"], 1, 6, 10, 10, 30, 14], 4.5],
          "circle-color": dotColor(currentTheme()),
          "circle-stroke-color": MAP_INK[currentTheme()].stroke, "circle-stroke-width": 1.5,
        } });
        map.addLayer({ id: "labels", type: "symbol", source: "stores", minzoom: 8, layout: { "text-field": ["get", "name"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", "text-font": ["Noto Sans Regular"], "text-optional": true }, paint: { "text-color": MAP_INK[currentTheme()].label, "text-halo-color": MAP_INK[currentTheme()].halo, "text-halo-width": 1.2 } });
        map.on("mouseenter", "dots", (e: maplibregl.MapLayerMouseEvent) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const p = f.properties as { name: string; city: string; code: string; count: number };
          popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(`<b>Apple ${esc(p.name)}</b><span>${esc(p.city)}, ${esc(p.code)} · ${p.count ? `${p.count} in stock` : "none"}</span>`).addTo(map);
        });
        map.on("mouseleave", "dots", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
        map.on("click", "dots", (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f) setSelected(String((f.properties as { n: string }).n)); });
        setReady(true);
      });
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the map is created once; data flows through setData below
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("stores") as maplibregl.GeoJSONSource | undefined;
    src?.setData(geojson);
  }, [geojson, ready]);

  const flyTo = useCallback((bounds: Bounds) => { mapRef.current?.fitBounds(bounds, { padding: 28, duration: 900 }); }, []);
  const focusStore = useCallback((n: string) => {
    setSelected(n);
    const s = stores.find((x) => x.n === n);
    const map = mapRef.current;
    if (s && map) map.flyTo({ center: [s.lng, s.lat], zoom: Math.max(map.getZoom(), 9.5), duration: 900 });
  }, [stores]);
  const nearMe = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const map = mapRef.current;
        if (!map) return;
        const here: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        const data = { type: "Feature" as const, geometry: { type: "Point" as const, coordinates: here }, properties: {} };
        if (!map.getSource("me")) {
          map.addSource("me", { type: "geojson", data });
          map.addLayer({ id: "me-halo", type: "circle", source: "me", paint: { "circle-radius": 14, "circle-color": MAP_INK[currentTheme()].me, "circle-opacity": 0.22 } });
          map.addLayer({ id: "me", type: "circle", source: "me", paint: { "circle-radius": 6, "circle-color": MAP_INK[currentTheme()].me, "circle-stroke-color": MAP_INK[currentTheme()].stroke, "circle-stroke-width": 2 } });
        } else (map.getSource("me") as maplibregl.GeoJSONSource).setData(data);
        map.flyTo({ center: here, zoom: 9, duration: 1000 });
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, []);
  const focusState = useCallback((code: string) => {
    const pts = stores.filter((s) => s.code === code);
    if (!pts.length) return;
    const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat);
    flyTo([[Math.min(...lngs) - 0.6, Math.min(...lats) - 0.4], [Math.max(...lngs) + 0.6, Math.max(...lats) + 0.4]]);
  }, [stores, flyTo]);

  const sel = selected ? views.find((v) => v.n === selected) ?? null : null;
  const modelMeta = filter.model === "all" ? null : MODELS.find((m) => m.key === filter.model)!;
  const storages = filter.model === "all" ? [] : storagesFor(filter.model);
  const colors = filter.model === "all" ? [] : colorsFor(filter.model);
  void tick;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-5xl">Pickup stock map</h1>
          <p className="mt-2 max-w-2xl text-ink-2">All {stores.length} US Apple Stores, live. Bigger dot = more {modelMeta ? modelMeta.short : "iPhone"} configurations in stock.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-ink-3"><span className={`dot ${stats.newest ? "dot-ok dot-live" : "dot-warn"}`} /> {stats.newest ? <>Updated <LiveAgo iso={stats.newest} /></> : "Waiting for the first sweep"}</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        {MODELS.map((m) => <button key={m.key} type="button" className="chip" aria-pressed={filter.model === m.key} onClick={() => setFilter({ model: m.key, storage: "", color: "" })}>{m.name}</button>)}
        <button type="button" className="chip" aria-pressed={filter.model === "all"} onClick={() => setFilter({ model: "all", storage: "", color: "" })}>All models</button>
        {modelMeta && (
          <>
            <span className="mx-1 text-ink-3">·</span>
            <select className="input py-2.5" style={{ width: "auto" }} value={filter.storage} onChange={(e) => setFilter((f) => ({ ...f, storage: e.target.value }))} aria-label="Storage">
              <option value="">Any storage</option>
              {storages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input py-2.5" style={{ width: "auto" }} value={filter.color} onChange={(e) => setFilter((f) => ({ ...f, color: e.target.value }))} aria-label="Color">
              <option value="">Any color</option>
              {colors.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="pane relative h-[62vh] min-h-[460px] overflow-hidden">
          {/* explicit size, not inset-0: maplibre's own CSS sets position: relative on the container */}
          <div ref={mapEl} className="h-full w-full" aria-label="Map of US Apple Stores" role="application" />
          {!ready && !mapError && <div className="absolute inset-0 flex items-center justify-center bg-bg-2 text-sm text-ink-3"><span className="spinner mr-2" /> Loading map…</div>}
          {mapError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-2">{mapError}. The store list still works.</div>}
          <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-1.5">
            <button type="button" className="rounded-full border border-accent/50 bg-pane px-2.5 py-1 text-[11px] font-medium text-accent backdrop-blur hover:bg-ink/10 sm:px-3 sm:py-1.5 sm:text-xs" onClick={nearMe} disabled={locating}>{locating ? "Locating…" : "📍 Near me"}</button>
            {Object.entries(REGIONS).map(([name, b]) => <button key={name} type="button" className="rounded-full border border-line-2 bg-pane px-2.5 py-1 text-[11px] font-medium backdrop-blur hover:bg-ink/10 sm:px-3 sm:py-1.5 sm:text-xs" onClick={() => flyTo(b)}>{name}</button>)}
          </div>
          <div className="absolute bottom-7 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-line bg-pane px-3 py-2 text-xs text-ink-2 backdrop-blur">
            <span className="inline-flex items-center gap-1.5"><span className="dot dot-ok" /> in stock</span>
            <span className="inline-flex items-center gap-1.5"><span className="dot" /> none</span>
            <span className="inline-flex items-center gap-1.5"><span className="dot dot-warn" /> not checked yet</span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="pane p-5">
            <div className="eyebrow">Right now</div>
            <div className="mt-2 flex items-baseline gap-2"><span className="display text-5xl">{stats.withStock}</span><span className="text-ink-3">of {stores.length} stores</span></div>
            <p className="mt-1 text-sm text-ink-2">{stats.configs} {modelMeta ? modelMeta.short : "iPhone"} configuration{stats.configs === 1 ? "" : "s"} in stock{filter.storage ? ` · ${filter.storage}` : ""}{filter.color ? ` · ${filter.color}` : ""}.</p>
            {stats.states.length > 0 && stats.withStock > 0 && (
              <ol className="mt-4 space-y-1.5">
                {stats.states.filter((s) => s.withStock > 0).slice(0, 8).map((s) => (
                  <li key={s.code}>
                    <button type="button" className="group grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-2 text-left text-sm" onClick={() => focusState(s.code)}>
                      <span className="font-mono text-xs text-ink-3">{s.code}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-ink/6"><span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(6, (s.withStock / stats.states[0].withStock) * 100)}%` }} /></span>
                      <span className="text-ink-2 group-hover:text-ink">{s.withStock}/{s.stores}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {stats.withStock === 0 && <p className="mt-3 text-sm text-ink-3">{stats.checked ? "No store lists this configuration right now." : "First sweep in progress."}</p>}
          </div>

          <div className="pane p-5">
            {sel ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow">Selected store</div>
                    <h2 className="mt-1 text-xl font-semibold">Apple {sel.name}</h2>
                    <div className="text-sm text-ink-3">{sel.city}, {sel.state} · checked <LiveAgo iso={sel.checked} /></div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} aria-label="Close">✕</button>
                </div>
                <SelectedParts parts={sel.parts} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={sel.path} className="btn btn-primary btn-sm">Open store page →</Link>
                  <Link href={`/?model=${modelMeta?.key ?? "duo"}&store=${sel.n}#notify`} className="btn btn-ghost btn-sm">Alert me here</Link>
                </div>
                <p className="mt-2 text-xs text-ink-3"><Link href={sel.cityHref} className="underline hover:text-ink">{sel.city}</Link> · <Link href={sel.stateHref} className="underline hover:text-ink">{sel.state}</Link></p>
              </>
            ) : (
              <>
                <div className="eyebrow">Stores with stock</div>
                {stats.withStock === 0 ? <p className="mt-2 text-sm text-ink-3">Tap a dot for details.</p> : (
                  <ul className="mt-2 max-h-72 divide-y divide-line overflow-auto text-sm">
                    {views.filter((v) => v.parts.length).sort((a, b) => b.parts.length - a.parts.length || a.state.localeCompare(b.state)).slice(0, 60).map((v) => (
                      <li key={v.n}><button type="button" className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-accent" onClick={() => focusStore(v.n)}><span><span className="font-medium">{v.name}</span> <span className="text-ink-3">· {v.city}, {v.code}</span></span><span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">{v.parts.length}</span></button></li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      <section className="pane mt-8 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-xl font-semibold">By state</h2>
          <p className="text-sm text-ink-3">{stats.states.filter((s) => s.withStock).length} of {stats.states.length} states and territories have {modelMeta ? modelMeta.short : "iPhone"} stock.</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-ink-3"><tr><th className="py-2 pr-3 font-medium">State</th><th className="py-2 pr-3 font-medium">Stores</th><th className="py-2 pr-3 font-medium">With stock</th><th className="py-2 pr-3 font-medium">Configurations</th><th className="py-2 font-medium">Share</th></tr></thead>
            <tbody className="divide-y divide-line">
              {stats.states.map((s) => (
                <tr key={s.code} className="cursor-pointer hover:bg-ink/5" onClick={() => focusState(s.code)}>
                  <td className="py-2 pr-3"><span className="font-mono text-xs text-ink-3">{s.code}</span> {s.name} <Link href={stores.find((x) => x.code === s.code)?.stateHref ?? "/stores"} className="ml-1 text-xs text-ink-3 underline hover:text-ink" onClick={(e) => e.stopPropagation()}>page</Link></td>
                  <td className="py-2 pr-3 text-ink-2">{s.stores}</td>
                  <td className={`py-2 pr-3 ${s.withStock ? "text-accent" : "text-ink-3"}`}>{s.withStock}</td>
                  <td className="py-2 pr-3 text-ink-2">{s.configs}</td>
                  <td className="py-2"><span className="block h-1.5 w-32 overflow-hidden rounded-full bg-ink/6"><span className="block h-full bg-accent" style={{ width: `${(s.withStock / s.stores) * 100}%` }} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SelectedParts({ parts }: { parts: string[] }) {
  const items = parts.map((p) => PART_INDEX.get(p)!).filter(Boolean);
  if (items.length === 0) return <p className="mt-3 text-sm text-ink-3">Nothing matching your filter right now.</p>;
  const groups = MODELS.map((m) => ({ m, items: items.filter((i) => modelKeyFor(i.model) === m.key).sort((a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color)) })).filter((g) => g.items.length);
  return (
    <div className="mt-3 space-y-3">
      {groups.map((g) => (
        <div key={g.m.key}>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">{g.m.name} · {g.items.length}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {g.items.map((i) => <span key={i.partNumber} className="inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2 py-0.5 text-xs text-ink-2"><span className="h-2.5 w-2.5 rounded-full border border-ink/15" style={{ background: COLOR_META[i.color]?.hex ?? "#888" }} />{i.storage} {i.color}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
