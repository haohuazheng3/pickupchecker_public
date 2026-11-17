"use client";
/**
 * "Where did you hear about us?" (owner 2026-11-17): a lightbox the dashboard shows once per account. One tap on a
 * brand ends it; Other opens a one-line box under the grid for the brand they came from (Enter or Send ends it;
 * the tiles stay tappable, so a slip onto Other costs nothing). The X (or Esc) closes it unanswered. Either way it
 * never comes back: this browser remembers at once (localStorage) and the server marks the account (Clerk public
 * metadata) once Neon has the answer, so the page stops rendering it on every device. Answers go to Neon only
 * (POST /api/survey/source).
 *
 * Out of the way on purpose: it waits a moment after the page is up, never opens over another dialog, and never
 * when the dashboard was opened from a restock notification (?from=push: they are on their way to buy). The brand
 * marks load only when it is about to open, so people who answered never download them.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ASKED_STORAGE, DETAIL_MAX, SKIPPED, SOURCES, cleanDetail, type SourceAnswer, type SourceId, type SourceStrings } from "@/lib/survey/sources";
import { track } from "@/lib/track";

const SHOW_AFTER_MS = 1200;

function standaloneApp(): boolean {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Send the answer; a dropped connection gets two more tries (the server itself retries Neon). */
async function send(source: SourceAnswer, detail: string | null, lang: string) {
  const body = JSON.stringify({ source, detail, lang, standalone: standaloneApp() });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch("/api/survey/source", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
      if (r.ok || (r.status >= 400 && r.status < 500)) return;
    } catch { /* offline for a moment: try again */ }
    await new Promise((res) => setTimeout(res, attempt === 0 ? 1500 : 4000));
  }
}

export function SourceSurvey({ s, lang }: { s: SourceStrings; lang: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [logos, setLogos] = useState<Record<SourceId, string> | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const answered = useRef(false);
  const choseOther = useRef(false);

  useEffect(() => {
    try { if (window.localStorage.getItem(ASKED_STORAGE)) return; } catch { /* storage blocked: the server flag still stops it */ }
    if (new URLSearchParams(window.location.search).get("from") === "push") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      import("./sourceLogos").then(({ SOURCE_LOGOS }) => { if (!cancelled) setLogos(SOURCE_LOGOS); }, () => {});
    }, SHOW_AFTER_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const dlg = ref.current;
    if (!logos || !dlg || dlg.open) return;
    if (document.querySelector("dialog[open]")) return; // something else is open: ask on a later visit
    document.documentElement.classList.add("dialog-open");
    dlg.showModal();
    track("source_survey_shown");
  }, [logos]);

  useEffect(() => { if (typing) input.current?.focus(); }, [typing]);

  const answer = useCallback((source: SourceAnswer, detail: string | null = null) => {
    if (answered.current) return;
    answered.current = true;
    try { window.localStorage.setItem(ASKED_STORAGE, source === SKIPPED ? "skipped" : "answered"); } catch { /* see above */ }
    ref.current?.close();
    track("source_survey", { source });
    void send(source, detail, lang);
  }, [lang]);

  // Closed with the X / Esc: unanswered, unless they had already said "somewhere else" (then that is the answer).
  const dismiss = useCallback(() => answer(choseOther.current ? "other" : SKIPPED), [answer]);
  const submitOther = () => { const d = cleanDetail(text); if (d) answer("other", d); };

  return (
    <dialog ref={ref} className="alert-dialog source-dialog" aria-labelledby="source-survey-title"
      onClose={() => { document.documentElement.classList.remove("dialog-open"); dismiss(); }}>
      {logos && (
        <div className="relative px-4 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
          <button type="button" onClick={dismiss} aria-label={s.close}
            className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-ink/8 hover:text-ink sm:end-4 sm:top-4">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <h2 id="source-survey-title" className="display pe-10 text-xl sm:text-2xl">{s.title}</h2>
          <p className="mt-1 pe-10 text-sm text-ink-3">{s.lead}</p>
          <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SOURCES.map((src) => {
              const label = src.id === "friend" ? s.friend : src.id === "other" ? s.other : s.brands?.[src.id] ?? src.name;
              const isOther = src.id === "other";
              return (
                <li key={src.id}>
                  <button type="button" className="source-tile" data-source={src.id} aria-pressed={isOther ? typing : undefined}
                    onClick={() => { if (isOther) { choseOther.current = true; setTyping(true); } else answer(src.id); }}>
                    <span className="source-logo" dangerouslySetInnerHTML={{ __html: logos[src.id] }} />
                    <span className="source-name">{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {typing && (
            <form className="step-in mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); submitOther(); }}>
              <input ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={DETAIL_MAX} placeholder={s.otherAsk}
                aria-label={s.otherAsk} enterKeyHint="send" autoComplete="off"
                className="input min-w-0 flex-1" />
              <button type="submit" className="btn btn-primary shrink-0" disabled={!cleanDetail(text)}>{s.send}</button>
            </form>
          )}
        </div>
      )}
    </dialog>
  );
}
