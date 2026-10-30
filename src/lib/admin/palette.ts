/**
 * Chart colours for the ops console: the light-surface categorical steps of the data-viz palette and
 * the fixed status steps. A plain module on purpose — server pages read it, and a "use client" module
 * would hand them client references instead of strings (the bars then render with no fill).
 */
export const PALETTE = {
  blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a", violet: "#6250d6",
  good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b",
  muted: "rgba(82,81,78,0.35)",
} as const;
