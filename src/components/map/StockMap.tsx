"use client";
/**
 * Live pickup-stock map: every US Apple Store as a dot, sized and colored by how many of the
 * selected configurations it lists for pickup right now. Re-polls /api/map on REFRESH_MS, so "Updated … ago" never drifts past one sweep.
 * MapLibre + OpenFreeMap tiles (no key, no quota); the library loads only on this page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import "maplibre-gl/dist/maplibre-gl.css";
import type * as maplibregl from "maplibre-gl";
import { MODELS, PART_INDEX, modelKeyFor, storagesFor, colorsFor, STORAGE_ORDER, COLOR_META, type ModelKey } from "@/lib/apple/catalog-us";
import type { MapSnapshot } from "@/lib/stock/queries";
import { LiveAgo } from "@/components/site/LiveAgo";
import { MAP_INK, MAP_WORKER_URL as WORKER_URL, mapStyleFor } from "@/lib/map";
import { currentTheme, onThemeChange, type Theme } from "@/lib/theme";
import { rememberHere } from "@/lib/lastPlace";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { Rich } from "@/components/i18n/Rich";
import { fill, num, plural, bidi } from "@/lib/i18n/format";
import { cityLabel, colorLabel, countryLabel, regionLabel, storeLabel } from "@/lib/i18n/places";
import type { CountryCode } from "@/lib/apple/countries";

export interface MapStore { n: string; name: string; city: string; state: string; code: string; path: string; cityHref: string; stateHref: string; lat: number; lng: number }
function dotColor(t: Theme) { const ink = MAP_INK[t]; return ["match", ["get", "state"], "ok", ink.ok, "unknown", ink.unknown, ink.none] as unknown as string; }

export interface MapFocus { model: ModelKey | "all"; store?: string; stores?: string[]; stateCode?: string }

/**
 * Another country's map: its name and region noun, and its part numbers decoded (the browser has only the US
 * catalogue; the page hands this country's in). Absent = the US.
 */
export interface MapCountry { cc: string; name: string; inName: string; regionNoun: string | null; regionNounPlural: string | null; parts: Record<string, { model: ModelKey; storage: string; color: string }> }
type Decoded = { model: ModelKey; storage: string; color: string; partNumber: string };

type Bounds = [[number, number], [number, number]];
const REGIONS: Record<string, Bounds> = {
  "Lower 48": [[-125.5, 24.3], [-66.5, 49.5]],
  Alaska: [[-170, 51], [-130, 72]],
  Hawaii: [[-161, 18.5], [-154, 22.5]],
  "Puerto Rico": [[-67.5, 17.8], [-65.2, 18.6]],
};
const REFRESH_MS = 10_000;

type ModelFilter = ModelKey | "all";
interface Filter { model: ModelFilter; storage: string; color: string }

interface StoreView extends MapStore { parts: string[]; checked: string | null }

function boundsOf(pts: { lat: number; lng: number }[], pad = 0.5): Bounds | null {
  if (!pts.length) return null;
  const lngs = pts.map((p) => p.lng), lats = pts.map((p) => p.lat);
  return [[Math.min(...lngs) - pad, Math.min(...lats) - pad * 0.7], [Math.max(...lngs) + pad, Math.max(...lats) + pad * 0.7]];
}

export function StockMap({ stores, initial, focus, country }: { stores: MapStore[]; initial: MapSnapshot; focus: MapFocus; country?: MapCountry }) {
  const d = useT().map;
  const lang = useLang();
  // Names in the page's language: English keeps the data's own; another language reads Apple's names in it.
  const en = lang === "en";
  const cc = (country?.cc ?? "us") as CountryCode;
  const L = useMemo(() => ({
    store: (s: { n: string; name: string }) => (en ? s.name : storeLabel({ storeNumber: s.n, name: s.name }, lang)),
    /** "Apple Fifth Avenue" / "Apple 銀座". */
    apple: (s: { n: string; name: string }) => { const n = en ? s.name : storeLabel({ storeNumber: s.n, name: s.name }, lang); return en || !/^apple\b/i.test(n) ? `Apple ${n}` : n; },
    city: (c: string) => cityLabel(cc, c, lang),
    region: (r: string) => regionLabel(cc, r, lang),
    /** A region's code; where a country has none it is the region's (English) name, so it reads in the language too. */
    code: (code: string, region: string) => (en || code !== region ? code : regionLabel(cc, region, lang)),
    color: (c: string) => colorLabel(c, lang),
    n: (x: number) => (en ? String(x) : num(lang, x)),
    in: country ? (en ? country.inName : fill(d.inCountry, { country: countryLabel(cc, lang) })) : "",
  }), [en, lang, cc, country, d]);
  const decode = useCallback((part: string): Decoded | null => {
    if (country) { const x = country.parts[part]; return x ? { ...x, partNumber: part } : null; }
    const item = PART_INDEX.get(part);
    return item ? { model: modelKeyFor(item.model), storage: item.storage, color: item.color, partNumber: part } : null;
  }, [country]);
  // A country's own extent replaces the US region buttons.
  const regions = useMemo<Record<string, Bounds>>(() => (country ? { [fill(d.allOf, { country: en ? country.name : countryLabel(cc, lang) })]: boundsOf(stores, 0.6) ?? REGIONS["Lower 48"] } : Object.fromEntries(Object.entries(REGIONS).map(([k, b]) => [d.regions[k] ?? k, b]))), [country, stores, d, en, cc, lang]);
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
        const res = await fetch(country ? `/api/map?country=${country.cc}` : "/api/map", { cache: "no-store" });
        if (res.ok && !stop) setSnap((await res.json()) as MapSnapshot);
      } catch { /* keep the last snapshot */ }
    };
    const id = setInterval(() => { if (document.visibilityState === "visible") void load(); }, REFRESH_MS);
    const vis = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", vis);
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => { stop = true; clearInterval(id); clearInterval(t); document.removeEventListener("visibilitychange", vis); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one poller per page; the country never changes on a page
  }, []);

  // ---- filtering
  const matches = useCallback((part: string) => {
    const item = decode(part);
    if (!item) return false;
    if (filter.model !== "all" && item.model !== filter.model) return false;
    if (filter.storage && item.storage !== filter.storage) return false;
    if (filter.color && item.color !== filter.color) return false;
    return true;
  }, [filter, decode]);

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
      properties: { n: v.n, name: L.store(v), apple: L.apple(v), city: L.city(v.city), code: L.code(v.code, v.state), count: v.parts.length, state: v.parts.length ? "ok" : v.checked ? "idle" : "unknown" },
    })),
  }), [views, L]);

  // ---- map lifecycle
  useEffect(() => {
    let cancelled = false;
    const el = mapEl.current;
    if (!el) return;
    (async () => {
      let lib: typeof maplibregl;
      try { lib = await import("maplibre-gl"); } catch { setMapError(d.errors.library); return; }
      if (cancelled) return;
      libRef.current = lib;
      lib.setWorkerUrl(WORKER_URL);
      const focusStore = focus.store ? stores.find((s) => s.n === focus.store) : undefined;
      const focusBounds = focus.stores?.length ? boundsOf(stores.filter((s) => focus.stores!.includes(s.n)), 0.3) : focus.stateCode ? boundsOf(stores.filter((s) => s.code === focus.stateCode)) : null;
      let map: maplibregl.Map;
      try {
        map = new lib.Map({
          container: el, style: mapStyleFor(currentTheme()), minZoom: 2, maxZoom: 16, attributionControl: { compact: true },
          ...(focusStore ? { center: [focusStore.lng, focusStore.lat] as [number, number], zoom: 11 } : { bounds: focusBounds ?? (country ? Object.values(regions)[0] : REGIONS["Lower 48"]), fitBoundsOptions: { padding: 40 } }),
        });
      } catch {
        // MapLibre throws synchronously when the browser has no WebGL2 (old GPUs, some locked-down Chromes);
        // show the fallback note instead of an unhandled rejection — the store list below works without it.
        setMapError(d.errors.webgl);
        return;
      }
      mapRef.current = map;
      if (process.env.NODE_ENV !== "production") (window as unknown as { __pcMap?: maplibregl.Map }).__pcMap = map;
      map.addControl(new lib.NavigationControl({ showCompass: false }), "top-left");
      map.on("error", (e: maplibregl.ErrorEvent) => { if (!map.isStyleLoaded()) setMapError(fill(d.errors.tiles, { reason: e.error?.message ?? d.errors.network })); });
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
          const p = f.properties as { apple: string; city: string; code: string; count: number };
          popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(`<b>${esc(p.apple)}</b><span>${esc(p.city)}, ${esc(p.code)} · ${p.count ? fill(d.popupCount, { n: L.n(p.count) }) : d.popupNone}</span>`).addTo(map);
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
        rememberHere({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
  const own = country ? Object.values(country.parts).filter((x) => x.model === filter.model) : [];
  const storages = filter.model === "all" ? [] : country ? STORAGE_ORDER.filter((s) => own.some((x) => x.storage === s)) : storagesFor(filter.model);
  const colors = filter.model === "all" ? [] : country ? [...new Set(own.map((x) => x.color))] : colorsFor(filter.model);
  // What the stores are grouped by: English keeps the country data's words; another language its own.
  const noun = country ? (en ? { one: country.regionNoun ?? "area", other: country.regionNounPlural ?? "areas" } : d.nouns[country.regionNoun ?? "area"] ?? d.nouns.area) : { one: d.usNoun, other: d.usNouns };
  const regionNoun = noun.one;
  const model = modelMeta ? bidi(modelMeta.short, lang) : "iPhone";
  void tick;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-5xl">{d.title}</h1>
          <p className="mt-2 max-w-2xl text-ink-2">{country ? fill(stores.length === 1 ? d.leadOne : d.leadAll, { n: L.n(stores.length), in: L.in }) : fill(d.leadUs, { n: L.n(stores.length) })}{fill(d.leadTail, { model })}</p>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-ink-3"><span className={`dot ${stats.newest ? "dot-ok dot-live" : "dot-warn"}`} /> {stats.newest ? <Rich text={d.updated} vars={{ ago: <LiveAgo iso={stats.newest} /> }} /> : d.waiting}</div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
        {MODELS.map((m) => <button key={m.key} type="button" className="chip" aria-pressed={filter.model === m.key} onClick={() => setFilter({ model: m.key, storage: "", color: "" })}>{m.name}</button>)}
        <button type="button" className="chip" aria-pressed={filter.model === "all"} onClick={() => setFilter({ model: "all", storage: "", color: "" })}>{d.allModels}</button>
        {modelMeta && (
          <>
            <span className="mx-1 text-ink-3">·</span>
            <select className="input py-2.5" style={{ width: "auto" }} value={filter.storage} onChange={(e) => setFilter((f) => ({ ...f, storage: e.target.value }))} aria-label={d.storage}>
              <option value="">{d.anyStorage}</option>
              {storages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input py-2.5" style={{ width: "auto" }} value={filter.color} onChange={(e) => setFilter((f) => ({ ...f, color: e.target.value }))} aria-label={d.color}>
              <option value="">{d.anyColor}</option>
              {colors.map((c) => <option key={c} value={c}>{L.color(c)}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="pane relative h-[62vh] min-h-[460px] overflow-hidden">
          {/* explicit size, not inset-0: maplibre's own CSS sets position: relative on the container */}
          <div ref={mapEl} className="h-full w-full" aria-label={country ? fill(d.mapLabel, { in: L.in }) : d.mapLabelUs} role="application" />
          {!ready && !mapError && <div className="absolute inset-0 flex items-center justify-center bg-bg-2 text-sm text-ink-3"><span className="spinner me-2" /> {d.loading}</div>}
          {mapError && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-ink-2">{fill(d.errors.tail, { error: mapError })}</div>}
          <div className="absolute end-3 top-3 flex flex-wrap justify-end gap-1.5">
            <button type="button" className="rounded-full border border-accent/50 bg-pane px-2.5 py-1 text-[11px] font-medium text-accent backdrop-blur hover:bg-ink/10 sm:px-3 sm:py-1.5 sm:text-xs" onClick={nearMe} disabled={locating}>{locating ? d.locating : d.nearMe}</button>
            {Object.entries(regions).map(([name, b]) => <button key={name} type="button" className="rounded-full border border-line-2 bg-pane px-2.5 py-1 text-[11px] font-medium backdrop-blur hover:bg-ink/10 sm:px-3 sm:py-1.5 sm:text-xs" onClick={() => flyTo(b)}>{name}</button>)}
          </div>
          <div className="absolute bottom-7 start-3 flex flex-wrap gap-x-4 gap-y-1 rounded-2xl border border-line bg-pane px-3 py-2 text-xs text-ink-2 backdrop-blur">
            <span className="inline-flex items-center gap-1.5"><span className="dot dot-ok" /> {d.legend.inStock}</span>
            <span className="inline-flex items-center gap-1.5"><span className="dot" /> {d.legend.none}</span>
            <span className="inline-flex items-center gap-1.5"><span className="dot dot-warn" /> {d.legend.unchecked}</span>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="pane p-5">
            <div className="eyebrow">{d.rightNow}</div>
            <div className="mt-2 flex items-baseline gap-2"><span className="display text-5xl">{stats.withStock}</span><span className="text-ink-3">{fill(d.ofStores, { n: L.n(stores.length) })}</span></div>
            <p className="mt-1 text-sm text-ink-2">{fill(plural(lang, stats.configs, d.configs), { n: L.n(stats.configs), model })}{filter.storage ? ` · ${filter.storage}` : ""}{filter.color ? ` · ${L.color(filter.color)}` : ""}.</p>
            {stats.states.length > 0 && stats.withStock > 0 && (
              <ol className="mt-4 space-y-1.5">
                {stats.states.filter((s) => s.withStock > 0).slice(0, 8).map((s) => (
                  <li key={s.code}>
                    <button type="button" className="group grid w-full grid-cols-[2.2rem_1fr_auto] items-center gap-2 text-start text-sm" onClick={() => focusState(s.code)}>
                      <span className="font-mono text-xs text-ink-3">{s.code}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-ink/6"><span className="block h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(6, (s.withStock / stats.states[0].withStock) * 100)}%` }} /></span>
                      <span className="text-ink-2 group-hover:text-ink">{s.withStock}/{s.stores}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {stats.withStock === 0 && <p className="mt-3 text-sm text-ink-3">{stats.checked ? d.noneListed : d.firstSweep}</p>}
          </div>

          <div className="pane p-5">
            {sel ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="eyebrow">{d.selected}</div>
                    <h2 className="mt-1 text-xl font-semibold">{L.apple(sel)}</h2>
                    <div className="text-sm text-ink-3"><Rich text={d.checked} vars={{ city: L.city(sel.city), region: L.region(sel.state), ago: <LiveAgo iso={sel.checked} /> }} /></div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} aria-label={d.close}>✕</button>
                </div>
                <SelectedParts parts={sel.parts} decode={decode} empty={d.nothingMatching} color={L.color} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={sel.path} className="btn btn-primary btn-sm">{d.openStore}</Link>
                  <Link href={`${country ? `/${country.cc}` : "/"}?model=${modelMeta?.key ?? "duo"}&store=${sel.n}#notify`} className="btn btn-ghost btn-sm">{d.alertHere}</Link>
                </div>
                <p className="mt-2 text-xs text-ink-3"><Link href={sel.cityHref} className="underline hover:text-ink">{L.city(sel.city)}</Link> · <Link href={sel.stateHref} className="underline hover:text-ink">{L.region(sel.state)}</Link></p>
              </>
            ) : (
              <>
                <div className="eyebrow">{d.withStock}</div>
                {stats.withStock === 0 ? <p className="mt-2 text-sm text-ink-3">{d.tapDot}</p> : (
                  <ul className="mt-2 max-h-72 divide-y divide-line overflow-auto text-sm">
                    {views.filter((v) => v.parts.length).sort((a, b) => b.parts.length - a.parts.length || a.state.localeCompare(b.state)).slice(0, 60).map((v) => (
                      <li key={v.n}><button type="button" className="flex w-full items-center justify-between gap-2 py-2 text-start hover:text-accent" onClick={() => focusStore(v.n)}><span><span className="font-medium">{L.store(v)}</span> <span className="text-ink-3">· {L.city(v.city)}, {L.code(v.code, v.state)}</span></span><span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">{v.parts.length}</span></button></li>
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
          <h2 className="text-xl font-semibold">{fill(d.byRegion, { noun: regionNoun })}</h2>
          <p className="text-sm text-ink-3">{fill(d.regionsHave, { n: L.n(stats.states.filter((s) => s.withStock).length), total: L.n(stats.states.length), nouns: noun.other, model })}</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-start text-xs uppercase tracking-wide text-ink-3"><tr><th className="py-2 pe-3 font-medium">{country ? regionNoun[0].toUpperCase() + regionNoun.slice(1) : d.usHeader}</th><th className="py-2 pe-3 font-medium">{d.table.stores}</th><th className="py-2 pe-3 font-medium">{d.table.withStock}</th><th className="py-2 pe-3 font-medium">{d.table.configs}</th><th className="py-2 font-medium">{d.table.share}</th></tr></thead>
            <tbody className="divide-y divide-line">
              {stats.states.map((s) => (
                <tr key={s.code} className="cursor-pointer hover:bg-ink/5" onClick={() => focusState(s.code)}>
                  <td className="py-2 pe-3"><span className="font-mono text-xs text-ink-3">{L.code(s.code, s.name)}</span> {L.region(s.name)} <Link href={stores.find((x) => x.code === s.code)?.stateHref ?? (country ? `/${country.cc}` : "/stores")} className="ms-1 text-xs text-ink-3 underline hover:text-ink" onClick={(e) => e.stopPropagation()}>{d.table.page}</Link></td>
                  <td className="py-2 pe-3 text-ink-2">{s.stores}</td>
                  <td className={`py-2 pe-3 ${s.withStock ? "text-accent" : "text-ink-3"}`}>{s.withStock}</td>
                  <td className="py-2 pe-3 text-ink-2">{s.configs}</td>
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

function SelectedParts({ parts, decode, empty, color }: { parts: string[]; decode: (part: string) => Decoded | null; empty: string; color: (c: string) => string }) {
  const items = parts.map((p) => decode(p)).filter((x): x is Decoded => Boolean(x));
  if (items.length === 0) return <p className="mt-3 text-sm text-ink-3">{empty}</p>;
  const groups = MODELS.map((m) => ({ m, items: items.filter((i) => i.model === m.key).sort((a, b) => STORAGE_ORDER.indexOf(a.storage) - STORAGE_ORDER.indexOf(b.storage) || a.color.localeCompare(b.color)) })).filter((g) => g.items.length);
  return (
    <div className="mt-3 space-y-3">
      {groups.map((g) => (
        <div key={g.m.key}>
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-3">{g.m.name} · {g.items.length}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {g.items.map((i) => <span key={i.partNumber} className="inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2 py-0.5 text-xs text-ink-2"><span className="h-2.5 w-2.5 rounded-full border border-ink/15" style={{ background: COLOR_META[i.color]?.hex ?? "#888" }} />{i.storage} {color(i.color)}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
