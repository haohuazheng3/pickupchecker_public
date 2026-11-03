"use client";
/**
 * The header's country and language switch. Languages: the versions this page exists in (Japan's pages in English
 * and 日本語, Switzerland's in English, Deutsch and Français…); on app pages every language the site speaks (the
 * person's choice, kept in the `pc_lang` cookie for the dashboard, pushes and emails). Countries: the same kind of
 * page in another country where one exists — home ↔ home, /stores ↔ /{cc}/stores, /stock/{model}, the map, the
 * restock log — else that country's home, in the version for the reader's language — and under each country with pages
 * in more than one language, every one of them (English, 日本語, Deutsch, Français…), so all versions can be found from
 * any page. The list renders only when opened, so pages carry no extra links until someone asks.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { useAppLocale, useLocale, useT } from "@/components/i18n/LangProvider";
import { type CountryCode } from "@/lib/apple/countries";
import { englishLocale, englishPath, isAppPath, LANG_COOKIE, localeFromSegment, localesOf, localizePath, NATIVE_LOCALES, pathInLocale, versionLabel, LANG_NAMES, type Locale } from "@/lib/i18n/locales";
import { fill } from "@/lib/i18n/format";

export interface SwitchCountry { cc: CountryCode; name: string; short: string; /** Has a store index of its own (one-store countries do not). */ index: boolean; /** The country's name in each language the site speaks. */ names?: Record<string, string> }

const MODEL_SLUGS = new Set(["iphone-duo", "iphone-18-pro", "iphone-18-pro-max"]);

/** Where the switch goes for a page (English form; the link localizes it): pure, so it is tested. */
export function switchHref(pathname: string, to: SwitchCountry): string {
  const en = englishPath(pathname);
  const from = localeFromSegment(en.split("/")[1])?.cc ?? "us";
  const rest = (from === "us" ? en : en.slice(from.length + 1)) || "/";
  const p = to.cc === "us" ? "" : `/${to.cc}`;
  if (rest === "/stores" && to.index) return `${p}/stores`;
  if (rest === "/map" || rest === "/restocks") return `${p}${rest}`;
  const m = rest.match(/^\/stock\/([a-z0-9-]+)$/);
  if (m && MODEL_SLUGS.has(m[1])) return `${p}/stock/${m[1]}`;
  return p || "/";
}

/** The person picks a language: remembered for the app pages (and their pushes and emails, once signed in). */
function remember(loc: Locale | null) {
  document.cookie = `${LANG_COOKIE}=${loc?.native ? loc.id : "en"}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  void fetch("/api/me/locale", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: loc?.native ? loc.id : "en" }) }).catch(() => {});
}

export function CountrySwitcher({ countries }: { countries: SwitchCountry[] }) {
  const pathname = usePathname() ?? "/";
  const loc = useLocale();
  const app = useAppLocale();
  const d = useT().chrome.switcher;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const appPage = isAppPath(pathname);
  const here = localeFromSegment(pathname.split("/")[1]) ?? (appPage && app ? app : englishLocale("us"));
  const current = countries.find((c) => c.cc === here.cc) ?? countries[0];
  // The versions of this page (a country page), or every language (app pages: the dashboard follows the person).
  const versions: { loc: Locale; href: string }[] = appPage
    ? [englishLocale("us"), ...NATIVE_LOCALES.filter((l, i, a) => a.findIndex((x) => x.lang === l.lang) === i)].map((l) => ({ loc: l, href: pathname }))
    : localesOf(here.cc).map((l) => ({ loc: l, href: pathInLocale(pathname, l) }));
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { const t = window.setTimeout(() => setOpen(false), 0); return () => window.clearTimeout(t); }, [pathname]);
  const nameOf = (c: SwitchCountry) => (loc.lang === "en" ? c.name : c.names?.[loc.lang] ?? c.name);
  const badge = here.native ? here.id.split("-")[0].toUpperCase() : current.cc === "us" ? "US" : current.cc.toUpperCase();
  const currentLang = appPage ? (app?.lang ?? "en") : here.lang;
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={fill(d.aria, { country: nameOf(current) })} title={d.title}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line-2 bg-ink/4 px-2.5 text-xs font-semibold text-ink transition hover:bg-ink/10 active:scale-95">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
        {badge}
      </button>
      {open && (
        <div className="pane absolute end-0 top-11 z-50 max-h-[70vh] w-64 overflow-y-auto p-1.5 shadow-lg" role="menu" style={{ background: "var(--pane-solid)" }}>
          {versions.length > 1 && (
            <>
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{d.language}</div>
              {versions.map((v) => {
                const on = v.loc.lang === currentLang;
                const label = appPage ? LANG_NAMES[v.loc.lang] : versionLabel(v.loc);
                // A version switch is always a full page load (PendingLink: another language) — or, on an app page, a reload in the new language.
                return appPage
                  ? <button key={v.loc.lang} type="button" role="menuitem" onClick={() => { remember(v.loc); window.location.reload(); }} className={`flex w-full items-center rounded-xl px-3 py-2 text-start text-sm hover:bg-ink/6 ${on ? "font-semibold text-ink" : "text-ink-2"}`}>{label}</button>
                  : <a key={v.loc.tag} href={v.href} role="menuitem" hrefLang={v.loc.tag} lang={v.loc.tag} onClick={() => remember(v.loc)} className={`flex items-center rounded-xl px-3 py-2 text-sm hover:bg-ink/6 ${on ? "font-semibold text-ink" : "text-ink-2"}`}>{label}</a>;
              })}
              <div className="mx-3 my-1.5 border-t border-line" />
              <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{d.country}</div>
            </>
          )}
          {countries.map((c) => {
            const href = switchHref(pathname, c);
            const langs = localesOf(c.cc);
            return (
              <div key={c.cc}>
                <Link href={localizePath(href, loc.lang)} role="menuitem" className={`flex items-center justify-between rounded-xl px-3 pt-2 text-sm hover:bg-ink/6 ${langs.length > 1 ? "pb-1" : "pb-2"} ${c.cc === current.cc ? "font-semibold text-ink" : "text-ink-2"}`} onClick={() => setOpen(false)}>
                  <span>{nameOf(c)}</span><span className="text-xs text-ink-3">{c.cc === "us" ? "US" : c.cc.toUpperCase()}</span>
                </Link>
                {/* Every language each country's pages are written in, one tap away from any page (a full load: another language). */}
                {langs.length > 1 && (
                  <div className="flex flex-wrap gap-1 px-3 pb-2">
                    {langs.map((l) => {
                      const on = c.cc === current.cc && l.lang === currentLang && !appPage;
                      return <a key={l.tag} href={pathInLocale(href, l)} role="menuitem" hrefLang={l.tag} lang={l.tag} onClick={() => { remember(l); setOpen(false); }}
                        className={`rounded-full border px-2 py-0.5 text-[11px] leading-5 hover:bg-ink/8 ${on ? "border-ink/40 font-semibold text-ink" : "border-line-2 text-ink-3"}`}>{versionLabel(l)}</a>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
