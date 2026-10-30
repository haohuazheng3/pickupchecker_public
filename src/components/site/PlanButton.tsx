"use client";
/** Pricing-page CTA for a paid plan: starts checkout, or sends a signed-out visitor to sign in first. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PaidPlanKey } from "@/lib/plans";

export function PlanButton({ plan, label, primary }: { plan: PaidPlanKey; label: string; primary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      if (res.status === 401) { router.push(`/?signin=1&next=${encodeURIComponent("/pricing")}`); return; }
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      window.location.assign(j.url);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  return (
    <>
      <button type="button" className={`btn mt-6 w-full ${primary ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void go()}>{busy && <span className="spinner" />}{label}</button>
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </>
  );
}
