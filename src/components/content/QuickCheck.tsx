"use client";

import { useMemo, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { STORES, stateCodeOf, appleName, type ModelKey } from "@/lib/apple/catalog";
import { rankStores, searchAnchor, formatDrive, formatMiles, zipAt, type Anchor } from "@/lib/geo";
import { useZipPoint } from "@/lib/useZipPoint";
import { productBySlug, productFor, productPath, storePlace } from "@/lib/seo/products";

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
    if (here) return { ...here, label: "you", kind: "here" };
    return null;
  }, [zipPt, q, here]);
  // Miles only from the visitor (the device or their ZIP), never from a city or store centre.
  const fromVisitor = anchor?.kind === "here" || (anchor?.kind === "zip" && !anchor.approx);

  const rows = useMemo(() => {
    if (anchor) return rankStores(anchor).slice(0, 6);
    // No place yet: the stores with the most configurations in stock right now.
    return [...STORES].sort((a, b) => (stock[b.storeNumber] ?? 0) - (stock[a.storeNumber] ?? 0) || a.name.localeCompare(b.name)).slice(0, storesNow > 0 ? 6 : 0).map((s) => ({ ...s, distance: -1 }));
  }, [anchor, stock, storesNow]);

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setLoc("unavailable"); return; }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setQ(""); setLoc("idle"); },
      (err) => setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      GEO_OPTS,
    );
  };

  return (
    <div className="pane p-4 sm:p-5" data-tool="quick-check">
      {data.models.length > 1 && (
        <div className="seg mb-3" role="tablist" aria-label="iPhone model">
          {data.models.map((m) => (
            <button key={m.key} type="button" role="tab" aria-selected={m.key === model} onClick={() => setModel(m.key)}>{m.short}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="qc-q">ZIP, city or Apple Store</label>
        <input id="qc-q" className="input" inputMode="search" autoComplete="postal-code" placeholder="ZIP, city or Apple Store" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" className="btn btn-ghost shrink-0 px-4" onClick={locate} aria-label="Use my location">{loc === "asking" ? "…" : "📍 Near me"}</button>
      </div>
      {loc === "denied" && <p className="mt-2 text-xs text-ink-3">Location is off for this site. Type a ZIP instead.</p>}
      <p className="mt-3 text-sm text-ink-2" aria-live="polite">
        <span className={`dot ${storesNow > 0 ? "dot-ok" : "dot-bad"} mr-1.5 align-middle`} />
        <strong className="text-ink">{storesNow} of {STORES.length}</strong> US Apple Stores have the {what} for pickup now
        {anchor ? <> · nearest to {anchor.label}</> : null}
      </p>
      {q.trim() && !anchor && <p className="mt-2 text-sm text-ink-3">No match. Try a 5-digit ZIP or a city.</p>}
      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((s) => {
            const n = stock[s.storeNumber] ?? 0;
            return (
              <li key={s.storeNumber}>
                <Link href={productPath(product, storePlace(s))} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{appleName(s)}</span>
                    <span className="block truncate text-xs text-ink-3">{s.city}, {stateCodeOf(s)}{s.distance >= 0 && fromVisitor ? ` · ≈${formatMiles(s.distance)} · ${formatDrive(s.distance)}` : ""}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${n > 0 ? "bg-accent text-[var(--accent-ink)]" : "bg-ink/10 text-ink-2"}`}>{n > 0 ? `${n}/${total} in stock` : "Sold out"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={data.alerts[model]} className="btn btn-hero">Alert me when it&apos;s in stock</Link>
        <Link href={productPath(product)} className="text-sm text-ink-2 underline underline-offset-[3px] hover:text-ink">All {STORES.length} stores →</Link>
      </div>
    </div>
  );
}
