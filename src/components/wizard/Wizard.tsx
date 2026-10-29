"use client";
/**
 * "Get notified" — one surface, six steps:
 *   model → storage → color → stores → email + code (Clerk, custom UI) → done, or pick a plan
 * The rule is saved as soon as the user is signed in; the first one is free, more need Plus/Pro.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MODELS, COLOR_META, STORAGE_ORDER, type ModelKey } from "@/lib/apple/catalog";
import { PLANS, type PlanKey } from "@/lib/plans";
import { track } from "@/lib/track";
import { StorePicker } from "./StorePicker";

type Step = "model" | "config" | "stores" | "email" | "code" | "pay";
/** Progress segments: model · configuration · stores · sign-in · done. */
const STAGE: Record<Step, number> = { model: 0, config: 1, stores: 2, email: 3, code: 3, pay: 4 };

export interface WizardCatalog {
  storages: Record<ModelKey, string[]>;
  colors: Record<ModelKey, string[]>;
  prices: Record<ModelKey, number>;
}

function clerkMessage(e: unknown): string {
  const err = e as { longMessage?: string; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err?.longMessage ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
}

export function Wizard({ catalog, initialModel, initialStore, startSignIn, next }: { catalog: WizardCatalog; initialModel?: ModelKey; initialStore?: string; startSignIn?: boolean; next?: string }) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<Step>(startSignIn ? "email" : initialModel ? "config" : "model");
  const [model, setModel] = useState<ModelKey | null>(initialModel ?? null);
  const [storages, setStorages] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [stores, setStores] = useState<{ storeNumbers: string[]; zip?: string; radiusMiles?: number; lat?: number; lng?: number }>({ storeNumbers: initialStore ? [initialStore] : [] });
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
  const storageOptions = model ? catalog.storages[model] : [];
  const colorOptions = model ? catalog.colors[model] : [];

  const toggle = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const saveWatch = useCallback(async (): Promise<string> => {
    if (!model) throw new Error("Pick a model first");
    const res = await fetch("/api/watches", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, storages, colors, storeNumbers: stores.storeNumbers, zip: stores.zip || undefined, radiusMiles: stores.radiusMiles, lat: stores.lat, lng: stores.lng }),
    });
    const j = (await res.json()) as { id?: string; covered?: boolean; plan?: { key: PlanKey; limit: number; used: number }; error?: string };
    if (!res.ok || !j.id) throw new Error(j.error ?? "Could not save your alert");
    setWatchId(j.id); setCovered(Boolean(j.covered)); setPlanInfo(j.plan ?? null);
    track("watch_saved", { model, storages: storages.length, colors: colors.length, stores: stores.storeNumbers.length || (stores.zip ? "zip" : "all") });
    return j.id;
  }, [model, storages, colors, stores]);

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

  // After the store step: signed-in users skip straight to saving + paying.
  const continueFromStores = async () => {
    setError(null);
    if (authLoaded && isSignedIn) {
      setBusy(true);
      try { const id = await saveWatch(); setBusy(false); setStep("pay"); if (!covered) void id; } catch (e) { setError(e instanceof Error ? e.message : String(e)); setBusy(false); }
    } else setStep("email");
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
      if (!model) {
        // Sign-in only (header link, a protected page, the install guide): go where they were headed.
        window.location.assign(next && next.startsWith("/") && !next.startsWith("//") ? next : "/account");
        return;
      }
      await saveWatch();
      setStep("pay");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const summary = useMemo(() => {
    if (!modelMeta) return "";
    const s = storages.length ? storages.join(" / ") : "any storage";
    const c = colors.length ? colors.join(" / ") : "any color";
    const where = stores.storeNumbers.length ? `${stores.storeNumbers.length} store${stores.storeNumbers.length > 1 ? "s" : ""}` : stores.zip ? `within ${stores.radiusMiles ?? 50} mi of ${stores.zip}` : stores.lat != null ? `within ${stores.radiusMiles ?? 50} mi of you` : "every US Apple Store";
    return `${modelMeta.name} · ${s} · ${c} · ${where}`;
  }, [modelMeta, storages, colors, stores]);

  return (
    <div id="notify" className="pane relative overflow-hidden p-5 sm:p-7">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2" aria-label={`Step ${STAGE[step] + 1} of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= STAGE[step] ? "bg-accent" : "bg-white/10"}`} />
        ))}
      </div>

      {step === "model" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">Which iPhone?</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <button key={m.key} type="button" onClick={() => { setModel(m.key); setStorages([]); setColors([]); setStep("config"); track("model_selected", { model: m.key }); }}
                className={`pane-2 pane-hover p-4 text-left ${m.key === "duo" ? "border-accent/40" : ""}`}>
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
          <p className="mt-1 text-sm text-ink-3">Tap what you&apos;d accept — or just continue for any.</p>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Storage</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={storages.length === 0} onClick={() => setStorages([])}>Any</button>
            {[...storageOptions].sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)).map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={storages.includes(v)} onClick={() => toggle(storages, v, setStorages)}>{v}</button>
            ))}
          </div>
          <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-3">Color</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={colors.length === 0} onClick={() => setColors([])}>Any</button>
            {colorOptions.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={colors.includes(c)} onClick={() => toggle(colors, c, setColors)}>
                <span className="inline-block h-3 w-3 rounded-full border border-white/20" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />{c}
              </button>
            ))}
          </div>
          <Next label={storages.length || colors.length ? "Continue" : "Any storage, any color — continue"} onClick={() => setStep("stores")} />
        </section>
      )}

      {step === "stores" && model && (
        <section>
          <Back onClick={() => setStep("config")} />
          <h2 className="display text-2xl sm:text-3xl">Which stores?</h2>
          <div className="mt-6"><StorePicker value={stores} onChange={setStores} /></div>
          {error && <Err msg={error} />}
          <Next label={busy ? "Saving…" : "Continue"} busy={busy} onClick={continueFromStores} />
        </section>
      )}

      {step === "email" && (
        <section>
          {model ? <Back onClick={() => setStep("stores")} /> : null}
          <h2 className="display text-2xl sm:text-3xl">{model ? "Save this alert to your account" : "Sign in"}</h2>
          <p className="mt-2 text-ink-2">Your email is your account: we&apos;ll send a 6-digit code to confirm it&apos;s you. No password, ever.</p>
          {summary && <div className="pane-2 mt-4 px-4 py-3 text-sm text-ink-2">{summary}</div>}
          <form className="mt-6 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
            <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} />
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || !authLoaded}>{busy ? <><span className="spinner" /> Sending</> : "Send code"}</button>
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
            <button className="btn btn-primary sm:w-48" type="submit" disabled={busy || code.length < 6}>{busy ? <><span className="spinner" /> Verifying</> : "Verify"}</button>
          </form>
          {error && <Err msg={error} />}
          <button type="button" className="mt-4 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={() => { setCode(""); void sendCode(); }} disabled={busy}>Resend code</button>
        </section>
      )}

      {step === "pay" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">{covered ? (planInfo?.key === "free" ? "Your free alert is on" : "Alert saved — it's on") : "That's one more than your plan"}</h2>
          <p className="mt-2 text-ink-2">{summary}</p>
          {covered ? (
            <div className="mt-6">
              <p className="text-ink-2">We&apos;re watching every store you chose. You&apos;ll be notified the moment the {modelMeta?.short} is available for pickup{planInfo && planInfo.key !== "free" ? ` (${planInfo.used} of ${planInfo.limit} ${PLANS[planInfo.key].name} alerts in use)` : ""}.</p>
              <div className="mt-5 flex flex-wrap gap-2"><a href="/install" className="btn btn-primary">Get alerts on your phone</a><a href="/account" className="btn btn-ghost">Open my alerts</a></div>
              {planInfo?.key === "free" && <p className="mt-4 text-sm text-ink-3">Want more than one rule? Plus is $5 a month for 10, Pro $10 for 20 — upgrade from your account whenever you need it.</p>}
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-ink-2">{planInfo?.key === "free" ? "Your account includes one free alert rule, and it's already in use. Pick a plan and this rule starts sending too." : `Your ${PLANS[planInfo?.key ?? "plus"].name} plan holds ${planInfo?.limit ?? 10} rules and they're all in use. Move up and this one starts sending.`}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["plus", "pro"] as const).filter((k) => k !== planInfo?.key).map((k) => (
                  <div key={k} className="pane-2 flex flex-col p-5">
                    <div className="flex items-baseline justify-between"><span className="font-semibold">{PLANS[k].name}</span><span><span className="display text-3xl">${PLANS[k].priceUsd}</span><span className="text-ink-3"> / month</span></span></div>
                    <ul className="mt-3 flex-1 space-y-1.5 text-sm text-ink-2">
                      <li>✓ {PLANS[k].limit} alert rules, any model, any store</li>
                      <li>✓ Phone notifications within seconds</li>
                      <li>✓ Renews monthly · cancel anytime</li>
                    </ul>
                    <button type="button" className={`btn mt-4 ${k === "plus" ? "btn-primary" : "btn-ghost"}`} disabled={busy} onClick={() => goPay(k, watchId)}>
                      {busy ? <><span className="spinner" /> Opening checkout</> : `Choose ${PLANS[k].name}`}
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-3">Or keep the free plan: this rule stays saved but silent until you free up a slot or upgrade.</p>
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
function Next({ label, onClick, busy }: { label: string; onClick: () => void; busy?: boolean }) {
  return (
    <div className="mt-6">
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={busy}>{busy ? <span className="spinner" /> : null}{label}</button>
    </div>
  );
}
function Err({ msg }: { msg: string }) {
  return <p role="alert" className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-[#ffb3b3]">{msg}</p>;
}
