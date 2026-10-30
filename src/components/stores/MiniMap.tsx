"use client";
/** A small non-interactive map with one pin; loads MapLibre only when scrolled into view. */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import { MAP_STYLE, MAP_WORKER_URL } from "@/lib/map";

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
      map = new lib.Map({ container: el.current, style: MAP_STYLE, center: [lng, lat], zoom: 12.5, interactive: false, attributionControl: { compact: true } });
      map.on("load", () => {
        if (!map) return;
        map.addSource("pin", { type: "geojson", data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} } });
        map.addLayer({ id: "pin-halo", type: "circle", source: "pin", paint: { "circle-radius": 16, "circle-color": "#0a7f49", "circle-opacity": 0.18 } });
        map.addLayer({ id: "pin", type: "circle", source: "pin", paint: { "circle-radius": 7, "circle-color": "#0a7f49", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      });
    })();
    return () => { cancelled = true; map?.remove(); };
  }, [visible, lat, lng]);
  return (
    <Link href={href} className="pane-hover relative block h-56 overflow-hidden rounded-[20px] border border-line bg-bg-2" aria-label={`Open ${label} on the live map`}>
      <div ref={el} className="h-full w-full" />
      <span className="absolute bottom-3 left-3 rounded-full border border-line-2 bg-pane px-3 py-1 text-xs backdrop-blur">Open on the live map →</span>
    </Link>
  );
}
