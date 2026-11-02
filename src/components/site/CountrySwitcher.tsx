"use client";
/**
 * The header's country switch: the same kind of page in another country where one exists — home ↔ home,
 * /stores ↔ /{cc}/stores, /stock/{model} ↔ /{cc}/stock/{model}, the map, the restock log — else that
 * country's home. The list renders only when opened, so pages carry no extra links until someone asks.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { countryFromPrefix, type CountryCode } from "@/lib/apple/countries";

export interface SwitchCountry { cc: CountryCode; name: string; short: string; /** Has a store index of its own (one-store countries do not). */ index: boolean }

const MODEL_SLUGS = new Set(["iphone-duo", "iphone-18-pro", "iphone-18-pro-max"]);

/** Where the switch goes for a page: pure, so it is tested. */
export function switchHref(pathname: string, to: SwitchCountry): string {
  const from = countryFromPrefix(pathname.split("/")[1])?.cc ?? "us";
  const rest = (from === "us" ? pathname : pathname.slice(from.length + 1)) || "/";
  const p = to.cc === "us" ? "" : `/${to.cc}`;
  if (rest === "/stores" && to.index) return `${p}/stores`;
  if (rest === "/map" || rest === "/restocks") return `${p}${rest}`;
  const m = rest.match(/^\/stock\/([a-z0-9-]+)$/);
  if (m && MODEL_SLUGS.has(m[1])) return `${p}/stock/${m[1]}`;
  return p || "/";
}

export function CountrySwitcher({ countries }: { countries: SwitchCountry[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = countries.find((c) => c.cc === (countryFromPrefix(pathname.split("/")[1])?.cc ?? "us")) ?? countries[0];
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [open]);
  useEffect(() => { const t = window.setTimeout(() => setOpen(false), 0); return () => window.clearTimeout(t); }, [pathname]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="true" aria-label={`Country: ${current.name}. Switch country`} title="Switch country"
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line-2 bg-ink/4 px-2.5 text-xs font-semibold text-ink transition hover:bg-ink/10 active:scale-95">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
        {current.cc === "us" ? "US" : current.cc.toUpperCase()}
      </button>
      {open && (
        <div className="pane absolute right-0 top-11 z-50 max-h-[70vh] w-56 overflow-y-auto p-1.5 shadow-lg" role="menu">
          {countries.map((c) => (
            <Link key={c.cc} href={switchHref(pathname, c)} role="menuitem" className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-ink/6 ${c.cc === current.cc ? "font-semibold text-ink" : "text-ink-2"}`} onClick={() => setOpen(false)}>
              <span>{c.name}</span><span className="text-xs text-ink-3">{c.cc === "us" ? "US" : c.cc.toUpperCase()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
