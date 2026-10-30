"use client";
/**
 * The plan, and changing it. No plan yet: pick one → Stripe Checkout (Stripe's page is the review). On a
 * plan: "Upgrade" or "Switch" opens a confirmation in place — what is charged today (or credited), the
 * monthly price from the next renewal, how many alerts it holds, the card — and only "Confirm" changes it.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PAID_PLANS, PLANS, comparePlans, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";
import { forgetMe } from "@/lib/me";

export interface PlanView { key: PlanKey; limit: number; used: number; renewsAt: string | null; cancelAtPeriodEnd: boolean; status: string | null; hasCustomer: boolean }
interface Preview { from: PaidPlanKey; to: PaidPlanKey; upgrade: boolean; nowCents: number; exact: boolean; monthlyCents: number; renewsAt: string | null; daysLeft: number; card: string | null; prorationDate: number }

const money = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : "the next renewal");

async function openUrl(path: string, body?: unknown): Promise<string> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(j.error ?? "Unavailable right now");
  return j.url;
}

/** Review-then-confirm for switching an existing subscription. */
export function ChangeConfirm({ to, used, onDone, onCancel }: { to: PaidPlanKey; used: number; onDone: () => void; onCancel: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishUrl, setFinishUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const r = await fetch("/api/billing/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: to }) });
        const j = (await r.json().catch(() => ({}))) as Preview & { error?: string };
        if (!r.ok) throw new Error(j.error ?? "Couldn't price the change");
        if (live) setPreview(j);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [to]);
  const confirm = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: to, confirm: true, prorationDate: preview.prorationDate }) });
      const j = (await r.json().catch(() => ({}))) as { changed?: boolean; pending?: boolean; url?: string | null; error?: string };
      if (j.pending) { setFinishUrl(j.url ?? null); throw new Error(j.error ?? "Your bank needs to confirm the payment."); }
      if (!r.ok || !j.changed) throw new Error(j.error ?? "The plan didn't change. Try again in a minute.");
      track("plan_changed", { plan: to, from: preview.from });
      forgetMe();
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  const def = PLANS[to];
  const off = Math.max(0, used - def.limit);
  return (
    <div className="mt-3 rounded-2xl border border-line-2 p-4" role="group" aria-label={`Change to ${def.name}`}>
      {loading ? (
        <div className="space-y-2" aria-busy><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-3/5" /></div>
      ) : preview ? (
        <>
          <div className="font-semibold">{preview.upgrade ? `Upgrade to ${def.name}` : `Switch to ${def.name}`}</div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-3">Today</dt>
            <dd>
              {preview.nowCents > 0
                ? <><b>{preview.exact ? "" : "about "}{money(preview.nowCents)}</b> <span className="text-ink-3">for the {Math.round(preview.daysLeft)} days left of this period</span></>
                : preview.nowCents < 0
                  ? <>No charge. <b>{preview.exact ? "" : "About "}{money(preview.nowCents)}</b> <span className="text-ink-3">of unused {PLANS[preview.from].name} time becomes credit for your next bills</span></>
                  : <><b>$0.00</b> <span className="text-ink-3">{preview.monthlyCents === 0 ? "· your discount covers it" : ""}</span></>}
            </dd>
            <dt className="text-ink-3">Then</dt>
            <dd><b>{money(preview.monthlyCents)}/month</b> <span className="text-ink-3">from {day(preview.renewsAt)}</span></dd>
            <dt className="text-ink-3">Alerts</dt>
            <dd>{def.limit} <span className="text-ink-3">· you have {used}{off > 0 ? `; the newest ${off} turn off` : ""}</span></dd>
            {preview.card && <><dt className="text-ink-3">Paid with</dt><dd>{preview.card}</dd></>}
          </dl>
          {!preview.exact && <p className="mt-2 text-xs text-ink-3">Stripe charges the exact amount for the time left, which may differ by a few cents.</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
              {busy && <span className="spinner" />}{preview.upgrade ? (preview.nowCents > 0 ? `Confirm and pay ${preview.exact ? "" : "about "}${money(preview.nowCents)}` : "Confirm upgrade") : "Confirm switch"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>Cancel</button>
          </div>
        </>
      ) : null}
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {finishUrl && <a href={finishUrl} className="btn btn-primary btn-sm mt-2">Finish on Stripe</a>}
      {error && !preview && <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={onCancel}>Close</button>}
    </div>
  );
}

export function PlanPanel({ plan, recommend }: { plan: PlanView; recommend?: PaidPlanKey | null }) {
  const router = useRouter();
  const [open, setOpen] = useState<PaidPlanKey | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const paid = plan.key !== "free";
  const def = PLANS[plan.key];
  const over = plan.used > plan.limit;
  const go = async (k: PaidPlanKey) => {
    setBusy(k); setError(null);
    try { const url = await openUrl("/api/stripe/checkout", { plan: k }); track("checkout_started", { plan: k, from: plan.key }); window.location.assign(url); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  const portal = async () => {
    setBusy("portal"); setError(null);
    try { window.location.assign(await openUrl("/api/stripe/portal")); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  return (
    <div>
      {paid ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold">{def.name}</span>
            <span className="text-ink-2">${def.priceUsd}/month</span>
            {plan.status === "past_due" && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">payment failed</span>}
          </div>
          <p className="mt-1 text-sm text-ink-2">{Math.min(plan.used, plan.limit)} of {plan.limit} alerts on{over ? ` · ${plan.used - plan.limit} over the limit, off` : ""}{plan.renewsAt ? (plan.cancelAtPeriodEnd ? ` · ends ${day(plan.renewsAt)}` : ` · renews ${day(plan.renewsAt)}`) : ""}</p>
          <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-ink/6"><div className={`h-full rounded-full ${over ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.round((plan.used / Math.max(1, plan.limit)) * 100))}%` }} /></div>
        </div>
      ) : (
        <p className="text-sm text-ink-2">{plan.used > 0 ? `Your ${plan.used} alert${plan.used === 1 ? " is" : "s are"} saved but off until a plan is active.` : "Alerts start the moment a plan is active."} Monthly, cancel anytime.</p>
      )}
      {done && <p role="status" className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-ink">✓ {done}</p>}

      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
        {PAID_PLANS.map((k) => {
          const p = PLANS[k];
          const mine = k === plan.key;
          const up = comparePlans(k, plan.key) > 0;
          return (
            <li key={k} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-ink-2"> · {p.limit} alerts · ${p.priceUsd}/month</span>
                  {k === recommend && !mine && <span className="ml-2 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">fits your {plan.used}</span>}
                </div>
                {mine ? <span className="text-sm font-semibold text-accent">Your plan</span>
                  : paid ? (
                    <button type="button" className={`btn btn-sm ${up ? "btn-primary" : "btn-ghost"}`} disabled={busy != null} aria-expanded={open === k} onClick={() => { setOpen(open === k ? null : k); setDone(null); }}>
                      {up ? "Upgrade" : "Switch"}
                    </button>
                  ) : (
                    <button type="button" className={`btn btn-sm ${k === (recommend ?? "plus") ? "btn-primary" : "btn-ghost"}`} disabled={busy != null} aria-busy={busy === k} onClick={() => void go(k)}>
                      {busy === k && <span className="spinner" />}Choose {p.name}
                    </button>
                  )}
              </div>
              {paid && open === k && <ChangeConfirm key={k} to={k} used={plan.used} onCancel={() => setOpen(null)} onDone={() => { setOpen(null); setDone(`You're on ${p.name} now: ${p.limit} alerts.`); router.refresh(); }} />}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {plan.hasCustomer && <button type="button" className="underline-offset-4 hover:underline" style={{ color: "var(--ink-2)" }} disabled={busy != null} onClick={() => void portal()}>{busy === "portal" && <span className="spinner" />}Billing, invoices and cancelling</button>}
        <span className="text-xs text-ink-3">{paid ? "Upgrades are charged for the days left; switching down turns the rest into credit." : "Stripe checkout, card or Link."}</span>
      </div>
    </div>
  );
}
