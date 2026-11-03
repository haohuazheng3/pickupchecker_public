"use client";
/**
 * A page that failed to render on the server. Next's default ("This page couldn't load" + Reload) left a paying
 * user tapping Reload for 15 minutes during the 18:44–18:50 UTC outage on 2026-11-02 (FlowGlance). This one
 * says what happened and tries again by itself (after 4, 8 and 15 seconds, then twice a minute while on screen),
 * so the page comes back the moment the server does. Alerts never depend on this page: they are sent by the
 * checker, not the website.
 */
import { useEffect, useRef, useState } from "react";
import { useLang, useLocale, useT } from "@/components/i18n/LangProvider";
import { fill, plural } from "@/lib/i18n/format";

const BACKOFF_S = [4, 8, 15, 30];

export default function RouteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const d = useT().chrome.error;
  const lang = useLang();
  const loc = useLocale();
  const [tries, setTries] = useState(0);
  const [left, setLeft] = useState(BACKOFF_S[0]);
  const retryRef = useRef(retry);
  useEffect(() => { retryRef.current = retry; }, [retry]);

  useEffect(() => {
    const wait = BACKOFF_S[Math.min(tries, BACKOFF_S.length - 1)];
    let remaining = wait;
    const reset = window.setTimeout(() => setLeft(wait), 0);
    const tick = window.setInterval(() => {
      if (document.visibilityState !== "visible") return; // no retries from a hidden tab; resumes when it is back
      remaining -= 1;
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) { window.clearInterval(tick); setTries((n) => n + 1); retryRef.current(); }
    }, 1000);
    return () => { window.clearTimeout(reset); window.clearInterval(tick); };
  }, [tries]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <div className="pane p-6 sm:p-8" role="alert" aria-live="polite">
        <h1 className="display text-2xl">{d.title}</h1>
        <p className="mt-2 text-ink-2">{d.body}</p>
        <p className="mt-4 text-sm text-ink-3 tabular-nums">{tries > 0 ? plural(lang, tries, d.tried) : ""}{fill(d.next, { s: left })}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => { setTries((n) => n + 1); retry(); }}>{d.retry}</button>
          <a href={loc.native ? `/${loc.id}` : "/"} className="btn btn-ghost">{d.home}</a>
        </div>
        {error.digest && <p className="mt-4 text-xs text-ink-3">{fill(d.reference, { id: error.digest })}</p>}
      </div>
    </div>
  );
}
