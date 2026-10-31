"use client";
/**
 * FlowGlance — the only analytics — and when it may run. /api/geo places the visitor: in the EU, the EEA,
 * the UK and Switzerland (or anywhere we can't place) a banner asks first and FlowGlance loads only after
 * "Accept"; everywhere else it loads straight away and the footer's "Do not track me" turns it off. The
 * choice lives in a first-party cookie for 180 days; a Global Privacy Control signal counts as an opt-out.
 * The snippet only ever loads on the production host over https: local runs, Lighthouse builds and preview
 * deployments would otherwise count as visitors. identify() happens in the account area.
 */
import { useEffect, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { CHOICE_DAYS, CONSENT_COOKIE, REGION_COOKIE, analyticsAllowed, choiceFrom, regionFrom, type Choice, type Region } from "@/lib/consent";
import { holdAnalytics, releaseAnalytics } from "@/lib/track";

const SITE_HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com").hostname;
const SNIPPET_ID = "fw-snippet";
export const CONSENT_EVENT = "pc:consent";

function writeCookie(name: string, value: string) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${value}; Path=/; Max-Age=${CHOICE_DAYS * 86400}; SameSite=Lax${secure}`;
}

function loadFlowGlance() {
  const key = process.env.NEXT_PUBLIC_FLOWGLANCE_KEY;
  // https as well as the host: local runs set NEXT_PUBLIC_SITE_URL to http://localhost, and their visits and
  // dev-time errors were landing in FlowGlance.
  if (!key || location.protocol !== "https:" || location.hostname !== SITE_HOST || document.getElementById(SNIPPET_ID)) return;
  const s = document.createElement("script");
  s.id = SNIPPET_ID;
  s.src = "https://flowglance.com/fw.js";
  s.async = true;
  s.dataset.site = key;
  document.head.appendChild(s);
}

function apply(allowed: boolean) {
  if (allowed) { releaseAnalytics(); loadFlowGlance(); } else holdAnalytics();
}

/** Accept / Decline on the banner, and "Do not track me" / "Turn on" in the footer. */
export function setAnalyticsChoice(choice: Choice) {
  writeCookie(CONSENT_COOKIE, choice);
  window.dispatchEvent(new CustomEvent<Choice>(CONSENT_EVENT, { detail: choice }));
  if (choice === "granted") return apply(true);
  apply(false);
  // A running snippet can't be unloaded: reload once so the rest of the visit happens without it.
  if (document.getElementById(SNIPPET_ID)) window.location.reload();
}

export function currentChoice(): Choice | null {
  return choiceFrom(document.cookie);
}

function hasGpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function lookupRegion(): Promise<Region> {
  const known = regionFrom(document.cookie);
  if (known) return Promise.resolve(known);
  return fetch("/api/geo")
    .then((r) => (r.ok ? (r.json() as Promise<{ consentRequired?: boolean }>) : null))
    .then((g) => {
      if (!g) return "ask" as const;
      const region: Region = g.consentRequired === false ? "default" : "ask";
      writeCookie(REGION_COOKIE, region);
      return region;
    })
    .catch(() => "ask" as const); // can't tell where the visitor is: ask
}

export function Consent() {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let live = true;
    const choice = choiceFrom(document.cookie);
    const gpc = hasGpc();
    if (choice || gpc) apply(analyticsAllowed(choice, "ask", gpc) === true);
    else {
      // Until the region is known nothing is sent; events wait in the queue and are dropped if we must ask.
      void lookupRegion().then((region) => {
        if (!live || choiceFrom(document.cookie)) return; // answered from the footer meanwhile
        const allowed = analyticsAllowed(null, region, false);
        apply(allowed === true);
        if (allowed === null) setAsking(true);
      });
    }
    const answered = () => setAsking(false);
    window.addEventListener(CONSENT_EVENT, answered);
    return () => { live = false; window.removeEventListener(CONSENT_EVENT, answered); };
  }, []);

  if (!asking) return null;
  return (
    <div
      role="region"
      aria-label="Analytics choice"
      className="fixed inset-x-3 z-[60] sm:inset-x-auto sm:right-5 sm:w-[380px]"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
    >
      <div className="rounded-[var(--radius-2)] border p-5" style={{ background: "var(--pane-solid)", borderColor: "var(--line-2)", boxShadow: "var(--shadow)" }}>
        <p className="font-semibold text-ink">Can we count your visit?</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
          We&apos;d like to use FlowGlance, our only analytics, to see which pages help people find a phone. It records pages, clicks and
          form interactions, linked to your email when you&apos;re signed in. Nothing loads unless you accept.{" "}
          <Link href="/privacy#analytics" className="underline underline-offset-2 hover:text-ink">Details</Link>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ink btn-sm" onClick={() => setAnalyticsChoice("granted")}>Accept</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAnalyticsChoice("declined")}>Decline</button>
        </div>
      </div>
    </div>
  );
}

/** Footer control: "Do not track me" while analytics may run, "Analytics off · Turn on" after opting out. */
export function TrackingChoice() {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => {
    const sync = () => setChoice(currentChoice() ?? (hasGpc() ? "declined" : null));
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);
  if (choice === "declined") {
    return (
      <span>
        Analytics off ·{" "}
        <button type="button" className="underline underline-offset-2 hover:text-ink" onClick={() => setAnalyticsChoice("granted")}>Turn on</button>
      </span>
    );
  }
  return <button type="button" className="text-left hover:text-ink" onClick={() => setAnalyticsChoice("declined")}>Do not track me</button>;
}
