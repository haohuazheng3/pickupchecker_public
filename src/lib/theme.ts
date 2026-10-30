/** Light (default) / dark theme: one attribute on <html>, persisted, applied before paint. */
export type Theme = "light" | "dark";
export const THEME_KEY = "pc:theme";
export const THEME_COLORS: Record<Theme, string> = { light: "#f6f7f5", dark: "#07080c" };

/** Inline in <body> before anything renders so a dark reader never sees a light flash. */
export const THEME_BOOT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');t=t==='dark'?'dark':'light';var d=document.documentElement;d.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'${THEME_COLORS.dark}':'${THEME_COLORS.light}');}catch(e){}})();`;

export function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode */ }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[t]);
  window.dispatchEvent(new CustomEvent<Theme>("pc:theme", { detail: t }));
}

export function onThemeChange(cb: (t: Theme) => void): () => void {
  const h = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  window.addEventListener("pc:theme", h);
  return () => window.removeEventListener("pc:theme", h);
}
