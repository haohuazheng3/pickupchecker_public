"use client";
/** A small non-interactive map with one pin; loads MapLibre only when scrolled into view. */
import { useEffect, useRef, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_INK, MAP_WORKER_URL, mapStyleFor } from "@/lib/map";
import { currentTheme, onThemeChange } from "@/lib/theme";

export function MiniMap({ lat, lng, label, href }: { lat: number; lng: number; label: string; href: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setVisible(true); }, { rootMargin: "200px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || !el.current) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    (async () => {
      const lib = await import("maplibre-gl");
      if (cancelled || !el.current) return;
      lib.setWorkerUrl(MAP_WORKER_URL);
      map = new lib.Map({ container: el.current, style: mapStyleFor(currentTheme()), center: [lng, lat], zoom: 12.5, interactive: false, attributionControl: { compact: true } });
      map.on("load", () => {
        if (!map) return;
        map.addSource("pin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} } });
        map.addLayer({ id: "pin-halo", type: "circle", source: "pin", paint: { "circle-radius": 16, "circle-color": MAP_INK[currentTheme()].ok, "circle-opacity": 0.18 } });
        map.addLayer({ id: "pin", type: "circle", source: "pin", paint: { "circle-radius": 7, "circle-color": MAP_INK[currentTheme()].ok, "circle-stroke-color": MAP_INK[currentTheme()].stroke, "circle-stroke-width": 2 } });
      });
    })();
    const offTheme = onThemeChange((t) => {
      if (!map) return;
      map.setStyle(mapStyleFor(t), { transformStyle: (prev, next) => prev ? { ...next, sources: { ...next.sources, ...(prev.sources.pin ? { pin: prev.sources.pin } : {}) }, layers: [...next.layers, ...prev.layers.filter((l) => l.id === "pin-halo" || l.id === "pin")] } : next });
      map.once("style.load", () => { if (!map) return; const ink = MAP_INK[t]; if (map.getLayer("pin-halo")) map.setPaintProperty("pin-halo", "circle-color", ink.ok); if (map.getLayer("pin")) { map.setPaintProperty("pin", "circle-color", ink.ok); map.setPaintProperty("pin", "circle-stroke-color", ink.stroke); } });
    });
    return () => { cancelled = true; offTheme(); map?.remove(); };
  }, [visible, lat, lng]);
  return (
    <Link href={href} className="pane-hover relative block h-56 overflow-hidden rounded-[20px] border border-line bg-bg-2" aria-label={`Open ${label} on the live map`}>
      <div ref={el} className="h-full w-full" />
      <span className="absolute bottom-3 left-3 rounded-full border border-line-2 bg-pane px-3 py-1 text-xs backdrop-blur">Open on the live map →</span>
    </Link>
  );
}
