"use client";
/**
 * "Alert me" — one surface, five stages:
 *   model → exact configuration (storage, colour) → tick stores → email + code (Clerk, custom UI) → done, or pick a plan
 * One rule = one store × one exact configuration; ticking several stores saves one rule per store when the
 * user presses "Set N alerts". Model and configuration picks advance on their own; the store step waits for
 * that button. Rules are saved as soon as the user is signed in and send once a Plus/Pro plan is active.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MODELS, COLOR_META, STORAGE_ORDER, STORE_INDEX, stateCodeOf, type ModelKey } from "@/lib/apple/catalog";
import { PLANS, SAVE_CAP, comparePlans, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";
import { StorePicker } from "./StorePicker";

type Step = "model" | "config" | "store" | "email" | "code" | "pay";
/** Progress segments: model · configuration · store · sign-in · done. */
const STAGE: Record<Step, number> = { model: 0, config: 1, store: 2, email: 3, code: 3, pay: 4 };

export interface WizardCatalog {
  configs: Record<ModelKey, { storage: string; color: string; price: number; partNumber: string }[]>;
  prices: Record<ModelKey, number>;
}

/** What a page can hand the wizard: a model, a configuration, a store, or the place to list stores for. */
export interface WizardStart {
  initialModel?: ModelKey;
  initialStorage?: string;
  initialColor?: string;
  initialStore?: string;
  /** Full state name / city name (from the state and city pages) — lists those stores first. */
  initialState?: string;
  initialCity?: string;
  startSignIn?: boolean;
  next?: string;
}

type PlanInfo = { key: PlanKey; limit: number; used: number };
/** One saved rule, as /api/watches returns it. */
type SavedRule = { id: string; storeNumber: string; covered: boolean; existing: boolean };

function clerkMessage(e: unknown): string {
  const err = e as { longMessage?: string; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err?.longMessage ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
}

export function Wizard({ catalog, initialModel, initialStorage, initialColor, initialStore, initialState, initialCity, startSignIn, next }: { catalog: WizardCatalog } & WizardStart) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const configOk = Boolean(initialModel && initialStorage && initialColor && catalog.configs[initialModel]?.some((c) => c.storage === initialStorage && c.color === initialColor));
  const [step, setStep] = useState<Step>(startSignIn ? "email" : !initialModel ? "model" : !configOk ? "config" : !initialStore ? "store" : "store");
  const [model, setModel] = useState<ModelKey | null>(initialModel ?? null);
  const [storage, setStorage] = useState<string | null>(configOk ? initialStorage! : null);
  const [color, setColor] = useState<string | null>(configOk ? initialColor! : null);
  const [storeNumbers, setStoreNumbers] = useState<string[]>(initialStore ? [initialStore] : []);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** What the last save returned: one entry per store, in the order they were ticked. */
  const [results, setResults] = useState<SavedRule[]>([]);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const coveredCount = results.filter((r) => r.covered).length;
  const allCovered = results.length > 0 && coveredCount === results.length;
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const modelMeta = MODELS.find((m) => m.key === model);
  const configs = useMemo(() => (model ? catalog.configs[model] : []), [catalog, model]);
  const storageOptions = useMemo(() => [...new Set(configs.map((c) => c.storage))].sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)), [configs]);
  const colorOptions = useMemo(() => [...new Set(configs.filter((c) => !storage || c.storage === storage).map((c) => c.color))], [configs, storage]);
  const picked = configs.find((c) => c.storage === storage && c.color === color) ?? null;
  const stores = useMemo(() => storeNumbers.map((n) => STORE_INDEX.get(n)).filter((s): s is NonNullable<typeof s> => Boolean(s)), [storeNumbers]);

  /** The rules being built: one configuration, one store each. Passed explicitly so a click saves what it just picked. */
  type Rule = { model: ModelKey | null; storage: string | null; color: string | null; storeNumbers: string[] };
  const saving = useRef(false);
  const saveWatch = useCallback(async (v: Rule): Promise<SavedRule[]> => {
    if (!v.model || !v.storage || !v.color || v.storeNumbers.length === 0) throw new Error("Pick the model, configuration and at least one store first");
    const res = await fetch("/api/watches", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: v.model, storage: v.storage, color: v.color, storeNumbers: v.storeNumbers }),
    });
    const j = (await res.json().catch(() => ({}))) as { rules?: SavedRule[]; plan?: PlanInfo; error?: string };
    if (!res.ok || !j.rules?.length) throw new Error(j.error ?? (res.ok ? "Could not save your alerts" : `Could not save your alerts (${res.status})`));
    setResults(j.rules); setPlanInfo(j.plan ?? null);
    // The confirmation describes exactly what was saved, even if a chip was tapped while the request flew.
    setModel(v.model); setStorage(v.storage); setColor(v.color); setStoreNumbers(j.rules.map((r) => r.storeNumber));
    track("watch_saved", { model: v.model, storage: v.storage, color: v.color, stores: j.rules.length, existing: j.rules.filter((r) => r.existing).length });
    return j.rules;
  }, []);

  // Signed-in users see how many slots their plan has left while they tick stores.
  const [slots, setSlots] = useState<PlanInfo | null>(null);
  useEffect(() => {
    if (!authLoaded || !isSignedIn || step !== "store") return;
    let gone = false;
    fetch("/api/watches").then((r) => (r.ok ? r.json() : null)).then((j: { plan?: PlanInfo } | null) => { if (!gone && j?.plan) setSlots(j.plan); }).catch(() => undefined);
    return () => { gone = true; };
  }, [authLoaded, isSignedIn, step]);

  const goPay = useCallback(async (plan: "plus" | "pro", id: string | null) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, watchId: id ?? undefined }) });
      const j = (await res.json()) as { url?: string; alreadySubscribed?: boolean; changed?: boolean; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track(j.alreadySubscribed || j.changed ? "plan_changed" : "checkout_started", { model, plan });
      window.location.assign(j.url);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
  }, [model]);

  // After the store is known: signed-in users skip straight to saving + paying; signed-out users go to
  // the email step. While Clerk is still loading we hold the rule (busy) instead of guessing.
  const [held, setHeld] = useState<Rule | null>(null);
  const continueFromStore = useCallback(async (v: Rule) => {
    setError(null);
    if (!v.model || !v.storage || !v.color) { setStep("config"); setError("Pick the storage and color first."); return; }
    if (v.storeNumbers.length === 0) return;
    if (!authLoaded) { setHeld(v); setBusy(true); return; }
    if (!isSignedIn) { setStep("email"); return; }
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await saveWatch(v); setStep("pay"); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { saving.current = false; setBusy(false); }
  }, [authLoaded, isSignedIn, saveWatch]);
  useEffect(() => {
    if (!authLoaded || !held) return;
    const v = held;
    const t = window.setTimeout(() => { setHeld(null); setBusy(false); void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [authLoaded, held, continueFromStore]);

  // A signed-in user who still landed on the email step (Clerk finished loading late): save instead.
  useEffect(() => {
    if (step !== "email" || !authLoaded || !isSignedIn || !model || !storage || !color || storeNumbers.length === 0) return;
    const v: Rule = { model, storage, color, storeNumbers };
    const t = window.setTimeout(() => { void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [step, authLoaded, isSignedIn, model, storage, color, storeNumbers, continueFromStore]);

  // The floating AlertBar hides while the wizard is on screen; tell it we exist, and honour #notify.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pc:wizard", { detail: true }));
    if (window.location.hash === "#notify") document.getElementById("notify")?.scrollIntoView({ block: "start" });
    return () => { window.dispatchEvent(new CustomEvent("pc:wizard", { detail: false })); };
  }, []);

  /** How many more rules this account can hold (the picker caps at it; the server re-checks). */
  const pickMax = slots ? Math.max(0, SAVE_CAP - slots.used) : SAVE_CAP;
  const ruleReady = Boolean(model && storage && color && storeNumbers.length > 0);
  /** Functional update: two quick taps never overwrite each other. */
  const toggleStore = useCallback((n: string) => {
    if (busy) return;
    setStoreNumbers((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < pickMax ? [...prev, n] : prev));
  }, [busy, pickMax]);

  /** The "Set N alerts" button: every ticked store becomes one rule. */
  const submitStores = () => {
    if (busy || saving.current || storeNumbers.length === 0) return;
    track("stores_submitted", { stores: storeNumbers.length });
    void continueFromStore({ model, storage, color, storeNumbers });
  };

  const sendCode = async () => {
    if (!signIn || !signUp) return;
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setError("Enter a valid email address"); return; }
    setBusy(true); setError(null);
    try {
      // One flow, no Clerk UI: try sign-in; an unknown email becomes a sign-up.
      const created = await signIn.create({ identifier: addr });
      if (!created.error) {
        const sent = await signIn.emailCode.sendCode();
        if (sent.error) throw sent.error;
        setAuthMode("signin");
      } else if (created.error.code === "form_identifier_not_found" || /not found|couldn't find|no account/i.test(created.error.longMessage ?? created.error.message)) {
        const su = await signUp.create({ emailAddress: addr });
        if (su.error) throw su.error;
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
        setAuthMode("signup");
      } else {
        throw created.error;
      }
      track("code_sent");
      setStep("code");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const verifyCode = async () => {
    if (!signIn || !signUp) return;
    const c = code.replace(/\D/g, "");
    if (c.length < 6) { setError("Enter the 6-digit code"); return; }
    setBusy(true); setError(null);
    try {
      if (authMode === "signin") {
        const r = await signIn.emailCode.verifyCode({ code: c });
        if (r.error) throw r.error;
        if (signIn.status !== "complete") throw new Error(`Verification incomplete (${signIn.status}) — try again`);
        const f = await signIn.finalize();
        if (f.error) throw f.error;
      } else {
        const r = await signUp.verifications.verifyEmailCode({ code: c });
        if (r.error) throw r.error;
        if (signUp.status !== "complete") throw new Error(`Verification incomplete (${signUp.status}) — try again`);
        const f = await signUp.finalize();
        if (f.error) throw f.error;
      }
      track("signed_in", { mode: authMode });
      if (!model || storeNumbers.length === 0) {
        // Sign-in only (header link, a protected page, the install guide): go where they were headed.
        window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
        return;
      }
      await saveWatch({ model, storage, color, storeNumbers });
      setStep("pay");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const storeText = useMemo(() => {
    const names = stores.map((s) => `Apple ${s.name}`);
    if (names.length === 0) return "";
    if (names.length === 1) return `${names[0]}, ${stores[0].city}, ${stateCodeOf(stores[0])}`;
    const shown = names.slice(0, 3);
    const more = names.length - shown.length;
    return more > 0 ? `${shown.join(", ")} and ${more} more` : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  }, [stores]);
  const summary = useMemo(() => {
    if (!modelMeta) return "";
    const cfg = storage && color ? `${storage} ${color}` : storage ? storage : "";
    const where = stores.length > 1 ? `${stores.length} stores` : storeText;
    return [modelMeta.name, cfg, where].filter(Boolean).join(" · ");
  }, [modelMeta, storage, color, stores.length, storeText]);
  const slotHint = useMemo(() => {
    if (!slots || storeNumbers.length === 0) return null;
    if (slots.key === "free") return "Saved now; they start sending once you pick a plan.";
    const room = Math.max(0, slots.limit - slots.used);
    if (storeNumbers.length > room) return room === 0 ? `Your ${PLANS[slots.key].name} plan is full (${slots.used} of ${slots.limit}): these save silently until you upgrade or delete some.` : `Only ${room} more will send on ${PLANS[slots.key].name}; the rest save silently until you upgrade.`;
    return `${slots.used + storeNumbers.length} of ${slots.limit} ${PLANS[slots.key].name} alerts after this.`;
  }, [slots, storeNumbers.length]);

  return (
    <div id="notify" className="pane relative min-w-0 scroll-mt-28 overflow-clip p-5 sm:p-7 sm:scroll-mt-32">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2" aria-label={`Step ${STAGE[step] + 1} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= STAGE[step] ? "bg-accent" : "bg-ink/8"}`} />
        ))}
      </div>

      {step === "model" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">Which iPhone?</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <button key={m.key} type="button" onClick={() => { setModel(m.key); setStorage(null); setColor(null); setStep("config"); track("model_selected", { model: m.key }); }}
                className={`pane-2 pane-hover min-w-0 p-4 text-left ${m.key === "duo" ? "border-accent/40" : ""}`}>
                <div className="text-lg font-semibold">{m.name}</div>
                <div className="mt-1 text-sm text-ink-3">{m.blurb} · from ${catalog.prices[m.key].toLocaleString()}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "config" && model && (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="display text-2xl sm:text-3xl">{modelMeta?.name}</h2>
            <button type="button" className="text-sm text-ink-3 hover:text-ink" disabled={busy} onClick={() => { if (!busy) setStep("model"); }}>Change model</button>
          </div>
          <p className="mt-1 text-sm text-ink-3">Pick the exact phone you want — one storage, one color.</p>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Storage</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {storageOptions.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={storage === v} onClick={() => { if (busy) return; setStorage(v); if (color && !configs.some((c) => c.storage === v && c.color === color)) setColor(null); track("storage_selected", { model, storage: v }); }}>{v}</button>
            ))}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={color === c} disabled={!storage} title={storage ? undefined : "Pick a storage first"}
                onClick={() => { if (busy) return; setColor(c); track("color_selected", { model, color: c }); if (storage) setStep("store"); }}>
                <span className="inline-block h-3 w-3 rounded-full border border-ink/15" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />{c}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-3">{picked ? `${modelMeta?.name} ${picked.storage} ${picked.color} · $${picked.price.toLocaleString()}` : storage ? "Now the color." : "Start with the storage."}</p>
          {error && <Err msg={error} />}
        </section>
      )}

      {step === "store" && model && (
        <section>
          <Back onClick={() => { if (!busy) setStep("config"); }} />
          <h2 className="display text-2xl sm:text-3xl">Which stores?</h2>
          <p className="mt-1 text-sm text-ink-3">{summary}</p>
          <p className="mt-1 text-sm text-ink-3">Tick every store you can get to — each one is its own alert — then press the button.</p>
          <div className="mt-5"><StorePicker value={storeNumbers} onToggle={toggleStore} max={pickMax} preferState={initialState} preferCity={initialCity} /></div>
          {/* Sticks to the bottom of the screen while the list is taller than it, so the way forward is always in view. */}
          <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap items-center gap-3 px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:-mx-7 sm:px-7" style={{ background: "var(--pane-solid)" }}>
            <button type="button" className="btn btn-primary btn-lg" disabled={busy || storeNumbers.length === 0} aria-busy={busy} onClick={submitStores}>
              {busy ? <><span className="spinner" /> Saving…</> : storeNumbers.length === 0 ? "Tick a store" : storeNumbers.length === 1 ? "Set 1 alert" : `Set ${storeNumbers.length} alerts`}
            </button>
            {slotHint && <span className="text-sm text-ink-3">{slotHint}</span>}
          </div>
          {error && <Err msg={error} />}
        </section>
      )}

      {step === "email" && (
        <section>
          {ruleReady ? <Back onClick={() => setStep("store")} /> : null}
          <h2 className="display text-2xl sm:text-3xl">{ruleReady ? (storeNumbers.length === 1 ? "Save this alert to your account" : `Save these ${storeNumbers.length} alerts to your account`) : "Sign in"}</h2>
          <p className="mt-2 text-ink-2">Your email is your account: we&apos;ll send a 6-digit code to confirm it&apos;s you. No password, ever.</p>
          {summary && <div className="pane-2 mt-4 px-4 py-3 text-sm text-ink-2">{summary}</div>}
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
            <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || !authLoaded} aria-busy={busy}>{busy ? <><span className="spinner" /> Sending</> : "Send code"}</button>
          </form>
          <div id="clerk-captcha" className="mt-3" />
          {error && <Err msg={error} />}
          <p className="mt-4 text-xs text-ink-3">By continuing you agree to the <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.</p>
        </section>
      )}

      {step === "code" && (
        <section>
          <Back onClick={() => { setStep("email"); setCode(""); }} />
          <h2 className="display text-2xl sm:text-3xl">Enter the code</h2>
          <p className="mt-2 text-ink-2">Sent to <span className="text-ink">{email}</span>. Check spam if it takes more than a minute.</p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void verifyCode(); }}>
            <input ref={codeRef} className="input input-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="••••••" value={code}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); }} disabled={busy} />
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || code.length < 6} aria-busy={busy}>{busy ? <><span className="spinner" /> Verifying</> : "Verify"}</button>
          </form>
          {error && <Err msg={error} />}
          <button type="button" className="mt-4 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => { setCode(""); void sendCode(); }} disabled={busy}>Resend code</button>
        </section>
      )}

      {step === "pay" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">{allCovered ? (results.length === 1 ? "Alert saved — it's on" : `${results.length} alerts saved — they're on`) : coveredCount > 0 ? `${coveredCount} of ${results.length} alerts are on` : planInfo?.key === "free" ? (results.length === 1 ? "Saved. Pick a plan to switch it on" : `${results.length} alerts saved. Pick a plan to switch them on`) : results.length === 1 ? "That's one more than your plan" : "That's more than your plan holds"}</h2>
          <p className="mt-2 text-ink-2">{summary}</p>
          {allCovered ? (
            <div className="mt-6">
              <p className="text-ink-2">We&apos;re watching {storeText || "your store"} for the {modelMeta?.name} {storage} {color}. You&apos;ll be notified the moment it is available for pickup{planInfo && planInfo.key !== "free" ? ` (${planInfo.used} of ${planInfo.limit} ${PLANS[planInfo.key].name} alerts in use)` : ""}.</p>
              <div className="mt-5 flex flex-wrap gap-2"><a href="/install" className="btn btn-primary">Get alerts on your phone</a><a href="/account" className="btn btn-ghost">Open my alerts</a><button type="button" className="btn btn-ghost" onClick={() => { setStep("model"); setStoreNumbers([]); setStorage(null); setColor(null); setResults([]); }}>Add another</button></div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-ink-2">{planInfo?.key === "free" ? `Alerts are part of Plus and Pro. ${results.length === 1 ? "Your rule is saved; pick a plan and it starts" : `Your ${results.length} rules are saved; pick a plan and they start`} sending right away.` : coveredCount > 0 ? `Your ${PLANS[planInfo?.key ?? "plus"].name} plan holds ${planInfo?.limit ?? 10} alerts: ${coveredCount} of these ${results.length} are sending and the other ${results.length - coveredCount} ${results.length - coveredCount === 1 ? "is" : "are"} saved but silent. ${planInfo?.key === "pro" ? "Delete rules from your account to free slots." : "Upgrade, or delete rules from your account."}` : `Your ${PLANS[planInfo?.key ?? "plus"].name} plan holds ${planInfo?.limit ?? 10} alerts and they are all in use. ${planInfo?.key === "pro" ? "Delete one from your account and this rule takes its slot." : "Upgrade, or delete one from your account."}`}</p>
              {planInfo?.key === "pro" && <div className="mt-4"><a href="/account" className="btn btn-primary">Open my alerts</a></div>}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(["plus", "pro"] as const).filter((k) => comparePlans(k, planInfo?.key ?? "free") > 0).map((k) => (
                  <div key={k} className="pane-2 flex min-w-0 flex-col p-5">
                    <div className="flex items-baseline justify-between"><span className="font-semibold">{PLANS[k].name}</span><span><span className="display text-3xl">${PLANS[k].priceUsd}</span><span className="text-ink-3"> / month</span></span></div>
                    <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-2">
                      <li>✓ {PLANS[k].limit} alerts — each one store and one exact configuration</li>
                      <li>✓ Phone notifications within seconds</li>
                      <li>✓ Renews monthly · cancel anytime</li>
                    </ul>
                    <button type="button" className={`btn mt-4 ${k === "plus" ? "btn-primary" : "btn-ghost"}`} disabled={busy} aria-busy={busy} onClick={() => goPay(k, results[0]?.id ?? null)}>
                      {busy ? <><span className="spinner" /> Opening checkout</> : `Choose ${PLANS[k].name}`}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-3">{results.length === 1 ? "Your rule stays" : "Your rules stay"} saved either way and {results.length === 1 ? "starts" : "start"} sending the moment a plan is active. Cancel anytime from your account.</p>
            </div>
          )}
          {error && <Err msg={error} />}
          <p className="mt-4 text-xs text-ink-3">Secure checkout by Stripe — card or Link. We never see your card.</p>
        </section>
      )}
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="mb-3 text-sm text-ink-3 hover:text-ink">← Back</button>;
}
function Err({ msg }: { msg: string }) {
  return <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">{msg}</p>;
}
