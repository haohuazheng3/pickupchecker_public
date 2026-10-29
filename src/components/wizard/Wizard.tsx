"use client";
/**
 * "Get notified" — one surface, six steps:
 *   model → storage → color → stores → email + code (Clerk, custom UI) → $5/month (Stripe Checkout)
 * The watch is saved as soon as the user is signed in; alerts flow after payment.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { MODELS, COLOR_META, STORAGE_ORDER, type ModelKey } from "@/lib/apple/catalog";
import { track } from "@/lib/track";
import { StorePicker } from "./StorePicker";

type Step = "model" | "storage" | "color" | "stores" | "email" | "code" | "pay";
const ORDER: Step[] = ["model", "storage", "color", "stores", "email", "code", "pay"];

export interface WizardCatalog {
  storages: Record<ModelKey, string[]>;
  colors: Record<ModelKey, string[]>;
  prices: Record<ModelKey, number>;
}

function clerkMessage(e: unknown): string {
  const err = e as { longMessage?: string; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err?.longMessage ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
}

export function Wizard({ catalog, initialModel, startSignIn, next }: { catalog: WizardCatalog; initialModel?: ModelKey; startSignIn?: boolean; next?: string }) {
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [step, setStep] = useState<Step>(startSignIn ? "email" : initialModel ? "storage" : "model");
  const [model, setModel] = useState<ModelKey | null>(initialModel ?? null);
  const [storages, setStorages] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [stores, setStores] = useState<{ storeNumbers: string[]; zip?: string; radiusMiles?: number }>({ storeNumbers: [] });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<string | null>(null);
  const [covered, setCovered] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (step === "code") codeRef.current?.focus(); }, [step]);

  const idx = ORDER.indexOf(step);
  const modelMeta = MODELS.find((m) => m.key === model);
  const storageOptions = model ? catalog.storages[model] : [];
  const colorOptions = model ? catalog.colors[model] : [];

  const toggle = (list: string[], v: string, set: (l: string[]) => void) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const saveWatch = useCallback(async (): Promise<string> => {
    if (!model) throw new Error("Pick a model first");
    const res = await fetch("/api/watches", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, storages, colors, storeNumbers: stores.storeNumbers, zip: stores.zip, radiusMiles: stores.radiusMiles }),
    });
    const j = (await res.json()) as { id?: string; covered?: boolean; error?: string };
    if (!res.ok || !j.id) throw new Error(j.error ?? "Could not save your alert");
    setWatchId(j.id); setCovered(Boolean(j.covered));
    track("watch_saved", { model, storages: storages.length, colors: colors.length, stores: stores.storeNumbers.length || (stores.zip ? "zip" : "all") });
    return j.id;
  }, [model, storages, colors, stores]);

  const goPay = useCallback(async (id: string) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ watchId: id }) });
      const j = (await res.json()) as { url?: string; alreadySubscribed?: boolean; error?: string };
      if (!res.ok || !j.url) throw new Error(j.error ?? "Checkout unavailable");
      track(j.alreadySubscribed ? "alert_activated" : "checkout_started", { model });
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
    const where = stores.storeNumbers.length ? `${stores.storeNumbers.length} store${stores.storeNumbers.length > 1 ? "s" : ""}` : stores.zip ? `within ${stores.radiusMiles ?? 50} mi of ${stores.zip}` : "every US Apple Store";
    return `${modelMeta.name} · ${s} · ${c} · ${where}`;
  }, [modelMeta, storages, colors, stores]);

  return (
    <div id="notify" className="pane relative overflow-hidden p-5 sm:p-7">
      {/* progress */}
      <div className="mb-5 flex items-center gap-2" aria-label={`Step ${Math.min(idx + 1, 6)} of 6`}>
        {ORDER.slice(0, 6).map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= Math.min(idx, 5) ? "bg-accent" : "bg-white/10"}`} />
        ))}
      </div>

      {step === "model" && (
        <section>
          <h2 className="display text-2xl sm:text-3xl">Which iPhone are you after?</h2>
          <p className="mt-2 text-ink-2">We check every Apple Store in the US around the clock.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <button key={m.key} type="button" onClick={() => { setModel(m.key); setStorages([]); setColors([]); setStep("storage"); track("model_selected", { model: m.key }); }}
                className="pane-2 pane-hover p-5 text-left">
                <div className="text-lg font-semibold">{m.name}</div>
                <div className="mt-1 text-sm text-ink-3">{m.blurb} · from ${catalog.prices[m.key].toLocaleString()}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-sm text-accent">Choose <span aria-hidden>→</span></div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === "storage" && model && (
        <section>
          <Back onClick={() => setStep("model")} />
          <h2 className="display text-2xl sm:text-3xl">{modelMeta?.name}: which storage?</h2>
          <p className="mt-2 text-ink-2">Pick one or more, or leave empty for any.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[...storageOptions].sort((a, b) => STORAGE_ORDER.indexOf(a) - STORAGE_ORDER.indexOf(b)).map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={storages.includes(s)} onClick={() => toggle(storages, s, setStorages)}>{s}</button>
            ))}
          </div>
          <Next label={storages.length ? "Continue" : "Any storage — continue"} onClick={() => setStep("color")} />
        </section>
      )}

      {step === "color" && model && (
        <section>
          <Back onClick={() => setStep("storage")} />
          <h2 className="display text-2xl sm:text-3xl">Which color?</h2>
          <p className="mt-2 text-ink-2">Pick one or more, or leave empty for any.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={colors.includes(c)} onClick={() => toggle(colors, c, setColors)}>
                <span className="inline-block h-3.5 w-3.5 rounded-full border border-white/20" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />
                {c}
              </button>
            ))}
          </div>
          <Next label={colors.length ? "Continue" : "Any color — continue"} onClick={() => setStep("stores")} />
        </section>
      )}

      {step === "stores" && model && (
        <section>
          <Back onClick={() => setStep("color")} />
          <h2 className="display text-2xl sm:text-3xl">Which stores?</h2>
          <p className="mt-2 text-ink-2">Enter a ZIP for everything nearby, pick specific stores, or watch the whole country.</p>
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
          <h2 className="display text-2xl sm:text-3xl">{covered ? "You're covered — alerts are on" : "Turn on alerts"}</h2>
          <p className="mt-2 text-ink-2">{summary}</p>
          {covered ? (
            <div className="mt-6">
              <p className="text-ink-2">Your subscription for the {modelMeta?.name} already covers this alert. You&apos;ll be notified the moment it&apos;s in stock.</p>
              <div className="mt-5 flex flex-wrap gap-2"><a href="/account" className="btn btn-primary">Open my alerts</a><a href="/install" className="btn btn-ghost">Get alerts on your phone</a></div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="pane-2 p-5">
                <div className="flex items-baseline gap-2"><span className="display text-4xl">$5</span><span className="text-ink-3">/ month</span></div>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-2">
                  <li>✓ Every Apple Store in the US, checked around the clock</li>
                  <li>✓ Instant notification on your phone when your {modelMeta?.short} is available for pickup</li>
                  <li>✓ Unlimited alerts for this model · cancel anytime</li>
                </ul>
              </div>
              <button type="button" className="btn btn-primary btn-lg" disabled={busy || !watchId} onClick={() => watchId && goPay(watchId)}>
                {busy ? <><span className="spinner" /> Opening checkout</> : "Start alerts · $5/mo"}
              </button>
            </div>
          )}
          {error && <Err msg={error} />}
          <p className="mt-4 text-xs text-ink-3">Secure checkout by Stripe. We never see your card.</p>
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
