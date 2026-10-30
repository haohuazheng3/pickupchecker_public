"use client";
/** One button: tap for dark, tap again for light. Light is the default. */
import { useEffect, useState } from "react";
import { applyTheme, THEME_KEY, type Theme } from "@/lib/theme";

function storedTheme(): Theme {
  try { return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  // The boot script sets data-theme before paint; re-assert it after hydration (React may reset
  // attributes on <html> it does not know about) and sync the icon. Server renders light.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const stored = storedTheme();
      if (document.documentElement.dataset.theme !== stored) document.documentElement.dataset.theme = stored;
      setDark(stored === "dark");
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  const flip = () => { const next = dark ? "light" : "dark"; applyTheme(next); setDark(next === "dark"); };
  return (
    <button type="button" onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to the light theme" : "Switch to the dark theme"} title={dark ? "Light theme" : "Dark theme"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-2 bg-ink/4 text-ink transition hover:bg-ink/10 active:scale-95">
      {dark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
      )}
    </button>
  );
}
