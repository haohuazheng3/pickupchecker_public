"use client";
/**
 * Alerts as two sections, phones and stores; alerts = phones × stores. Signed in, every tick takes effect
 * at once (no Save button). Signed out, the picks wait on this screen and one email + code turns them on;
 * then a plan, if there is none. Used on the dashboard, the home page and the alert panels of other pages.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MODELS, STORE_INDEX, type ModelKey } from "@/lib/apple/catalog-us";
import { PAID_PLANS, PLANS, SPEED_LINE, type PaidPlanKey } from "@/lib/plans";
import { alertSetOf, phoneKey, togglePhone, toggleStore, type AlertSet, type Phone } from "@/lib/alertSet";
import { fetchMe, forgetMe } from "@/lib/me";
import { afterSignInPath } from "@/lib/signInRoute";
import type { AlertStart } from "@/lib/alertStart";
import { track } from "@/lib/track";
import { Count, Section, openSection } from "./Section";
import { PhoneMatrix, phoneName, type PhoneCatalog, type PickerStore } from "./PhoneMatrix";
import { StoreChooser } from "./StoreChooser";
import { EmailSignIn } from "./EmailSignIn";
import { useAlertSet, type PlanInfo } from "./useAlertSet";

/** The most any plan switches on: picks beyond it could never all send. */
const MOST = PLANS.max.limit;
const fitPlan = (n: number): PaidPlanKey | null => PAID_PLANS.find((k) => PLANS[k].limit >= n) ?? null;
const union = <T,>(a: T[], b: T[], key: (x: T) => string) => [...a, ...b.filter((x) => !a.some((y) => key(y) === key(x)))];
const phonesText = (ps: Phone[]) => (ps.length === 0 ? "None yet: tick a configuration" : ps.length <= 2 ? ps.map((p) => phoneName(p, true)).join(", ") : `${phoneName(ps[0], true)} +${ps.length - 1}`);
const storesText = (ns: string[], names: Map<string, string>) => {
  if (ns.length === 0) return "None yet: tick the stores you can get to";
  const list = ns.map((n) => names.get(n) ?? STORE_INDEX.get(n)?.name ?? n);
  return list.length <= 3 ? list.join(", ") : `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
};

function startSet(catalog: PhoneCatalog, s: AlertStart = {}): AlertSet {
  const ok = s.model && s.storage && s.color && catalog.configs[s.model]?.some((c) => c.storage === s.storage && c.color === s.color);
  const known = catalog.stores ? catalog.stores.some((x) => x.storeNumber === s.store) : Boolean(s.store && STORE_INDEX.has(s.store));
  return { phones: ok ? [{ model: s.model!, storage: s.storage!, color: s.color! }] : [], stores: s.store && known ? [s.store] : [] };
}

export function AlertEditor({ catalog, account, start = {}, variant = "panel", signInOnly = false, next, known }: {
  catalog: PhoneCatalog;
  /** Chosen stores of any country (the dashboard: an account may watch stores in several countries). */
  known?: PickerStore[];
  /** The dashboard hands the account's set and plan in; elsewhere a signed-in visitor's set is fetched. */
  account?: { set: AlertSet; plan: PlanInfo };
  start?: AlertStart; variant?: "page" | "panel"; signInOnly?: boolean; next?: string;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const live = useAlertSet(account?.set ?? { phones: [], stores: [] }, account?.plan ?? null);
  const [draft, setDraft] = useState<AlertSet>(() => startSet(catalog, start));
  const [loaded, setLoaded] = useState(Boolean(account)); // the account's set is on screen
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped on every refused tick: the inline notice sits above the lists, out of view once someone has
  // scrolled into the store list on a phone (paying members tapped the same row 7 times, 11-03), so a
  // refused tick also flashes the reason at the bottom of the screen for a few seconds.
  const [refused, setRefused] = useState(0);
  useEffect(() => {
    if (!refused) return;
    const t = setTimeout(() => setRefused(0), 6000);
    return () => clearTimeout(t);
  }, [refused]);
  const [justSaved, setJustSaved] = useState(false);
  const [devices, setDevices] = useState<{ active: number; label: string | null } | null>(null);
  const signingIn = useRef(false);
  const inner = variant === "panel";
  const signedIn = Boolean(account) || (isLoaded && isSignedIn);
  const mode: "account" | "draft" = signedIn && loaded ? "account" : "draft";

  // A signed-in visitor outside the dashboard: their own set, from the server.
  const loadAccount = useCallback(async () => {
    const r = await fetch("/api/watches", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = (await r.json()) as { watches: Parameters<typeof alertSetOf>[0]; plan: PlanInfo; devices?: { active: number; label: string | null } };
    if (signingIn.current) return; // a sign-in here is saving the picks; its result wins
    const have = alertSetOf(j.watches);
    live.reset(have, j.plan);
    // An account with nothing chosen yet starts from this page's picks (its pre-fill, the nearest stores) instead
    // of an empty screen; an account with alerts keeps exactly what it has.
    if (!have.phones.length && !have.stores.length && (draft.phones.length || draft.stores.length)) live.apply(draft);
    if (j.devices) setDevices(j.devices);
    setLoaded(true);
  }, [live, draft]);
  useEffect(() => {
    if (account || !isLoaded || !isSignedIn || loaded || signingIn.current || signInOnly) return;
    const t = window.setTimeout(() => void loadAccount(), 0);
    return () => window.clearTimeout(t);
  }, [account, isLoaded, isSignedIn, loaded, signInOnly, loadAccount]);
  // Leaving the sign-in page (?signin=1): someone who has paid goes to their account, someone who never has to
  // the alert setup that ends in a plan (lib/signInRoute.ts); another `next` page is kept.
  const leaving = useRef(false);
  const leaveSignIn = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    forgetMe();
    const me = await fetchMe();
    const paid = me ? Boolean(me.everPaid || (me.plan && me.plan.key !== "free")) : true; // unknown: the account page, as before
    window.location.assign(afterSignInPath({ next, home: window.location.pathname, paid }));
  }, [next]);
  // The sign-in link for someone already signed in: straight on.
  useEffect(() => {
    if (!signInOnly || !isLoaded || !isSignedIn || signingIn.current) return;
    void leaveSignIn();
  }, [signInOnly, isLoaded, isSignedIn, leaveSignIn]);
  useEffect(() => {
    if (!account) return;
    let on = true;
    void fetchMe().then((m) => { if (on && m?.devices) setDevices(m.devices); });
    return () => { on = false; };
  }, [account]);

  const set = mode === "account" ? live.set : draft;
  const plan = mode === "account" ? live.plan : null;
  const max = plan && plan.key !== "free" ? plan.limit : MOST;
  const count = set.phones.length * set.stores.length;

  /** Apply a change if it fits; otherwise say why (and how to get room). */
  const change = useCallback((next: AlertSet) => {
    const n = next.phones.length * next.stores.length;
    if (n > max && n > count) {
      setNotice(plan && plan.key !== "free" && plan.key !== "max"
        ? `That makes ${n} alerts; ${PLANS[plan.key].name} holds ${plan.limit}. Upgrade, or untick something first.`
        : `That makes ${n} alerts; the largest plan holds ${MOST}. Untick something first.`);
      setRefused((k) => k + 1);
      return;
    }
    setNotice(null);
    setRefused(0);
    if (mode === "account") live.apply(next); else setDraft(next);
  }, [max, count, plan, mode, live]);
  const onPhone = (p: Phone) => change({ ...set, phones: togglePhone(set.phones, p) });
  const onStore = (n: string) => change({ ...set, stores: toggleStore(set.stores, n) });
  const applyLive = live.apply;
  const liveSet = live.set;
  const pretick = useCallback((nearest: string[]) => {
    const take = (phones: number) => nearest.slice(0, Math.max(1, Math.floor(MOST / Math.max(1, phones))));
    if (mode === "draft") { setDraft((d) => (d.stores.length ? d : { ...d, stores: take(d.phones.length) })); return; }
    // An account with no alert yet gets the same head start; no rule exists until a phone is ticked too.
    if (!liveSet.phones.length && !liveSet.stores.length) applyLive({ phones: [], stores: take(0) });
  }, [mode, applyLive, liveSet]);

  // Signed out → in: what was picked here joins whatever the account already has, in one save.
  const afterSignIn = useCallback(async () => {
    signingIn.current = true;
    if (signInOnly) { await leaveSignIn(); return; }
    const r = await fetch("/api/watches", { cache: "no-store" });
    const j = (await r.json()) as { watches: Parameters<typeof alertSetOf>[0]; plan: PlanInfo; devices?: { active: number; label: string | null } };
    const have = alertSetOf(j.watches ?? []);
    let merged: AlertSet = { phones: union(have.phones, draft.phones, phoneKey), stores: union(have.stores, draft.stores, (x) => x) };
    if (merged.phones.length * merged.stores.length > Math.max(MOST, have.phones.length * have.stores.length)) merged = have.phones.length ? have : draft;
    const res = await fetch("/api/watches", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(merged) });
    const k = (await res.json().catch(() => ({}))) as { set?: AlertSet; plan?: PlanInfo; error?: string };
    if (!res.ok || !k.set) throw new Error(k.error ?? "Couldn't save your alerts");
    live.reset(k.set, k.plan ?? j.plan);
    if (j.devices) setDevices(j.devices);
    setLoaded(true);
    setJustSaved(true);
    track("watch_saved", { phones: k.set.phones.length, stores: k.set.stores.length, rules: k.set.phones.length * k.set.stores.length });
  }, [draft, live, signInOnly, leaveSignIn]);

  const goCheckout = async (k: PaidPlanKey) => {
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: k }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track("checkout_started", { plan: k });
      window.location.assign(j.url);
    } catch (e) { setNotice(e instanceof Error ? e.message : String(e)); }
  };

  const status = mode !== "account" ? null : live.state === "saving" ? <span className="text-ink-3"><span className="spinner" /> Saving</span>
    : live.state === "saved" ? <span className="text-accent">✓ Saved</span> : live.state === "error" ? <span className="text-bad">Not saved</span> : null;
  const onCount = plan ? Math.min(count, plan.limit) : 0;
  const fit = fitPlan(count);
  const startModel = (start.model ?? set.phones[0]?.model) as ModelKey | undefined;
  const storeRoom = Math.max(0, Math.floor(max / Math.max(1, set.phones.length)) - set.stores.length);
  const names = useMemo(() => new Map([...(catalog.stores ?? []), ...(known ?? [])].map((x) => [x.storeNumber, x.name])), [catalog.stores, known]);
  const summaryLine = useMemo(() => `${set.phones.length} phone${set.phones.length === 1 ? "" : "s"} × ${set.stores.length} store${set.stores.length === 1 ? "" : "s"} = ${count} alert${count === 1 ? "" : "s"}`, [set, count]);

  if (signInOnly && !signedIn) {
    return (
      <div>
        <h2 className="display text-2xl sm:text-3xl">Sign in</h2>
        <p className="mt-2 mb-4 text-ink-2">Your email is the account. We send a 6-digit code, no password. New here? The same code sets up your account, then you pick your alerts.</p>
        <EmailSignIn onSignedIn={afterSignIn} onVerifying={() => { signingIn.current = true; }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* The sum, always in view: phones × stores, and how many of them send. */}
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 ${inner ? "" : "pane px-5 py-4 sm:px-6"}`}>
        <div className="min-w-0">
          <div className="font-semibold tabular-nums">{summaryLine}</div>
          <div className="text-sm text-ink-3">
            {mode === "draft"
              ? count === 0 ? "Pick at least one phone and one store." : fit ? `Fits ${PLANS[fit].name}: ${PLANS[fit].limit} alerts for $${PLANS[fit].priceUsd}/month.` : `More than any plan holds (${MOST}).`
              : count === 0 ? (set.phones.length ? "Now tick a store: each phone is watched at each store you tick." : set.stores.length ? "Now tick a phone: it is watched at each store you ticked." : "Tick a phone and a store: each phone is watched at each store.")
              : plan?.key === "free" ? "Saved, but off until you choose a plan."
              : `${onCount} of ${plan?.limit ?? 0} on with ${PLANS[plan?.key ?? "plus"].name}${count > (plan?.limit ?? 0) ? ` · ${count - (plan?.limit ?? 0)} off` : ""}`}
          </div>
        </div>
        <div className="text-sm" aria-live="polite">{status}</div>
      </div>
      {(notice || (mode === "account" && live.error)) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <span>{notice ?? live.error}</span>
          {notice && plan && plan.key !== "free" && plan.key !== "max" && (variant === "page"
            ? <button type="button" className="btn btn-primary btn-sm" onClick={() => openSection("plan")}>See plans</button>
            : <a href="/account#plan" className="btn btn-primary btn-sm">See plans</a>)}
        </div>
      )}

      {notice && refused > 0 && (
        <div key={refused} role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-warn/40 bg-bg px-4 py-3 text-sm shadow-lg sm:bottom-6">{notice}</div>
      )}

      <Section id={inner ? "alert-phones" : "phones"} inner={inner} title="Phones" badge={<Count n={set.phones.length} />} summary={phonesText(set.phones)} defaultOpen>
        <PhoneMatrix catalog={catalog} selected={set.phones} onToggle={onPhone} initialModel={startModel ?? MODELS[0].key} disabled={mode === "account" && !loaded} />
      </Section>
      <Section id={inner ? "alert-stores" : "stores"} inner={inner} title="Stores" badge={<Count n={set.stores.length} />} summary={storesText(set.stores, names)} defaultOpen>
        <StoreChooser selected={set.stores} onToggle={onStore} onPretick={!start.store && (mode === "draft" || (set.phones.length === 0 && set.stores.length === 0)) ? pretick : undefined} room={storeRoom} preferState={start.state} preferCity={start.city}
          pool={catalog.stores} country={catalog.country} known={known} switchable={variant === "page"} />
      </Section>

      {mode === "draft" && count > 0 && (
        <div className={inner ? "pane-2 p-4" : "pane p-5 sm:p-6"}>
          <div className="font-semibold">Turn on {count === 1 ? "this alert" : `these ${count} alerts`}</div>
          <div className="mt-1 mb-3">
            <p className="text-sm text-ink-2">{fit ? `Then pick a plan: ${PLANS[fit].name} covers them for $${PLANS[fit].priceUsd}/month, cancel anytime.` : "Untick a few first: the largest plan holds 50."}</p>
            {fit && <p className="mt-1 text-xs text-ink-3"><span aria-hidden>⚡ </span>{SPEED_LINE}</p>}
          </div>
          {fit && <EmailSignIn onSignedIn={afterSignIn} onVerifying={() => { signingIn.current = true; }} cta={`Continue with ${count} alert${count === 1 ? "" : "s"}`} />}
        </div>
      )}

      {mode === "account" && plan?.key === "free" && count > 0 && (
        <div className={inner ? "pane-2 p-4" : "pane p-5 sm:p-6"}>
          <div className="font-semibold">{justSaved ? `${count} alert${count === 1 ? "" : "s"} saved. ` : ""}Choose a plan to turn {count === 1 ? "it" : "them"} on</div>
          {variant === "page" ? (
            <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => openSection("plan")}>See plans</button>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PAID_PLANS.map((k) => (
                <button key={k} type="button" onClick={() => void goCheckout(k)} className={`rounded-2xl border p-3 text-left transition hover:border-accent ${k === fit ? "border-accent bg-accent/8" : "border-line-2"}`}>
                  <div className="flex items-baseline justify-between"><span className="font-semibold">{PLANS[k].name}</span><span className="text-sm"><b>${PLANS[k].priceUsd}</b>/mo</span></div>
                  <div className="mt-0.5 text-xs text-ink-3">{PLANS[k].limit} alerts{k === fit ? ` · fits your ${count}` : ""}</div>
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-ink-3"><span aria-hidden>⚡ </span>{SPEED_LINE} Monthly, cancel anytime. Stripe checkout, card or Link.</p>
        </div>
      )}

      {mode === "account" && inner && plan && plan.key !== "free" && count > 0 && (
        <p className="px-1 text-sm text-ink-2">
          {justSaved ? "✓ Alerts on. " : ""}{devices?.active ? `They go to your ${devices.label ?? "phone"}.` : <><a href="/install" className="underline underline-offset-4">Get them on your phone</a>.</>}{" "}
          <a href="/account" className="text-ink-3 underline-offset-4 hover:underline">My alerts</a>
        </p>
      )}
    </div>
  );
}
