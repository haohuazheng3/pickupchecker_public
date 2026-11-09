"use client";
/**
 * "What adds the most pickup windows?" under the alert editor's sum line: for the phones × stores on screen, how many
 * times Apple's pickup page listed any of them in the past 30 days (windows at the same moment counted once), and the
 * three single changes — another colour or storage, one more nearby store — that would have added the most. Past
 * windows only: never a forecast or a chance of buying (lib/stock/windows.ts has the definitions).
 *
 * Folded to one line by default so it never pushes the lists around; fetched after the picks settle (debounced), the
 * last answer stays on screen while the next one loads, answers are reused for five minutes. Free for everyone.
 * The device location (lib/lastPlace.ts, ~1 km) only measures distances; the server neither stores nor returns it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { MODELS, type ModelKey } from "@/lib/apple/catalog-us";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { formatRoad } from "@/lib/geo";
import { recallHere } from "@/lib/lastPlace";
import { phoneKey, type AlertSet, type Phone } from "@/lib/alertSet";
import { MAX_PARTS, MAX_STORES, type WindowsResponse } from "@/lib/stock/windows";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { bidi, fill, num, plural, unit } from "@/lib/i18n/format";
import { colorLabel, storeLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";
import type { PhoneCatalog } from "./PhoneMatrix";

const DEBOUNCE_MS = 700;
const TTL_MS = 5 * 60_000;
/** Answers by request body, for this tab: ticking a box off and on again asks nothing new. */
const memo = new Map<string, { at: number; data: WindowsResponse }>();

/** "46 min", "5 h", "3 d": a total listed time in the language's short units. */
const listedTime = (lang: Lang, min: number) => (min < 120 ? unit(lang, Math.max(1, min), "m") : min < 48 * 60 ? unit(lang, Math.round(min / 60), "h") : unit(lang, Math.round(min / 1440), "d"));

type Gain = WindowsResponse["gains"][number];

export function PickupWindows({ set, catalog, names, onAddPhone, onAddStore }: {
  set: AlertSet;
  catalog: PhoneCatalog;
  /** Store number → its name as the editor shows it. */
  names: Map<string, string>;
  onAddPhone: (p: Phone) => void;
  onAddStore: (storeNumber: string) => void;
}) {
  const d = useT().alerts.windows;
  const lang = useLang();
  const [data, setData] = useState<WindowsResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const latest = useRef("");

  // Part numbers of the phones on screen, in the catalogue's country (the server maps them to any store's country).
  const parts = useMemo(() => [...new Set(set.phones.map((p) => catalog.configs[p.model as ModelKey]?.find((c) => c.storage === p.storage && c.color === p.color)?.partNumber).filter((p): p is string => Boolean(p)))].sort(), [set.phones, catalog]);
  const stores = useMemo(() => [...new Set(set.stores)].sort(), [set.stores]);
  const usable = parts.length > 0 && stores.length > 0 && parts.length <= MAX_PARTS && stores.length <= MAX_STORES;
  const selKey = usable ? `${parts.join(",")}|${stores.join(",")}` : "";

  useEffect(() => {
    if (!selKey) return;
    const here = recallHere();
    const body = JSON.stringify({ parts, stores, ...(here ? { lat: here.lat, lng: here.lng } : {}) });
    latest.current = body;
    const hit = memo.get(body);
    if (hit && Date.now() - hit.at < TTL_MS) {
      const t = window.setTimeout(() => { if (latest.current === body) setData(hit.data); }, 0);
      return () => window.clearTimeout(t);
    }
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/windows", { method: "POST", headers: { "content-type": "application/json" }, body, signal: ctl.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as WindowsResponse;
        memo.set(body, { at: Date.now(), data: j });
        if (latest.current === body) setData(j);
      } catch {
        // Quietly absent: the tool is a help, never an error on the alert screen.
        if (latest.current === body && !ctl.signal.aborted) setData(null);
      } finally {
        if (latest.current === body) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => { window.clearTimeout(t); ctl.abort(); };
    // selKey carries parts and stores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  if (!usable) return null;
  if (!data) return busy ? <p className="px-1 text-xs text-ink-3" aria-live="polite"><span className="spinner" /> {d.counting}</p> : null;

  const days = plural(lang, Math.max(1, Math.round(data.window.days)), d.daysN);
  const picked = new Set(set.phones.map(phoneKey));
  const oneConfig = set.phones.length === 1;
  const models = new Set(set.phones.map((p) => p.model));
  const configName = (g: Extract<Gain, { kind: "color" | "storage" }>) => {
    const color = catalog.configs[g.model as ModelKey]?.find((c) => c.color === g.color)?.colorLabel ?? colorLabel(g.color, lang);
    if (oneConfig) return g.kind === "color" ? color : g.storage;
    const short = MODELS.find((m) => m.key === g.model)?.short ?? g.model;
    return models.size > 1 ? `${bidi(short, lang)} ${g.storage} ${color}` : `${g.storage} ${color}`;
  };
  const storeName = (g: Extract<Gain, { kind: "store" }>) => names.get(g.storeNumber) ?? storeLabel({ storeNumber: g.storeNumber, name: g.store }, lang);
  const label = (g: Gain) => (g.kind === "store"
    ? fill(d.storeAt, { store: storeName(g), dist: formatRoad(g.distanceMi, COUNTRIES[(g.country as CountryCode) ?? "us"]?.unit ?? "mi", lang) })
    : configName(g));
  // Still worth adding: gained a window, and not added since this answer arrived.
  const top = data.gains.filter((g) => g.windows > 0 && (g.kind === "store" ? !set.stores.includes(g.storeNumber) : !picked.has(phoneKey(g)))).slice(0, 3);
  const add = (g: Gain) => (g.kind === "store" ? onAddStore(g.storeNumber) : onAddPhone({ model: g.model, storage: g.storage, color: g.color }));

  const had = fill(d.had, { windows: plural(lang, data.selection.windows, d.windowsN), days });
  const line = data.tooFew ? fill(d.tooFew, { days, n: num(lang, data.sample) })
    : `${had}${top[0] ? fill(d.best, { gain: plural(lang, top[0].windows, d.gainN), what: top[0].kind === "store" ? storeName(top[0]) : configName(top[0]) }) : d.noGain}`;

  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)} className={`group px-1 text-sm transition-opacity ${busy ? "opacity-60" : ""}`}>
      <summary className="flex cursor-pointer list-none items-start gap-1.5 text-ink-2 hover:text-ink [&::-webkit-details-marker]:hidden" aria-label={`${d.title} ${line}`}>
        <svg viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90 rtl:-scale-x-100 rtl:group-open:-rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 4l4 4-4 4" /></svg>
        <span className="min-w-0 tabular-nums">{line}</span>
      </summary>
      <div className="mt-2 rounded-2xl border border-line p-3 sm:p-4">
        <div className="font-semibold">{d.title}</div>
        {!data.tooFew && data.selection.windows > 0 && <p className="mt-0.5 text-xs text-ink-3">{fill(d.listed, { time: listedTime(lang, data.selection.listedMin) })}</p>}
        {!data.tooFew && top.length > 0 && (
          <ul className="mt-2 divide-y divide-line">
            {top.map((g) => {
              const what = label(g);
              return (
                <li key={g.kind === "store" ? g.storeNumber : `${g.model}|${g.storage}|${g.color}`} className="flex items-center gap-2 py-2">
                  <span className="shrink-0 rounded-full bg-accent/12 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent">{plural(lang, g.windows, d.gainN)}</span>
                  <span className="min-w-0 flex-1 truncate">{what}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-3">{plural(lang, g.alerts, d.cost)}</span>
                  <button type="button" className="btn btn-ghost btn-sm shrink-0" onClick={() => add(g)} aria-label={fill(d.add, { what })}>{d.addButton}</button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-xs leading-snug text-ink-3">{d.note}</p>
      </div>
    </details>
  );
}
