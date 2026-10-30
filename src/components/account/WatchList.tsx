"use client";
/** The user's rules: one card per store × exact configuration, plus the old-shape rules that need setting up again. */
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
  return (
    <div className="mt-3 space-y-3">
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      {live.length === 0 && <p className="text-sm text-ink-3">No alerts yet. <Link href="/#notify" className="underline">Create one</Link> — one store, one exact configuration.</p>}
      {live.map((w) => (
        <div key={w.id} className="pane-2 flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <div className="font-semibold">{name(w.model)} <span className="text-ink-3">· {w.storage ?? "?"} · {w.color ?? "?"}</span></div>
            <div className="text-sm text-ink-3">{w.store ? <Link href={w.store.href} className="hover:underline">Apple {w.store.name} · {w.store.city}, {w.store.code}</Link> : "store unknown"}</div>
            <div className={`mt-1 text-xs ${w.covered ? (w.paused ? "text-warn" : "text-accent") : "text-warn"}`}>{!w.covered ? <>Not sending — pick a plan or free a slot. <a href="#plan" className="underline">Plans</a></> : w.paused ? "Paused" : "On — watching every 20 s"}</div>
          </div>
          <div className="flex gap-2">
            {w.covered && <button className="btn btn-ghost btn-sm" disabled={busy === w.id} aria-busy={busy === w.id} onClick={() => patch(w.id, { paused: !w.paused }, { paused: !w.paused })}>{w.paused ? "Resume" : "Pause"}</button>}
            <button className="btn btn-ghost btn-sm" disabled={busy === w.id} aria-busy={busy === w.id} onClick={() => patch(w.id, { active: false }, { active: false, deactivatedReason: null })}>Delete</button>
          </div>
        </div>
      ))}
      {legacy.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <div className="font-semibold">Alerts are now one store × one exact configuration</div>
          <p className="mt-1 text-sm text-ink-2">These older rules watched several configurations or a whole area, so they stopped. Set each one up again with the exact phone and the one store you want.</p>
          <ul className="mt-3 space-y-2">
            {legacy.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-ink-2">{name(w.model)} · {w.legacy.storages.length ? w.legacy.storages.join("/") : "any storage"} · {w.legacy.colors.length ? w.legacy.colors.join("/") : "any color"}{w.legacy.where ? ` · ${w.legacy.where}` : ""}</span>
                <span className="flex shrink-0 gap-2">
                  <Link href={`/?model=${w.model}${w.store ? `&store=${w.store.number}` : ""}#notify`} className="btn btn-primary btn-sm">Set it up again</Link>
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
