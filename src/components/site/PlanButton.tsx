"use client";
/**
 * Pricing-page CTA for a paid plan: starts checkout, sends a signed-out visitor to sign in first, and for a
 * subscriber names what the tap does — their own plan is labelled, the others switch in place (prorated).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { PLANS, comparePlans, isPaidPlan, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { fetchMe, forgetMe } from "@/lib/me";
import { track } from "@/lib/track";

export function PlanButton({ plan, label, primary }: { plan: PaidPlanKey; label: string; primary?: boolean }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<PlanKey | null>(null);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let gone = false;
    void fetchMe().then((me) => { if (!gone && me?.plan) setCurrent(me.plan.key); });
    return () => { gone = true; };
  }, [isLoaded, isSignedIn]);
  const subscribed = current != null && isPaidPlan(current);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
      if (res.status === 401) { router.push(`/?signin=1&next=${encodeURIComponent("/pricing")}`); return; }
      const j = (await res.json()) as { url?: string; changed?: boolean; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track(j.changed ? "plan_changed" : "checkout_started", { plan });
      forgetMe();
      window.location.assign(j.url);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  if (current === plan) {
    return <a href="/account" className="btn btn-ghost mt-6 w-full">Your plan · manage</a>;
  }
  const up = subscribed && comparePlans(plan, current!) > 0;
  const text = subscribed ? `${up ? "Upgrade" : "Switch"} to ${PLANS[plan].name}` : label;
  return (
    <>
      <button type="button" className={`btn mt-6 w-full ${(subscribed ? up : primary) ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => void go()}>{busy && <span className="spinner" />}{text}</button>
      {subscribed && <p className="mt-2 text-center text-xs text-ink-3">Changes your plan now, prorated.</p>}
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </>
  );
}
