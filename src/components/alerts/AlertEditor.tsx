"use client";
/**
 * Alerts as two sections, phones and stores; alerts = phones × stores. Signed in, every tick takes effect
 * at once (no Save button). Signed out, the picks wait on this screen and one email + code turns them on;
 * then a plan, if there is none. Used on the dashboard, the home page and the alert panels of other pages.
 */
import { useApiError } from "@/components/i18n/useApiError";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MODELS, STORE_INDEX, type ModelKey } from "@/lib/apple/catalog-us";
import { PAID_PLANS, PLANS, SPEED, type PaidPlanKey } from "@/lib/plans";
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
import { useLang, useT } from "@/components/i18n/LangProvider";
import { Rich } from "@/components/i18n/Rich";
import { fill, num, plural, unit } from "@/lib/i18n/format";
import { storeLabel } from "@/lib/i18n/places";
import type { Lang } from "@/lib/i18n/locales";
import type { CDict } from "@/lib/i18n/cdict/en";

/** The most any plan switches on: picks beyond it could never all send. */
const MOST = PLANS.max.limit;
const fitPlan = (n: number): PaidPlanKey | null => PAID_PLANS.find((k) => PLANS[k].limit >= n) ?? null;
const union = <T,>(a: T[], b: T[], key: (x: T) => string) => [...a, ...b.filter((x) => !a.some((y) => key(y) === key(x)))];
type Text = CDict["alerts"]["editor"];
const phonesText = (ps: Phone[], d: Text, lang: Lang) => (ps.length === 0 ? d.phonesNone : ps.length <= 2 ? ps.map((p) => phoneName(p, true, lang)).join(d.listSep) : `${phoneName(ps[0], true, lang)} +${num(lang, ps.length - 1)}`);
const storesText = (ns: string[], names: Map<string, string>, d: Text, lang: Lang) => {
  if (ns.length === 0) return d.storesNone;
  const list = ns.map((n) => { const s = STORE_INDEX.get(n); return names.get(n) ?? (s ? storeLabel(s, lang) : n); });
  return list.length <= 3 ? list.join(d.listSep) : `${list.slice(0, 2).join(d.listSep)} +${num(lang, list.length - 2)}`;
};
/** The speed promise (plans.SPEED_LINE), in the page's language. */
const speedLine = (d: Text, lang: Lang) => fill(d.speedLine, { fast: unit(lang, SPEED.fastSec, "s"), all: unit(lang, SPEED.checkSec, "s"), push: unit(lang, SPEED.alertSec, "s") });

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
  const d = useT().alerts.editor;
  const tErr = useApiError();
  const lang = useLang();
  const N = (n: number) => num(lang, n);
  const { isLoaded, isSignedIn } = useAuth();
  const live = useAlertSet(account?.set ?? { phones: [], stores: [] }, account?.plan ?? null);
  const [draft, setDraft] = useState<AlertSet>(() => startSet(catalog, start));
  const [loaded, setLoaded] = useState(Boolean(account)); // the account's set is on screen
  const [notice, setNotice] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<PaidPlanKey | null>(null);
  const checkoutInFlight = useRef(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Bumped on every refused tick: the inline notice sits above the lists, out of view once someone has
  // scrolled into the store list on a phone (paying members tapped the same row 7 times, 11-03), so a
  // refused tick also flashes the reason at the bottom of the screen for a few seconds.
  const [refused, setRefused] = useState(0);
  useEffect(() => {
    if (!refused) return;
    const t = setTimeout(() => setRefused(0), 9000);
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
      // Already past the plan (a downgrade, or extras saved before paying): "untick something first" was wrong for
      // them — unticking one and ticking another is still refused — so say how many they have and what it sends.
      setNotice(plan && plan.key !== "free" && plan.key !== "max"
        ? count > plan.limit
          ? fill(d.overPlanHave, { have: num(lang, count), plan: PLANS[plan.key].name, limit: num(lang, plan.limit) })
          : fill(d.overPlan, { n: num(lang, n), plan: PLANS[plan.key].name, limit: num(lang, plan.limit) })
        : fill(d.overMost, { n: num(lang, n), most: num(lang, MOST) }));
      setRefused((k) => k + 1);
      // Demand past the plan (or the 50 of Max): what decides whether a bigger plan is worth offering.
      track("alert_cap_refused", { plan: plan?.key ?? "none", wanted: n, limit: max });
      return;
    }
    setNotice(null);
    setRefused(0);
    if (mode === "account") live.apply(next); else setDraft(next);
  }, [max, count, plan, mode, live, d, lang]);
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
    if (!res.ok || !k.set) throw new Error((k.error ? tErr(k.error) : undefined) ?? d.saveFailed);
    live.reset(k.set, k.plan ?? j.plan);
    if (j.devices) setDevices(j.devices);
    setLoaded(true);
    setJustSaved(true);
    track("watch_saved", { phones: k.set.phones.length, stores: k.set.stores.length, rules: k.set.phones.length * k.set.stores.length });
  }, [draft, live, signInOnly, leaveSignIn, d, tErr]);

  const goCheckout = async (k: PaidPlanKey) => {
    if (checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    setCheckout(k); setCheckoutError(null);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan: k }) });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!r.ok || !j.url) throw new Error((j.error ? tErr(j.error) : undefined) ?? d.checkoutUnavailable);
      track("checkout_started", { plan: k });
      window.location.assign(j.url);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : String(e));
      checkoutInFlight.current = false;
      setCheckout(null);
    }
  };

  // The next plan up, named with what it holds and costs, for the refused-tap toast (none past Max or before a plan).
  const nextPlan = plan?.key === "plus" ? PLANS.pro : plan?.key === "pro" ? PLANS.max : null;
  const upgrade = nextPlan ? fill(d.upgradeTo, { plan: nextPlan.name, limit: num(lang, nextPlan.limit), price: num(lang, nextPlan.priceUsd) }) : null;
  const status = mode !== "account" ? null : live.state === "saving" ? <span className="text-ink-3"><span className="spinner" />{` ${d.saving}`}</span>
    : live.state === "saved" ? <span className="text-accent">{d.saved}</span> : live.state === "error" ? <span className="text-bad">{d.notSaved}</span> : null;
  const onCount = plan ? Math.min(count, plan.limit) : 0;
  const fit = fitPlan(count);
  const startModel = (start.model ?? set.phones[0]?.model) as ModelKey | undefined;
  const storeRoom = Math.max(0, Math.floor(max / Math.max(1, set.phones.length)) - set.stores.length);
  const names = useMemo(() => new Map([...(catalog.stores ?? []), ...(known ?? [])].map((x) => [x.storeNumber, x.label ?? storeLabel(x, lang)])), [catalog.stores, known, lang]);
  const summaryLine = useMemo(() => fill(d.sum, { phones: plural(lang, set.phones.length, d.phones), stores: plural(lang, set.stores.length, d.stores), alerts: plural(lang, count, d.alerts) }), [set, count, d, lang]);
  const speed = speedLine(d, lang);

  if (signInOnly && !signedIn) {
    return (
      <div>
        <h2 className="display text-2xl sm:text-3xl">{d.signIn}</h2>
        <p className="mt-2 mb-4 text-ink-2">{d.signInLead}</p>
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
              ? count === 0 ? d.pickBoth : fit ? fill(d.fits, { plan: PLANS[fit].name, limit: N(PLANS[fit].limit), price: `$${PLANS[fit].priceUsd}` }) : fill(d.overAny, { most: N(MOST) })
              : count === 0 ? (set.phones.length ? d.tickStore : set.stores.length ? d.tickPhone : d.tickEach)
              : plan?.key === "free" ? d.offUntilPlan
              : `${fill(d.onWith, { on: N(onCount), limit: N(plan?.limit ?? 0), plan: PLANS[plan?.key ?? "plus"].name })}${count > (plan?.limit ?? 0) ? fill(d.off, { n: N(count - (plan?.limit ?? 0)) }) : ""}`}
          </div>
        </div>
        <div className="text-sm" aria-live="polite">{status}</div>
      </div>
      {(notice || (mode === "account" && live.error)) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <span>{notice ?? live.error}</span>
          {notice && plan && plan.key !== "free" && plan.key !== "max" && (variant === "page"
            ? <button type="button" className="btn btn-primary btn-sm" onClick={() => openSection("plan")}>{d.seePlans}</button>
            : <a href="/account#plan" className="btn btn-primary btn-sm">{d.seePlans}</a>)}
        </div>
      )}

      {notice && refused > 0 && (
        // The refused tap is down in the lists, where the inline notice and its button are out of view: the toast
        // carries the way out too (FlowGlance 11-07: 70 refused taps in a day, people tapping 7–22 times, 2 upgrades).
        <div key={refused} role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-warn/40 bg-bg px-4 py-3 text-sm shadow-lg sm:bottom-6">
          <p>{notice}</p>
          {upgrade && (variant === "page"
            ? <button type="button" className="btn btn-primary btn-sm mt-2 w-full" onClick={() => { setRefused(0); openSection("plan"); }}>{upgrade}</button>
            : <a href="/account#plan" className="btn btn-primary btn-sm mt-2 w-full">{upgrade}</a>)}
        </div>
      )}

      <Section id={inner ? "alert-phones" : "phones"} inner={inner} title={d.phonesTitle} badge={<Count n={set.phones.length} />} summary={phonesText(set.phones, d, lang)} defaultOpen>
        <PhoneMatrix catalog={catalog} selected={set.phones} onToggle={onPhone} initialModel={startModel ?? MODELS[0].key} disabled={mode === "account" && !loaded} />
      </Section>
      <Section id={inner ? "alert-stores" : "stores"} inner={inner} title={d.storesTitle} badge={<Count n={set.stores.length} />} summary={storesText(set.stores, names, d, lang)} defaultOpen>
        <StoreChooser selected={set.stores} onToggle={onStore} onPretick={!start.store && (mode === "draft" || (set.phones.length === 0 && set.stores.length === 0)) ? pretick : undefined} room={storeRoom} preferState={start.state} preferCity={start.city}
          pool={catalog.stores} country={catalog.country} known={known} switchable={variant === "page"} />
      </Section>

      {mode === "draft" && count > 0 && (
        <div className={inner ? "pane-2 p-4" : "pane p-5 sm:p-6"}>
          <div className="font-semibold">{plural(lang, count, d.turnOn)}</div>
          <div className="mt-1 mb-3">
            <p className="text-sm text-ink-2">{fit ? fill(d.thenPlan, { plan: PLANS[fit].name, price: `$${PLANS[fit].priceUsd}` }) : fill(d.untickFew, { most: N(MOST) })}</p>
            {fit && <p className="mt-1 text-xs text-ink-3"><span aria-hidden>⚡ </span>{speed}</p>}
          </div>
          {fit && <EmailSignIn onSignedIn={afterSignIn} onVerifying={() => { signingIn.current = true; }} cta={plural(lang, count, d.continueWith)} />}
        </div>
      )}

      {mode === "account" && plan?.key === "free" && count > 0 && (
        <div className={inner ? "pane-2 p-4" : "pane p-5 sm:p-6"}>
          <div className="font-semibold">{justSaved ? plural(lang, count, d.savedN) : ""}{plural(lang, count, d.choosePlan)}</div>
          {variant === "page" ? (
            <button type="button" className="btn btn-primary btn-sm mt-3" onClick={() => openSection("plan")}>{d.seePlans}</button>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {PAID_PLANS.map((k) => (
                <button key={k} type="button" disabled={checkout != null} aria-busy={checkout === k} onClick={() => void goCheckout(k)} className={`rounded-2xl border p-3 text-start transition hover:border-accent disabled:cursor-wait ${k === fit ? "border-accent bg-accent/8" : "border-line-2"}`}>
                  <div className="flex items-baseline justify-between"><span className="font-semibold">{checkout === k && <span className="spinner me-1" aria-hidden />}{PLANS[k].name}</span><span className="text-sm"><b>${PLANS[k].priceUsd}</b>{d.perMo}</span></div>
                  <div className="mt-0.5 text-xs text-ink-3">{plural(lang, PLANS[k].limit, d.alerts)}{k === fit ? fill(d.fitsYour, { n: N(count) }) : ""}</div>
                </button>
              ))}
            </div>
          )}
          {checkoutError && <p role="alert" className="mt-3 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">{checkoutError}</p>}
          <p className="mt-2 text-xs text-ink-3"><span aria-hidden>⚡ </span>{speed}{d.afterSpeed}</p>
        </div>
      )}

      {mode === "account" && inner && plan && plan.key !== "free" && count > 0 && (
        <p className="px-1 text-sm text-ink-2">
          {justSaved ? d.alertsOn : ""}{devices?.active ? fill(d.goesTo, { device: devices.label ?? d.phone }) : <Rich text={d.getOnPhone} vars={{ link: <a href="/install" className="underline underline-offset-4">{d.getOnPhoneLink}</a> }} />}{" "}
          <a href="/account" className="text-ink-3 underline-offset-4 hover:underline">{d.myAlerts}</a>
        </p>
      )}
    </div>
  );
}
