"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { STORES, stateCodeOf, appleName, type ModelKey } from "@/lib/apple/catalog-us";
import { rankStores, searchAnchor, formatDrive, formatMiles, zipAt, driveMinutes, roadMiles, type Anchor } from "@/lib/geo";
import { useZipPoint } from "@/lib/useZipPoint";
import { recallHere, rememberHere } from "@/lib/lastPlace";
import { productBySlug, productFor, productPath, storePlace } from "@/lib/seo/products";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { Md } from "@/components/i18n/Md";
import { distance, fill, num, secs, unit } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

/** "≈4.2 mi · 12 min" in English (as always); other languages km and their units. */
function away(lang: Lang, miles: number, here: string): string {
  if (lang === "en") return `${formatMiles(miles)} · ${formatDrive(miles)}`;
  const m = driveMinutes(miles);
  const drive = m === 0 ? here : m < 60 ? unit(lang, m, "m") : secs(lang, Math.floor(m / 60) * 3600 + Math.round((m % 60) / 5) * 300);
  return `${distance(lang, "us", roadMiles(miles))} · ${drive}`;
}

export interface QuickCheckData {
  /** Configurations available now per store, per model (store number → count). */
  stock: Record<ModelKey, Record<string, number>>;
  /** Configurations tracked per model (8 / 16 / 16). */
  configs: Record<ModelKey, number>;
  models: { key: ModelKey; name: string; short: string }[];
  /** Alert-dialog link per model (built on the server). */
  alerts: Record<ModelKey, string>;
  /** Product page per model that store rows link into (a color/storage page passes its own slug). */
  slugs: Record<ModelKey, string>;
  /** What the counts are about when it is narrower than the model, e.g. "iPhone 18 Pro Max Burgundy". */
  label?: string;
}

const GEO_OPTS: PositionOptions = { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 };

/**
 * The first-screen tool on A-level pages: pick a model, type a ZIP / city / store or use your location,
 * and see the nearest Apple Stores with live pickup stock, each linking to its own live page.
 */
export function QuickCheck({ data, initialModel }: { data: QuickCheckData; initialModel: ModelKey }) {
  const d = useT().content.quickCheck;
  const lang = useLang();
  const n = (x: number) => (lang === "en" ? String(x) : num(lang, x));
  const [model, setModel] = useState<ModelKey>(initialModel);
  const [q, setQ] = useState("");
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [loc, setLoc] = useState<"idle" | "asking" | "denied" | "unavailable">("idle");
  const stock = data.stock[model];
  const total = data.configs[model];
  const storesNow = useMemo(() => Object.values(stock).filter((n) => n > 0).length, [stock]);
  const meta = data.models.find((m) => m.key === model)!;
  const product = productBySlug(data.slugs[model]) ?? productFor(model);
  const what = data.label ?? meta.name;

  const zipPt = useZipPoint(q);
  const anchor = useMemo<Anchor | null>(() => {
    if (zipPt) return zipAt(zipPt.zip, zipPt);
    if (q.trim()) return searchAnchor(q);
    if (here) return { ...here, label: d.you, kind: "here" };
    return null;
  }, [zipPt, q, here, d.you]);
  // Miles only from the visitor (the device or their ZIP), never from a city or store centre.
  const fromVisitor = anchor?.kind === "here" || (anchor?.kind === "zip" && !anchor.approx);

  const rows = useMemo(() => {
    if (anchor) return rankStores(anchor).slice(0, 6);
    // No place yet: the stores with the most configurations in stock right now.
    return [...STORES].sort((a, b) => (stock[b.storeNumber] ?? 0) - (stock[a.storeNumber] ?? 0) || a.name.localeCompare(b.name)).slice(0, storesNow > 0 ? 6 : 0).map((s) => ({ ...s, distance: -1 }));
  }, [anchor, stock, storesNow]);

  // Where this device was last located (lib/lastPlace.ts): the nearest stores at once, no prompt.
  useEffect(() => {
    const t = window.setTimeout(() => { const h = recallHere(); if (h) setHere((cur) => cur ?? h); }, 0);
    return () => window.clearTimeout(t);
  }, []);

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLoc("unavailable"); return; }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const h = { lat: pos.coords.latitude, lng: pos.coords.longitude }; rememberHere(h); setHere(h); setQ(""); setLoc("idle"); },
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      GEO_OPTS,
    );
  };

  return (
    <div className="pane p-4 sm:p-5" data-tool="quick-check">
      {data.models.length > 1 && (
        <div className="seg mb-3" role="tablist" aria-label={d.model}>
          {data.models.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={m.key === model} onClick={() => setModel(m.key)}>{m.short}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="qc-q">{d.search}</label>
        <input id="qc-q" className="input" inputMode="search" autoComplete="postal-code" placeholder={d.search} value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn btn-ghost shrink-0 px-4" onClick={locate} aria-label={d.useLocation}>{loc === "asking" ? "…" : d.nearMe}</button>
      </div>
      {loc === "denied" && <p className="mt-2 text-xs text-ink-3">{d.locationOff}</p>}
      <p className="mt-3 text-sm text-ink-2" aria-live="polite">
        <span className={`dot ${storesNow > 0 ? "dot-ok" : "dot-bad"} mr-1.5 align-middle`} />
        <Md text={fill(d.storesNow, { n: n(storesNow), total: n(STORES.length), what })} b="text-ink" tag="strong" />
        {anchor ? fill(d.nearestTo, { place: anchor.label }) : null}
      </p>
      {q.trim() && !anchor && <p className="mt-2 text-sm text-ink-3">{d.noMatch}</p>}
      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((s) => {
            const have = stock[s.storeNumber] ?? 0;
            return (
              <li key={s.storeNumber}>
                <Link href={productPath(product, storePlace(s))} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{appleName(s)}</span>
                    <span className="block truncate text-xs text-ink-3">{s.city}, {stateCodeOf(s)}{s.distance >= 0 && fromVisitor ? ` · ≈${away(lang, s.distance, d.here)}` : ""}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${have > 0 ? "bg-accent text-[var(--accent-ink)]" : "bg-ink/10 text-ink-2"}`}>{have > 0 ? fill(d.inStock, { n: n(have), total: n(total) }) : d.soldOut}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={data.alerts[model]} className="btn btn-hero">{d.alertMe}</Link>
        <Link href={productPath(product)} className="text-sm text-ink-2 underline underline-offset-[3px] hover:text-ink">{fill(d.allStores, { n: n(STORES.length) })}</Link>
      </div>
    </div>
  );
}
