"use client";
/** Current plan, how many rules are in use, and the one or two buttons that change it. */
import { useState } from "react";
import { PAID_PLANS, PLANS, comparePlans, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";

export interface PlanView { key: PlanKey; limit: number; used: number; renewsAt: string | null; cancelAtPeriodEnd: boolean; status: string | null; hasCustomer: boolean }

export function PlanCard({ plan }: { plan: PlanView }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const go = async (target: PaidPlanKey) => {
    setBusy(target); setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: target }) });
      const j = (await res.json()) as { url?: string; changed?: boolean; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track(j.changed ? "plan_changed" : "checkout_started", { plan: target, from: plan.key });
      window.location.assign(j.url);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  const portal = async () => {
    setBusy("portal"); setErr(null);
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? "Billing portal unavailable");
      window.location.assign(j.url);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  const def = PLANS[plan.key];
  const pct = Math.min(100, Math.round((plan.used / Math.max(1, plan.limit)) * 100));
  const over = plan.used > plan.limit;
  // A fixed locale and zone: the server renders this too, and a reader's own locale ("2026/11/29") would not hydrate.
  const renews = plan.renewsAt ? new Date(plan.renewsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null;
  return (
    <section id="plan" className="pane p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">{plan.key === "free" ? "No plan yet" : `${def.name} plan`}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.key === "free" ? "bg-ink/6 text-ink-2" : "bg-accent/15 text-accent"}`}>{def.priceUsd ? `$${def.priceUsd}/month` : "alerts off"}</span>
            {plan.status === "past_due" && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">payment failed</span>}
          </div>
          <p className="mt-1 text-sm text-ink-2">
            {plan.key === "free"
              ? `${plan.used} alert${plan.used === 1 ? "" : "s"} saved · off until you pick a plan`
              : <>{plan.used} of {plan.limit} alerts{over ? ` · ${plan.used - plan.limit} over the limit, off` : ""}{renews ? (plan.cancelAtPeriodEnd ? ` · ends ${renews}` : ` · renews ${renews}`) : ""}</>}
          </p>
          {plan.key !== "free" && <div className="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-ink/6"><div className={`h-full rounded-full ${over ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          {PAID_PLANS.filter((k) => k !== plan.key).map((k) => {
            const up = comparePlans(k, plan.key) > 0;
            const first = PAID_PLANS.find((x) => comparePlans(x, plan.key) > 0) === k;
            return (
              <button key={k} className={`btn btn-sm ${up && first ? "btn-primary" : "btn-ghost"}`} disabled={busy != null} onClick={() => void go(k)}>
                {busy === k && <span className="spinner" />}{plan.key === "free" ? `${PLANS[k].name} · ${PLANS[k].limit} alerts · $${PLANS[k].priceUsd}/mo` : up ? `Upgrade · ${PLANS[k].name} · ${PLANS[k].limit} alerts · $${PLANS[k].priceUsd}/mo` : `${PLANS[k].name} · $${PLANS[k].priceUsd}/mo`}
              </button>
            );
          })}
          {plan.hasCustomer && <button className="btn btn-ghost btn-sm" disabled={busy != null} onClick={() => void portal()}>{busy === "portal" && <span className="spinner" />}Billing</button>}
        </div>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-bad">{err}</p>}
      <p className="mt-3 text-xs text-ink-3">Monthly, cancel anytime. Plan changes are prorated.</p>
    </section>
  );
}
