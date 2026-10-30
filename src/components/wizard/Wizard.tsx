"use client";
/**
 * "Alert me" — one surface, five stages:
 *   model → exact configuration (storage, colour) → one store → email + code (Clerk, custom UI) → done, or pick a plan
 * One rule = one store × one exact configuration. Every pick advances on its own (no Continue buttons
 * between picks); the rule is saved as soon as the user is signed in and sends once a Plus/Pro plan is active.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MODELS, COLOR_META, STORAGE_ORDER, STORE_INDEX, stateCodeOf, type ModelKey } from "@/lib/apple/catalog";
import { PLANS, comparePlans, type PlanKey } from "@/lib/plans";
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
  const [storeNumber, setStoreNumber] = useState<string | null>(initialStore ?? null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [covered, setCovered] = useState(false);
  const [planInfo, setPlanInfo] = useState<{ key: PlanKey; limit: number; used: number } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const modelMeta = MODELS.find((m) => m.key === model);
  const configs = useMemo(() => (model ? catalog.configs[model] : []), [catalog, model]);
  const storageOptions = useMemo(() => [...new Set(configs.map((c) => c.storage))].sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)), [configs]);
  const colorOptions = useMemo(() => [...new Set(configs.filter((c) => !storage || c.storage === storage).map((c) => c.color))], [configs, storage]);
  const picked = configs.find((c) => c.storage === storage && c.color === color) ?? null;
  const store = storeNumber ? STORE_INDEX.get(storeNumber) : undefined;

  /** The exact rule being built. Passed explicitly so a click can save what it just picked (state updates land later). */
  type Rule = { model: ModelKey | null; storage: string | null; color: string | null; storeNumber: string | null };
  const saving = useRef(false);
  const saveWatch = useCallback(async (v: Rule): Promise<string> => {
    if (!v.model || !v.storage || !v.color || !v.storeNumber) throw new Error("Pick the model, configuration and store first");
    const res = await fetch("/api/watches", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: v.model, storage: v.storage, color: v.color, storeNumber: v.storeNumber }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; covered?: boolean; existing?: boolean; plan?: { key: PlanKey; limit: number; used: number }; error?: string };
    if (!res.ok || !j.id) throw new Error(j.error ?? (res.ok ? "Could not save your alert" : `Could not save your alert (${res.status})`));
    setWatchId(j.id); setCovered(Boolean(j.covered)); setPlanInfo(j.plan ?? null);
    track(j.existing ? "watch_existing" : "watch_saved", { model: v.model, storage: v.storage, color: v.color, store: v.storeNumber });
    return j.id;
  }, []);

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
    if (!v.model || !v.storage || !v.color || !v.storeNumber) return;
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

  // Everything handed in by the page (e.g. a store page's configuration table): continue without a tap.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !authLoaded || step !== "store" || !storeNumber || !picked) return;
    autoRan.current = true;
    const v: Rule = { model, storage, color, storeNumber };
    const t = window.setTimeout(() => { void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [authLoaded, step, storeNumber, picked, model, storage, color, continueFromStore]);

  // A signed-in user who still landed on the email step (Clerk finished loading late): save instead.
  useEffect(() => {
    if (step !== "email" || !authLoaded || !isSignedIn || !model || !storage || !color || !storeNumber) return;
    const v: Rule = { model, storage, color, storeNumber };
    const t = window.setTimeout(() => { void continueFromStore(v); }, 0);
    return () => window.clearTimeout(t);
  }, [step, authLoaded, isSignedIn, model, storage, color, storeNumber, continueFromStore]);

  // The floating AlertBar hides while the wizard is on screen; tell it we exist, and honour #notify.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pc:wizard", { detail: true }));
    if (window.location.hash === "#notify") document.getElementById("notify")?.scrollIntoView({ block: "start" });
    return () => { window.dispatchEvent(new CustomEvent("pc:wizard", { detail: false })); };
  }, []);

  const chooseStore = (n: string) => {
    if (busy || saving.current) return;
    setStoreNumber(n); track("store_selected", { store: n });
    void continueFromStore({ model, storage, color, storeNumber: n });
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
      if (!model || !storeNumber) {
        // Sign-in only (header link, a protected page, the install guide): go where they were headed.
        window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
        return;
      }
      await saveWatch({ model, storage, color, storeNumber });
      setStep("pay");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const summary = useMemo(() => {
    if (!modelMeta) return "";
    const cfg = storage && color ? `${storage} ${color}` : storage ? storage : "";
    const where = store ? `Apple ${store.name}, ${store.city}, ${stateCodeOf(store)}` : "";
    return [modelMeta.name, cfg, where].filter(Boolean).join(" · ");
  }, [modelMeta, storage, color, store]);

  return (
    <div id="notify" className="pane relative min-w-0 scroll-mt-28 overflow-hidden p-5 sm:p-7 sm:scroll-mt-32">
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
            <button type="button" className="text-sm text-ink-3 hover:text-ink" onClick={() => setStep("model")}>Change model</button>
          </div>
          <p className="mt-1 text-sm text-ink-3">Pick the exact phone you want — one storage, one color.</p>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Storage</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {storageOptions.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={storage === v} onClick={() => { setStorage(v); if (color && !configs.some((c) => c.storage === v && c.color === color)) setColor(null); track("storage_selected", { model, storage: v }); }}>{v}</button>
            ))}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={color === c} disabled={!storage} title={storage ? undefined : "Pick a storage first"}
                onClick={() => { if (busy) return; setColor(c); track("color_selected", { model, color: c }); if (storage) { if (storeNumber) void continueFromStore({ model, storage, color: c, storeNumber }); else setStep("store"); } }}>
                <span className="inline-block h-3 w-3 rounded-full border border-ink/15" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />{c}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-3">{picked ? `${modelMeta?.name} ${picked.storage} ${picked.color} · $${picked.price.toLocaleString()}` : storage ? "Now the color." : "Start with the storage."}</p>
          {busy && <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-3"><span className="spinner" /> Saving…</p>}
          {error && <Err msg={error} />}
        </section>
      )}

      {step === "store" && model && (
        <section>
          <Back onClick={() => setStep("config")} />
          <h2 className="display text-2xl sm:text-3xl">Which store?</h2>
          <p className="mt-1 text-sm text-ink-3">{summary}</p>
          <div className="mt-5"><StorePicker value={storeNumber} onChange={chooseStore} preferState={initialState} preferCity={initialCity} /></div>
          {error && <Err msg={error} />}
          {busy && <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-3"><span className="spinner" /> Saving…</p>}
        </section>
      )}

      {step === "email" && (
        <section>
          {model ? <Back onClick={() => setStep("store")} /> : null}
          <h2 className="display text-2xl sm:text-3xl">{model ? "Save this alert to your account" : "Sign in"}</h2>
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
          <h2 className="display text-2xl sm:text-3xl">{covered ? "Alert saved — it's on" : planInfo?.key === "free" ? "Saved. Pick a plan to switch it on" : "That's one more than your plan"}</h2>
          <p className="mt-2 text-ink-2">{summary}</p>
          {covered ? (
            <div className="mt-6">
              <p className="text-ink-2">We&apos;re watching {store ? `Apple ${store.name}` : "your store"} for the {modelMeta?.name} {storage} {color}. You&apos;ll be notified the moment it is available for pickup{planInfo && planInfo.key !== "free" ? ` (${planInfo.used} of ${planInfo.limit} ${PLANS[planInfo.key].name} alerts in use)` : ""}.</p>
              <div className="mt-5 flex flex-wrap gap-2"><a href="/install" className="btn btn-primary">Get alerts on your phone</a><a href="/account" className="btn btn-ghost">Open my alerts</a><button type="button" className="btn btn-ghost" onClick={() => { setStep("model"); setStoreNumber(null); setStorage(null); setColor(null); setCovered(false); autoRan.current = false; }}>Add another</button></div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-ink-2">{planInfo?.key === "free" ? "Alerts are part of Plus and Pro. Your rule is saved; pick a plan and it starts sending right away." : `Your ${PLANS[planInfo?.key ?? "plus"].name} plan holds ${planInfo?.limit ?? 10} alerts and they are all in use. ${planInfo?.key === "pro" ? "Delete one from your account and this rule takes its slot." : "Upgrade, or delete one from your account."}`}</p>
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
                    <button type="button" className={`btn mt-4 ${k === "plus" ? "btn-primary" : "btn-ghost"}`} disabled={busy} aria-busy={busy} onClick={() => goPay(k, watchId)}>
                      {busy ? <><span className="spinner" /> Opening checkout</> : `Choose ${PLANS[k].name}`}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-3">Your rule stays saved either way and starts sending the moment a plan is active. Cancel anytime from your account.</p>
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
