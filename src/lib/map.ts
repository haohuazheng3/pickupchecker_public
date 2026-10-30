/** Shared map constants (the big map and the store-page mini map). */
export const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";
/** MapLibre 6 looks for its worker next to the main module; bundlers move that, so we serve a copy (scripts/vendor.mjs). */
export const MAP_WORKER_URL = "/vendor/maplibre-gl-worker.mjs";
