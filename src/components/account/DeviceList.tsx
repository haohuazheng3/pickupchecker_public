"use client";
import { useState } from "react";
import { platformLabel, type Platform } from "@/lib/push/platform";
import { timeAgo } from "@/components/stock/StatusBits";

export interface DeviceView { id: string; platform: string; standalone: boolean; createdAt: string; lastSentAt: string | null; disabledAt: string | null; lastError: string | null }

/** Every browser / Home Screen app that registered for notifications on this account. */
export function DeviceList({ devices }: { devices: DeviceView[] }) {
  const [items, setItems] = useState(devices);
  const [busy, setBusy] = useState<string | null>(null);
  const remove = async (id: string) => {
    setBusy(id);
    try {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      setItems((xs) => xs.filter((x) => x.id !== id));
    } finally { setBusy(null); }
  };
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-ink/3 text-sm">
      {items.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <span>
            <span className="font-medium">{platformLabel(d.platform as Platform)}</span>
            <span className="text-ink-3"> · {d.standalone ? "Home Screen app" : "browser"} · added {timeAgo(d.createdAt)}{d.lastSentAt ? ` · last alert ${timeAgo(d.lastSentAt)}` : ""}</span>
            {d.disabledAt && <span className="ml-2 rounded-full bg-bad/15 px-2 py-0.5 text-xs text-bad">stopped — turn notifications on again on that device</span>}
          </span>
          <button type="button" className="text-ink-3 hover:text-ink" disabled={busy === d.id} onClick={() => void remove(d.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
