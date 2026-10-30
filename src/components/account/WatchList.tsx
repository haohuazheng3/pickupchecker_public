"use client";
/** The user's alerts, grouped by phone (model · storage · colour): one row per store, "+ Stores" per group. */
import { useState } from "react";
import Link from "next/link";
import { MODELS } from "@/lib/apple/catalog";

export interface WatchView {
  id: string; model: string; storage: string | null; color: string | null; paused: boolean; active: boolean; covered: boolean; createdAt: string;
  store: { number: string; name: string; city: string; code: string; href: string } | null;
  deactivatedReason: string | null;
  legacy: { storages: string[]; colors: string[]; where: string | null };
}

export function WatchList({ watches }: { watches: WatchView[] }) {
  const [items, setItems] = useState(watches);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const patch = async (id: string, body: Record<string, unknown>, local: Partial<WatchView>) => {
    setBusy(id); setErr(null);
    try {
      const res = await fetch("/api/watches", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      if (!res.ok) throw new Error("Could not update");
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...local } : x)));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const live = items.filter((w) => w.active);
  const legacy = items.filter((w) => !w.active && w.deactivatedReason === "legacy_shape");
  const name = (key: string) => MODELS.find((x) => x.key === key)?.name ?? key;
  const groups = new Map<string, WatchView[]>();
  for (const w of live) { const k = `${w.model}|${w.storage ?? ""}|${w.color ?? ""}`; groups.set(k, [...(groups.get(k) ?? []), w]); }
  return (
    <div className="mt-3 space-y-4">
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      {live.length === 0 && <p className="text-sm text-ink-3">No alerts yet. <Link href="/#notify" className="underline">Set one up</Link>.</p>}
      {[...groups.entries()].map(([k, ws]) => {
        const first = ws[0];
        const on = ws.filter((w) => w.covered && !w.paused).length;
        const addHref = `/?model=${first.model}${first.storage ? `&storage=${encodeURIComponent(first.storage)}` : ""}${first.color ? `&color=${encodeURIComponent(first.color)}` : ""}#notify`;
        return (
          <section key={k} className="pane-2 min-w-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold">{name(first.model)} <span className="text-ink-3">· {first.storage ?? "?"} · {first.color ?? "?"}</span></div>
                <div className="text-xs text-ink-3">{ws.length} store{ws.length === 1 ? "" : "s"} · {on} on</div>
              </div>
              <Link href={addHref} className="btn btn-ghost btn-sm">+ Stores</Link>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {ws.map((w) => (
                <li key={w.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`dot ${!w.covered ? "dot-warn" : w.paused ? "" : "dot-ok"}`} aria-hidden />
                    {w.store ? <Link href={w.store.href} className="truncate hover:underline">{w.store.name} <span className="text-ink-3">· {w.store.city}, {w.store.code}</span></Link> : <span>store unknown</span>}
                    {!w.covered && <a href="#plan" className="text-xs text-warn underline">off · needs a plan</a>}
                    {w.covered && w.paused && <span className="text-xs text-ink-3">paused</span>}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {w.covered && <button className="btn btn-ghost btn-sm" disabled={busy === w.id} aria-busy={busy === w.id} onClick={() => patch(w.id, { paused: !w.paused }, { paused: !w.paused })}>{w.paused ? "Resume" : "Pause"}</button>}
                    <button className="btn btn-ghost btn-sm" disabled={busy === w.id} aria-busy={busy === w.id} onClick={() => patch(w.id, { active: false }, { active: false, deactivatedReason: null })}>Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {legacy.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <div className="font-semibold">Older alerts stopped</div>
          <p className="mt-1 text-sm text-ink-2">Alerts are now one store × one exact phone. Set these up again.</p>
          <ul className="mt-3 space-y-2">
            {legacy.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-ink-2">{name(w.model)} · {w.legacy.storages.length ? w.legacy.storages.join("/") : "any storage"} · {w.legacy.colors.length ? w.legacy.colors.join("/") : "any color"}{w.legacy.where ? ` · ${w.legacy.where}` : ""}</span>
                <span className="flex shrink-0 gap-2">
                  <Link href={`/?model=${w.model}${w.store ? `&store=${w.store.number}` : ""}#notify`} className="btn btn-primary btn-sm">Set up again</Link>
                  <button className="btn btn-ghost btn-sm" disabled={busy === w.id} onClick={() => patch(w.id, { dismiss: true }, { deactivatedReason: "legacy_dismissed" })}>Dismiss</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
