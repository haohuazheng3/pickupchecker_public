"use client";
/**
 * Email + 6-digit code, in place (Clerk's future API, our own UI): an unknown email becomes a sign-up.
 * Calls onSignedIn once the session is active.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth, useSignIn, useSignUp } from "@clerk/nextjs";
import { track } from "@/lib/track";

function clerkMessage(e: unknown): string {
  const err = e as { longMessage?: string; errors?: { longMessage?: string; message?: string }[]; message?: string };
  return err?.longMessage ?? err?.errors?.[0]?.longMessage ?? err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong";
}

export function EmailSignIn({ onSignedIn, onVerifying, cta = "Send code" }: {
  onSignedIn: () => Promise<void> | void;
  /** Called just before the session starts (the page should not react to "signed in" on its own then). */
  onVerifying?: () => void; cta?: string;
}) {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (mode) codeRef.current?.focus(); }, [mode]);

  const sendCode = async () => {
    if (!signIn || !signUp) return;
    const addr = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) { setError("Enter a valid email address"); return; }
    setBusy(true); setError(null);
    try {
      const created = await signIn.create({ identifier: addr });
      if (!created.error) {
        const sent = await signIn.emailCode.sendCode();
        if (sent.error) throw sent.error;
        setMode("signin");
      } else if (created.error.code === "form_identifier_not_found" || /not found|couldn't find|no account/i.test(created.error.longMessage ?? created.error.message)) {
        const su = await signUp.create({ emailAddress: addr });
        if (su.error) throw su.error;
        const sent = await signUp.verifications.sendEmailCode();
        if (sent.error) throw sent.error;
        setMode("signup");
      } else {
        throw created.error;
      }
      track("code_sent");
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!signIn || !signUp) return;
    const c = code.replace(/\D/g, "");
    if (c.length < 6) { setError("Enter the 6-digit code"); return; }
    setBusy(true); setError(null);
    onVerifying?.();
    try {
      if (mode === "signin") {
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
      track("signed_in", { mode });
      await onSignedIn();
    } catch (e) { setError(clerkMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      {!mode ? (
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void sendCode(); }}>
          <input className="input" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={busy} aria-label="Email" />
          <button className="btn btn-primary sm:w-52" type="submit" disabled={busy || !isLoaded} aria-busy={busy}>{busy ? <><span className="spinner" /> Sending</> : cta}</button>
        </form>
      ) : (
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void verify(); }}>
          <input ref={codeRef} className="input input-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} placeholder="••••••" value={code} aria-label="6-digit code"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} disabled={busy} />
          <button className="btn btn-primary sm:w-52" type="submit" disabled={busy || code.length < 6} aria-busy={busy}>{busy ? <><span className="spinner" /> Verifying</> : "Verify"}</button>
        </form>
      )}
      <div id="clerk-captcha" className="mt-2" />
      {mode && (
        <p className="mt-2 text-xs text-ink-3">
          Code sent to <span className="text-ink-2">{email}</span> ·{" "}
          <button type="button" className="underline-offset-2 hover:underline" disabled={busy} onClick={() => { setCode(""); void sendCode(); }}>resend</button> ·{" "}
          <button type="button" className="underline-offset-2 hover:underline" disabled={busy} onClick={() => { setMode(null); setCode(""); setError(null); }}>change email</button>
        </p>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
      {!mode && <p className="mt-2 text-xs text-ink-3">Your email is the account: a 6-digit code, no password. By continuing you agree to the <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.</p>}
    </div>
  );
}
