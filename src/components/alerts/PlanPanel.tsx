"use client";
/**
 * The plan, and changing it. No plan yet: pick one → Stripe Checkout (Stripe's page is the review). On a
 * plan: "Upgrade" or "Switch" opens a confirmation in place — what is charged today (or credited), the
 * monthly price from the next renewal, how many alerts it holds, the card — and only "Confirm" changes it.
 * "Cancel subscription" works the same way: it says until when the plan keeps working and what stops after,
 * and only the second button cancels (at the end of the paid period). Until then "Resume" takes it back.
 * Its link sits under the Plan header, so it shows with the section folded (CancelPlanLink), and every alert
 * email's "Cancel anytime" lands on the same step (/account/cancel → /account?cancel=1#plan).
 */
import { useApiError } from "@/components/i18n/useApiError";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PAID_PLANS, PLANS, SPEED, comparePlans, type PaidPlanKey, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";
import { forgetMe } from "@/lib/me";
import { useLang, useT } from "@/components/i18n/LangProvider";
import { Rich } from "@/components/i18n/Rich";
import { day as dayIn, fill, num, plural, unit } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";
import { openSection } from "./Section";

export interface PlanView { key: PlanKey; limit: number; used: number; renewsAt: string | null; cancelAtPeriodEnd: boolean; status: string | null; hasCustomer: boolean }
interface Preview { from: PaidPlanKey; to: PaidPlanKey; upgrade: boolean; nowCents: number; exact: boolean; monthlyCents: number; renewsAt: string | null; daysLeft: number; card: string | null; prorationDate: number }

/** Plans are billed in US dollars in every language: "$4.17". */
const money = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
/** "Nov 3" (UTC), in the language; no date: `fallback` ("the next renewal"). */
const day = (iso: string | null, lang: Lang, fallback: string) => (!iso ? fallback : lang === "en" ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }) : dayIn(lang, iso, "UTC"));

async function openUrl(path: string, unavailable: string, body?: unknown, tErr: (m: string) => string = (m) => m): Promise<string> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error((j.error ? tErr(j.error) : undefined) ?? unavailable);
  return j.url;
}

/** Review-then-confirm for switching an existing subscription. */
export function ChangeConfirm({ to, used, onDone, onCancel }: { to: PaidPlanKey; used: number; onDone: () => void; onCancel: () => void }) {
  const d = useT().alerts.plan;
  const tErr = useApiError();
  const lang = useLang();
  const priceFailed = d.priceFailed;
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
        if (!r.ok) throw new Error((j.error ? tErr(j.error) : undefined) ?? priceFailed);
        if (live) setPreview(j);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : String(e)); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [to, priceFailed, tErr]);
  const confirm = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: to, confirm: true, prorationDate: preview.prorationDate }) });
      const j = (await r.json().catch(() => ({}))) as { changed?: boolean; pending?: boolean; url?: string | null; error?: string };
      if (j.pending) { setFinishUrl(j.url ?? null); throw new Error((j.error ? tErr(j.error) : undefined) ?? d.bankConfirm); }
      if (!r.ok || !j.changed) throw new Error((j.error ? tErr(j.error) : undefined) ?? d.notChanged);
      track("plan_changed", { plan: to, from: preview.from });
      forgetMe();
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  const def = PLANS[to];
  const off = Math.max(0, used - def.limit);
  // "about $4.17" while the amount is an estimate.
  const est = (cents: number, cap = false) => (preview?.exact ? money(cents) : fill(cap ? d.aboutCap : d.about, { amount: money(cents) }));
  return (
    <div className="mt-3 rounded-2xl border border-line-2 p-4" role="group" aria-label={fill(d.changeTo, { plan: def.name })}>
      {loading ? (
        <div className="space-y-2" aria-busy><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-3/5" /></div>
      ) : preview ? (
        <>
          <div className="font-semibold">{fill(preview.upgrade ? d.upgradeTo : d.switchTo, { plan: def.name })}</div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-ink-3">{d.today}</dt>
            <dd>
              {preview.nowCents > 0
                ? <><b>{est(preview.nowCents)}</b> <span className="text-ink-3">{plural(lang, Math.round(preview.daysLeft), d.daysLeft)}</span></>
                : preview.nowCents < 0
                  ? <>{d.noCharge}<b>{est(preview.nowCents, true)}</b> <span className="text-ink-3">{fill(d.credit, { plan: PLANS[preview.from].name })}</span></>
                  : <><b>$0.00</b> <span className="text-ink-3">{preview.monthlyCents === 0 ? d.discount : ""}</span></>}
            </dd>
            <dt className="text-ink-3">{d.then}</dt>
            <dd><b>{fill(d.perMonth, { price: money(preview.monthlyCents) })}</b> <span className="text-ink-3">{fill(d.from, { date: day(preview.renewsAt, lang, d.nextRenewal) })}</span></dd>
            <dt className="text-ink-3">{d.alerts}</dt>
            <dd>{num(lang, def.limit)} <span className="text-ink-3">{fill(d.youHave, { n: num(lang, used) })}{off > 0 ? fill(d.newestOff, { n: num(lang, off) }) : ""}</span></dd>
            {preview.card && <><dt className="text-ink-3">{d.paidWith}</dt><dd>{preview.card}</dd></>}
          </dl>
          {!preview.exact && <p className="mt-2 text-xs text-ink-3">{d.exactNote}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
              {busy && <span className="spinner" />}{preview.upgrade ? (preview.nowCents > 0 ? fill(d.confirmPay, { amount: est(preview.nowCents) }) : d.confirmUpgrade) : d.confirmSwitch}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>{d.cancel}</button>
          </div>
        </>
      ) : null}
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      {finishUrl && <a href={finishUrl} className="btn btn-primary btn-sm mt-2">{d.finishOnStripe}</a>}
      {error && !preview && <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={onCancel}>{d.close}</button>}
    </div>
  );
}

/** Opens the Plan section on its cancel step (the header link, the email's "Cancel anytime"). */
export function startCancel() {
  openSection("plan");
  window.dispatchEvent(new CustomEvent("pc:plan-cancel"));
}

/** "Cancel subscription" under the Plan header: in view with the section folded, not only at its bottom. */
export function CancelPlanLink() {
  const d = useT().alerts.plan;
  return <button type="button" className="text-sm text-ink-2 underline decoration-ink-3/50 underline-offset-4 hover:text-ink" onClick={startCancel}>{d.cancelSub}</button>;
}

/** Second step of "Cancel subscription": what keeps working, until when, and what stops after. */
function CancelConfirm({ plan, onDone, onKeep }: { plan: PlanView; onDone: (endsAt: string | null) => void; onKeep: () => void }) {
  const t = useT().alerts;
  const tErr = useApiError();
  const d = t.plan;
  const lang = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const def = PLANS[plan.key];
  const until = day(plan.renewsAt, lang, d.nextRenewal);
  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/billing/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "cancel", confirm: true }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; endsAt?: string | null; error?: string };
      if (!r.ok || !j.ok) throw new Error((j.error ? tErr(j.error) : undefined) ?? d.notCancelled);
      track("subscription_canceled", { plan: plan.key });
      forgetMe();
      onDone(j.endsAt ?? plan.renewsAt);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  };
  return (
    <div className="mt-3 rounded-2xl border border-line-2 p-4" role="group" aria-label={d.cancelSub}>
      <div className="font-semibold">{fill(d.cancelQ, { plan: def.name })}</div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-3">{fill(d.until, { date: until })}</dt>
        <dd><Rich text={fill(d.keepsWorking, { plan: def.name })} vars={{ alerts: <b>{plural(lang, Math.min(plan.used, plan.limit), t.editor.alerts)}</b> }} /></dd>
        <dt className="text-ink-3">{d.after}</dt>
        <dd><Rich text={d.alertsStop} vars={{ notCharged: <b>{d.notCharged}</b> }} /></dd>
        <dt className="text-ink-3">{d.yourAlerts}</dt>
        <dd>{d.staySaved}</dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-sm" style={{ background: "var(--bad)", color: "#fff" }} disabled={busy} aria-busy={busy} onClick={() => void confirm()}>
          {busy && <span className="spinner" />}{d.cancelSub}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onKeep}>{d.keepPlan}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    </div>
  );
}

export function PlanPanel({ plan, recommend }: { plan: PlanView; recommend?: PaidPlanKey | null }) {
  const t = useT().alerts;
  const tErr = useApiError();
  const d = t.plan;
  const lang = useLang();
  const N = (n: number) => num(lang, n);
  const when = (iso: string | null) => day(iso, lang, d.nextRenewal);
  const router = useRouter();
  const [open, setOpen] = useState<PaidPlanKey | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const paid = plan.key !== "free";
  const def = PLANS[plan.key];
  const over = plan.used > plan.limit;
  const cancellable = paid && !plan.cancelAtPeriodEnd;
  useEffect(() => {
    const on = () => { if (!cancellable) return; setCancelling(true); setOpen(null); setDone(null); };
    window.addEventListener("pc:plan-cancel", on);
    return () => window.removeEventListener("pc:plan-cancel", on);
  }, [cancellable]);
  // Arriving from an alert email's "Cancel anytime": the cancel step, once (the query goes so a reload doesn't
  // reopen it). A tick later, so the section's own listener (a parent's effect runs after this one) is on.
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("cancel") !== "1") return;
    u.searchParams.delete("cancel");
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    window.setTimeout(startCancel, 0);
  }, []);
  const go = async (k: PaidPlanKey) => {
    setBusy(k); setError(null);
    try { const url = await openUrl("/api/stripe/checkout", d.unavailable, { plan: k }, tErr); track("checkout_started", { plan: k, from: plan.key }); window.location.assign(url); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  const resume = async () => {
    setBusy("resume"); setError(null); setDone(null);
    try {
      const r = await fetch("/api/billing/cancel", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "resume" }) });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) throw new Error((j.error ? tErr(j.error) : undefined) ?? d.notResumed);
      track("subscription_resumed", { plan: plan.key });
      forgetMe();
      setDone(fill(d.continues, { plan: def.name, date: when(plan.renewsAt), price: `$${def.priceUsd}` }));
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(null); }
  };
  const portal = async () => {
    setBusy("portal"); setError(null);
    try { window.location.assign(await openUrl("/api/stripe/portal", d.unavailable, undefined, tErr)); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(null); }
  };
  return (
    <div>
      {paid ? (
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-semibold">{def.name}</span>
            <span className="text-ink-2">{fill(d.perMonth, { price: `$${def.priceUsd}` })}</span>
            {plan.status === "past_due" && <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">{d.paymentFailed}</span>}
          </div>
          <p className="mt-1 text-sm text-ink-2">{fill(d.onOf, { on: N(Math.min(plan.used, plan.limit)), limit: N(plan.limit) })}{over ? fill(d.overOff, { n: N(plan.used - plan.limit) }) : ""}{plan.renewsAt ? fill(plan.cancelAtPeriodEnd ? d.ends : d.renews, { date: when(plan.renewsAt) }) : ""}</p>
          <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-ink/6"><div className={`h-full rounded-full ${over ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.min(100, Math.round((plan.used / Math.max(1, plan.limit)) * 100))}%` }} /></div>
          {plan.cancelAtPeriodEnd && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warn/10 px-3 py-2.5 text-sm">
              <span><Rich text={fill(d.cancelled, { plan: def.name })} vars={{ date: <b>{when(plan.renewsAt)}</b> }} /></span>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy != null} aria-busy={busy === "resume"} onClick={() => void resume()}>
                {busy === "resume" && <span className="spinner" />}{d.resume}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-2">{plan.used > 0 ? plural(lang, plan.used, d.savedOff) : d.startNow}{d.monthly}</p>
          <p className="mt-2 text-xs text-ink-3"><span aria-hidden>⚡ </span>{fill(t.editor.speedLine, { fast: unit(lang, SPEED.fastSec, "s"), all: unit(lang, SPEED.checkSec, "s"), push: unit(lang, SPEED.alertSec, "s") })}</p>
        </>
      )}
      {paid && cancelling && (
        <CancelConfirm plan={plan} onKeep={() => setCancelling(false)}
          onDone={(endsAt) => { setCancelling(false); setDone(fill(d.cancelledUntil, { plan: def.name, date: when(endsAt) })); router.refresh(); }} />
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
                  <span className="text-ink-2">{fill(d.row, { limit: N(p.limit), price: `$${p.priceUsd}` })}</span>
                  {k === recommend && !mine && <span className="ms-2 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-semibold text-accent">{fill(d.fitsYour, { n: N(plan.used) })}</span>}
                </div>
                {mine ? <span className="text-sm font-semibold text-accent">{d.yourPlan}</span>
                  : paid ? (
                    <button type="button" className={`btn btn-sm ${up ? "btn-primary" : "btn-ghost"}`} disabled={busy != null} aria-expanded={open === k} onClick={() => { setOpen(open === k ? null : k); setDone(null); setCancelling(false); }}>
                      {up ? d.upgrade : d.switch}
                    </button>
                  ) : (
                    <button type="button" className={`btn btn-sm ${k === (recommend ?? "plus") ? "btn-primary" : "btn-ghost"}`} disabled={busy != null} aria-busy={busy === k} onClick={() => void go(k)}>
                      {busy === k && <span className="spinner" />}{fill(d.choose, { plan: p.name })}
                    </button>
                  )}
              </div>
              {paid && open === k && <ChangeConfirm key={k} to={k} used={plan.used} onCancel={() => setOpen(null)} onDone={() => { setOpen(null); setDone(fill(d.nowOn, { plan: p.name, limit: N(p.limit) })); router.refresh(); }} />}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {plan.hasCustomer && <button type="button" className="underline-offset-4 hover:underline" style={{ color: "var(--ink-2)" }} disabled={busy != null} onClick={() => void portal()}>{busy === "portal" && <span className="spinner" />}{d.billing}</button>}
        <span className="text-xs text-ink-3">{paid ? d.paidNote : d.checkoutNote}</span>
      </div>
    </div>
  );
}
