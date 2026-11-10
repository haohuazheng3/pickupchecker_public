"use client";
/**
 * The alert setup and sign-in, in a lightbox over the page (owner, 11-10: "Alert me", "Sign in" and every
 * button like them open it, so reading pages and choosing / signing in stay apart). One per site, in the root
 * layout; opened by openAlertLightbox(href) with the link's own href (/?…#notify, /ja-jp?signin=1&next=…),
 * whose path names the country and language and whose query the pre-fill. The catalogue is fetched when it
 * opens (cached at the edge), so pages no longer carry it.
 *
 * A native <dialog> shown with showModal(): the top layer, Esc and focus handling for free; a centred card on
 * larger screens, a bottom sheet on phones (.alert-dialog). Closed, the editor stays mounted, so opening it
 * again with the same link finds the ticks where they were.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { AlertEditor } from "./AlertEditor";
import type { PhoneCatalog } from "./PhoneMatrix";
import { loadAlertCatalog, registerAlertLightbox } from "@/lib/alertLightbox";
import { startFrom, startFromPool } from "@/lib/alertStart";
import { localeFromSegment } from "@/lib/i18n/locales";
import { onAlertsChanged } from "@/lib/alertEvents";
import { useT } from "@/components/i18n/LangProvider";
import { track } from "@/lib/track";

interface Req { href: string; query: string; cc: string; lang: string; home: string; signInOnly: boolean; next?: string; run: number }

/** A link's href → what the lightbox opens with. */
function parse(href: string, run: number): Req {
  const url = new URL(href, window.location.href);
  let seg = url.pathname.split("/")[1];
  let loc = localeFromSegment(seg);
  // A page in a country's own language links to that country's English home (/jp?…#notify): its own language wins.
  const here = localeFromSegment(window.location.pathname.split("/")[1]);
  if (loc && !loc.native && here?.native && here.cc === loc.cc) { loc = here; seg = here.id; }
  return {
    href: url.pathname + url.search, query: url.search, run,
    cc: loc?.cc ?? "us", lang: loc?.lang ?? "en", home: loc ? `/${seg}` : "/",
    signInOnly: url.searchParams.get("signin") === "1", next: url.searchParams.get("next") ?? undefined,
  };
}

export function AlertLightbox() {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const t = useT();
  const d = t.alerts;
  const { isSignedIn } = useAuth();
  const [req, setReq] = useState<Req | null>(null);
  const [catalog, setCatalog] = useState<{ key: string; c: PhoneCatalog } | null>(null);
  const [failed, setFailed] = useState(false);
  const [signInOnly, setSignInOnly] = useState(false);
  const current = useRef<Req | null>(null);
  // What happened while it was open: a sign-in or a saved change refreshes the page behind on close.
  const signedInAtOpen = useRef<boolean | undefined>(undefined);
  const changed = useRef(false);
  const signedInNow = useRef(isSignedIn);
  useEffect(() => { signedInNow.current = isSignedIn; }, [isSignedIn]);
  useEffect(() => onAlertsChanged(() => { if (ref.current?.open) changed.current = true; }), []);

  const fetchCatalog = useCallback((r: Req) => {
    const key = `${r.cc}/${r.lang}`;
    setFailed(false);
    loadAlertCatalog(r.cc, r.lang).then(
      (c) => { if (current.current === r) setCatalog({ key, c }); },
      () => { if (current.current === r) setFailed(true); },
    );
  }, []);

  useEffect(() => registerAlertLightbox((href) => {
    const prev = current.current;
    const r0 = parse(href, prev?.run ?? 0);
    // The same link again (the floating button after a close): open it as it was left.
    const same = prev && prev.href === r0.href && !r0.signInOnly;
    const r = same ? prev : { ...r0, run: (prev?.run ?? 0) + 1 };
    if (!same) {
      current.current = r;
      setReq(r);
      setSignInOnly(r.signInOnly);
      fetchCatalog(r);
    }
    const dlg = ref.current;
    if (dlg && !dlg.open) {
      signedInAtOpen.current = signedInNow.current;
      changed.current = false;
      document.documentElement.classList.add("dialog-open");
      dlg.showModal();
    }
    track("alert_lightbox_open", { signin: r.signInOnly ? 1 : 0, cc: r.cc });
  }), [fetchCatalog]);

  const hide = useCallback(() => ref.current?.close(), []);
  const onClose = () => {
    document.documentElement.classList.remove("dialog-open");
    // Arrived as /?signin=1 or /#notify: closing leaves an ordinary page (a reload would not open it again).
    const u = new URL(window.location.href);
    if (u.searchParams.has("signin") || u.searchParams.has("next") || u.hash === "#notify") {
      u.searchParams.delete("signin"); u.searchParams.delete("next"); u.hash = "";
      window.history.replaceState(null, "", u.pathname + u.search); // null: Next.js takes the new URL as its own
    }
    if (changed.current || signedInAtOpen.current !== signedInNow.current) router.refresh();
  };

  const key = req ? `${req.cc}/${req.lang}` : "";
  const cat = catalog && catalog.key === key ? catalog.c : null;
  const start = useMemo(() => {
    if (!req || !cat) return {};
    const q = new URLSearchParams(req.query);
    const get = (k: string) => q.get(k);
    return cat.stores ? startFromPool(get, cat.stores, cat.configs) : startFrom(get);
  }, [req, cat]);
  const onStay = useCallback(() => { setSignInOnly(false); changed.current = true; }, []);

  return (
    <dialog ref={ref} className="alert-dialog" aria-label={signInOnly ? d.editor.signIn : d.setup.title} onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) hide(); }}>
      <div className={`relative px-4 pt-4 sm:px-7 sm:pt-6 ${signInOnly || !cat ? "pb-6 sm:pb-7" : ""}`}>
        <button type="button" onClick={hide} aria-label={d.plan.close}
          className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-2 transition hover:bg-ink/8 hover:text-ink sm:end-4 sm:top-4">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        {!signInOnly && (
          <h2 className="display mb-5 pe-10 text-2xl sm:text-3xl">{d.setup.title}</h2>
        )}
        <div className={signInOnly ? "pe-10" : undefined}>
          {req && cat ? (
            <AlertEditor key={req.run} catalog={cat} start={start} signInOnly={signInOnly} next={req.next} home={req.home} onStay={onStay} stepped />
          ) : failed && req ? (
            <button type="button" className="btn btn-ghost" onClick={() => fetchCatalog(req)}>{t.chrome.error.retry}</button>
          ) : (
            <div className="flex h-40 items-center justify-center text-ink-3" aria-busy="true"><span className="spinner" /></div>
          )}
        </div>
      </div>
    </dialog>
  );
}
