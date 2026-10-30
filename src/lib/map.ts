/** Shared map constants (the big map and the store-page mini map). */
import type { Theme } from "./theme";

export const MAP_STYLES: Record<Theme, string> = {
  light: process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron",
  dark: process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK || "https://tiles.openfreemap.org/styles/dark",
};
export const MAP_STYLE = MAP_STYLES.light;
export function mapStyleFor(theme: Theme): string { return MAP_STYLES[theme]; }

/** Dot / label colours per basemap. */
export const MAP_INK: Record<Theme, { ok: string; unknown: string; none: string; stroke: string; label: string; halo: string; me: string }> = {
  light: { ok: "#0a7f49", unknown: "#d97706", none: "rgba(107,117,111,0.5)", stroke: "#ffffff", label: "#0d1411", halo: "#ffffff", me: "#0a7aff" },
  dark: { ok: "#35e38c", unknown: "#ffb547", none: "rgba(180,184,198,0.55)", stroke: "#07080c", label: "#f3f4f8", halo: "#07080c", me: "#7cc4ff" },
};

/** MapLibre 6 looks for its worker next to the main module; bundlers move that, so we serve a copy (scripts/vendor.mjs). */
export const MAP_WORKER_URL = "/vendor/maplibre-gl-worker.mjs";
