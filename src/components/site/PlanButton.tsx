"use client";
/**
 * Pricing-page CTA for a paid plan: starts checkout, sends a signed-out visitor to sign in first. A
 * subscriber's own plan is labelled; another plan opens the same review-and-confirm the dashboard uses
 * (today's charge or credit, the new monthly price) right under the button — nothing changes before Confirm.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { PLANS, comparePlans, isPaidPlan, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { fetchMe, forgetMe } from "@/lib/me";
import { track } from "@/lib/track";
import { ChangeConfirm } from "@/components/alerts/PlanPanel";

export function PlanButton({ plan, label, primary }: { plan: PaidPlanKey; label: string; primary?: boolean }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState<PlanKey | null>(null);
  const [used, setUsed] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let gone = false;
    void fetchMe().then((me) => { if (!gone && me?.plan) { setCurrent(me.plan.key); setUsed(me.plan.used); } });
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
  if (current === plan || done) {
    return <a href="/account#plan" className="btn btn-ghost mt-6 w-full">{done ? `✓ You're on ${PLANS[plan].name} · manage` : "Your plan · manage"}</a>;
  }
  const up = subscribed && comparePlans(plan, current!) > 0;
  const text = subscribed ? `${up ? "Upgrade" : "Switch"} to ${PLANS[plan].name}` : label;
  return (
    <>
      <button type="button" className={`btn mt-6 w-full ${(subscribed ? up : primary) ? "btn-primary" : "btn-ghost"}`} disabled={busy} aria-expanded={subscribed ? reviewing : undefined}
        onClick={() => { if (subscribed) setReviewing((v) => !v); else void go(); }}>{busy && <span className="spinner" />}{text}</button>
      {subscribed && reviewing && <ChangeConfirm to={plan} used={used} onCancel={() => setReviewing(false)} onDone={() => { setReviewing(false); setDone(true); forgetMe(); router.refresh(); }} />}
      {err && <p role="alert" className="mt-2 text-sm text-bad">{err}</p>}
    </>
  );
}
