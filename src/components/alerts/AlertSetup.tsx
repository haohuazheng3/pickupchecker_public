"use client";
/**
 * Where a page invites someone to set up alerts. The setup itself (phones × stores, signing in, choosing a plan)
 * is the alert lightbox (AlertLightbox), apart from the page: these blocks only say what it is and open it.
 * The home page's block (id="notify") also opens it by itself when the page was reached as the sign-in page
 * (?signin=1, where the Home Screen app lands) or as an alert link (#notify, a deep link or a no-JS click).
 * The floating "Alert me" hides while one is on screen (pc:wizard).
 */
import { useEffect } from "react";
import { openAlertLightbox } from "@/lib/alertLightbox";
import { useT } from "@/components/i18n/LangProvider";

function useAnnounce() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pc:wizard", { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent("pc:wizard", { detail: false })); };
  }, []);
}

const Bell = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
);

/** The home page's block: what alerts are, and the button. "#notify" keeps this page's query (its pre-fill). */
export function HomeAlertSetup() {
  useAnnounce();
  const t = useT();
  const d = t.alerts.setup;
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get("signin") === "1" || u.hash === "#notify") openAlertLightbox(u.href);
  }, []);
  return (
    <div id="notify" className="pane relative min-w-0 scroll-mt-28 p-5 sm:p-7 lg:sticky lg:top-24">
      <h2 className="display text-2xl sm:text-3xl">{d.title}</h2>
      <p className="mt-1 text-sm text-ink-2">{d.lead}</p>
      <a href="#notify" className="btn btn-primary mt-4 w-full gap-2 sm:w-auto"><Bell />{t.chrome.alertBar.cta}</a>
    </div>
  );
}

/** Another page's block (store, city, region, product pages): its title, a line, the button with the page's pre-fill. */
export function AlertPanel({ href, title, summary }: { href: string; title: string; summary: string }) {
  useAnnounce();
  const t = useT();
  return (
    <div id="notify" className="pane flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-ink-3">{summary}</div>
      </div>
      <a href={href} className="btn btn-primary gap-2"><Bell />{t.chrome.alertBar.cta}</a>
    </div>
  );
}
