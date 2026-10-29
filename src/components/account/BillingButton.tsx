"use client";
import { useState } from "react";
export function BillingButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => {
      setBusy(true);
      try { const r = await fetch("/api/stripe/portal", { method: "POST" }); const j = (await r.json()) as { url?: string }; if (j.url) window.location.assign(j.url); else setBusy(false); } catch { setBusy(false); }
    }}>{busy ? <span className="spinner" /> : null} Billing</button>
  );
}
