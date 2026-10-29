"use client";
import { useState } from "react";
import Link from "next/link";
import { MODELS } from "@/lib/apple/catalog";

export interface WatchView { id: string; model: string; storages: string[]; colors: string[]; paused: boolean; active: boolean; zip: string | null; radiusMiles: number | null; storeNames: string[]; covered: boolean; createdAt: string }

export function WatchList({ watches }: { watches: WatchView[] }) {
  const [items, setItems] = useState(watches);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id); setErr(null);
    try {
      const res = await fetch("/api/watches", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...body }) });
      if (!res.ok) throw new Error("Could not update");
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...body } : x)));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  };
  const live = items.filter((w) => w.active);
  if (live.length === 0) return <p className="mt-2 text-sm text-ink-3">No alerts yet. <Link href="/#notify" className="underline">Create one</Link>.</p>;
  return (
    <div className="mt-3 space-y-3">
      {err && <p role="alert" className="text-sm text-bad">{err}</p>}
      {live.map((w) => {
        const m = MODELS.find((x) => x.key === w.model);
        const where = w.storeNames.length ? w.storeNames.slice(0, 4).join(", ") + (w.storeNames.length > 4 ? ` +${w.storeNames.length - 4}` : "") : w.zip ? `within ${w.radiusMiles ?? 50} mi of ${w.zip}` : "all US stores";
        return (
          <div key={w.id} className="pane-2 flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">{m?.name ?? w.model} <span className="text-ink-3">· {w.storages.length ? w.storages.join("/") : "any storage"} · {w.colors.length ? w.colors.join("/") : "any color"}</span></div>
              <div className="text-sm text-ink-3">{where}</div>
              <div className={`mt-1 text-xs ${w.covered ? (w.paused ? "text-warn" : "text-accent") : "text-warn"}`}>{!w.covered ? <>Over your plan&apos;s limit — not sending. <a href="#plan" className="underline">Upgrade</a> or delete an older rule.</> : w.paused ? "Paused" : "Sending alerts"}</div>
            </div>
            <div className="flex gap-2">
              {w.covered && <button className="btn btn-ghost btn-sm" disabled={busy === w.id} onClick={() => patch(w.id, { paused: !w.paused })}>{w.paused ? "Resume" : "Pause"}</button>}
              <button className="btn btn-ghost btn-sm" disabled={busy === w.id} onClick={() => patch(w.id, { active: false })}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
