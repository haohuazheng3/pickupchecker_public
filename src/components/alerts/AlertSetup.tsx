"use client";
/**
 * The alert setup as a page block: the home page's (always open, id="notify") and, on store, city, state
 * and product pages, a section that unfolds in place. "Alert me" links (/?…#notify) on a page that has
 * one open it with their pre-fill instead of leaving the page (AlertLinkHost). The floating button hides
 * while it is on screen (pc:wizard).
 */
import { useCallback, useEffect, useState } from "react";
import { AlertEditor } from "./AlertEditor";
import { Section } from "./Section";
import type { PhoneCatalog } from "./PhoneMatrix";
import { startFrom, type AlertStart } from "@/lib/alertStart";



function useAnnounce() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("pc:wizard", { detail: true }));
    if (window.location.hash === "#notify") document.getElementById("notify")?.scrollIntoView({ block: "start" });
    return () => { window.dispatchEvent(new CustomEvent("pc:wizard", { detail: false })); };
  }, []);
}

/** The home page's block. */
export function HomeAlertSetup({ catalog, start, signInOnly, next }: { catalog: PhoneCatalog; start: AlertStart; signInOnly?: boolean; next?: string }) {
  useAnnounce();
  return (
    <div id="notify" className="pane relative min-w-0 scroll-mt-28 p-4 sm:p-7">
      {!signInOnly && (
        <div className="mb-4">
          <h2 className="display text-2xl sm:text-3xl">Get an alert</h2>
          <p className="mt-1 text-sm text-ink-2">Tick the phones you want and the stores you can get to. Every phone is watched at every store.</p>
        </div>
      )}
      <AlertEditor catalog={catalog} start={start} signInOnly={signInOnly} next={next} />
    </div>
  );
}

/** Another page's block: folded until opened, by its header or by an "Alert me" link on the page. */
export function AlertPanel({ catalog, start, title, summary }: { catalog: PhoneCatalog; start: AlertStart; title: string; summary: string }) {
  useAnnounce();
  const [s, setS] = useState(start);
  const [run, setRun] = useState(0);
  const [shown, setShown] = useState(false); // the editor mounts on first open (no location prompt while folded)
  const show = useCallback(() => setShown(true), []);
  useEffect(() => {
    const on = (e: Event) => {
      const q = new URLSearchParams((e as CustomEvent<string>).detail ?? "");
      setS({ ...start, ...Object.fromEntries(Object.entries(startFrom((k) => q.get(k))).filter(([, v]) => v)) });
      setRun((n) => n + 1);
    };
    window.addEventListener("pc:alert", on);
    return () => window.removeEventListener("pc:alert", on);
  }, [start]);
  return (
    <div data-alert-panel>
      <Section id="notify" title={title} summary={summary} defaultOpen={false} onOpen={show}>
        {shown && <AlertEditor key={run} catalog={catalog} start={s} />}
      </Section>
    </div>
  );
}
