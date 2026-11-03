"use client";
/**
 * /install — the illustrated "put PickupChecker on your Home Screen" guide. Picks the platform
 * from the device, lets the reader switch, and keeps the live notification switch next to the steps.
 */
import { useEffect, useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { Rich } from "@/components/i18n/Rich";
import { useAppLocale, useT } from "@/components/i18n/LangProvider";
import { fill } from "@/lib/i18n/format";
import { signInHome } from "@/lib/i18n/locales";
import { fetchMe } from "@/lib/me";
import { usePush, type PushState } from "./usePush";
import { B } from "./PushSetup";
import {
  LockScreenMock, SafariUrlMock, SafariShareMock, ShareSheetMock, AddDialogMock, HomeScreenMock, IosPermissionMock,
  ChromeMenuMock, ChromeInstallMock, AndroidPermissionMock, DesktopPermissionMock, DesktopInstallMock,
} from "./Mocks";
import type { Platform } from "@/lib/push/platform";

type Tab = "ios" | "android" | "desktop";
type T = ReturnType<typeof useT>["install"];

interface Step { title: string; text: React.ReactNode; art: React.ReactNode; action?: "notify" | "install" }

export function InstallGuide({ vapidPublicKey }: { vapidPublicKey: string }) {
  const p = usePush(vapidPublicKey);
  const d = useT().install;
  // Sign-in and "Set up an alert" go to the home page of the person's language ("/" in English).
  const home = signInHome(useAppLocale() ?? undefined);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (p.platform === "unknown" ? "ios" : p.platform);

  const steps = STEPS[tab](p, d);
  const installed = p.standalone;
  const signedIn = p.signedIn === true;
  const on = p.status === "on";
  // A signed-in reader whose alerts already reach a device (often the Home Screen app, while this is Safari).
  const [already, setAlready] = useState<string | null>(null);
  useEffect(() => {
    if (!signedIn) return;
    let gone = false;
    void fetchMe().then((me) => { if (!gone && me?.devices?.active) setAlready(me.devices.label); });
    return () => { gone = true; };
  }, [signedIn]);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
      {/* hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="eyebrow mb-4">{d.hero.eyebrow}</div>
          <h1 className="display text-4xl sm:text-6xl">{d.hero.title}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">{d.hero.lead}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#steps" className="btn btn-primary btn-lg">{d.hero.seeSteps}</a>
            {on ? <button type="button" className="btn btn-ghost btn-lg" disabled={p.busy} onClick={() => void p.sendTest()}>{d.hero.sendTest}</button>
              : p.status === "ready" && signedIn ? <button type="button" className="btn btn-ghost btn-lg" disabled={p.busy} onClick={() => void p.turnOn()}>{p.busy && <span className="spinner" />}{d.hero.turnOn}</button>
              : null}
          </div>
          {already && !on ? (
            <p className="mt-8 rounded-2xl bg-accent/10 px-4 py-3 text-sm text-ink-2">
              <Rich text={d.hero.already} b="text-accent" vars={{ label: already, link: <Link href="/account" className="underline">{d.hero.myAlerts}</Link> }} />
            </p>
          ) : <Progress installed={installed} signedIn={signedIn} on={on} platform={p.platform} status={p.status} d={d} />}
        </div>
        <LockScreenMock t={d.mocks} />
      </section>

      {/* steps */}
      <section id="steps" className="mt-20 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-2xl sm:text-4xl">{d.steps.title}</h2>
            <p className="mt-2 text-ink-2">{d.steps.intro[tab]}</p>
          </div>
          <div className="seg" role="tablist" aria-label={d.steps.tabsLabel}>
            {(["ios", "android", "desktop"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{d.steps.tabs[t]}</button>
            ))}
          </div>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="pane flex flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="step-num">{i + 1}</span><h3 className="text-lg font-semibold">{s.title}</h3></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-5 flex flex-1 items-end justify-center pt-6">{s.art}</div>
              {s.action && <StepAction kind={s.action} p={p} d={d} home={home} />}
            </li>
          ))}
        </ol>
      </section>

      {/* notes */}
      <section className="mt-16 grid gap-3 md:grid-cols-2">
        {d.notes.map(({ q, a }) => (
          <div key={q} className="pane-2 p-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p></div>
        ))}
      </section>

      <section className="pane mt-16 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <h2 className="display text-2xl">{d.cta.title}</h2>
        </div>
        <Link href={`${home}#notify`} className="btn btn-primary btn-lg">{d.cta.button}</Link>
      </section>
    </div>
  );
}

function Progress({ installed, signedIn, on, platform, status, d }: { installed: boolean; signedIn: boolean; on: boolean; platform: Platform; status: PushState["status"]; d: T }) {
  const needsInstall = platform === "ios";
  const items: [string, boolean, boolean][] = [
    [d.progress.homeScreen, installed, needsInstall],
    [d.progress.signedIn, signedIn, true],
    [d.progress.on, on, true],
  ];
  const visible = items.filter(([, , show]) => show);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {visible.map(([label, done]) => (
        <span key={label} className="check-row"><span className="check-dot" data-on={done}>{done ? "✓" : ""}</span><span className={done ? "text-ink" : "text-ink-3"}>{label}</span></span>
      ))}
      {status === "denied" && <span className="text-bad">{fill(d.progress.blocked, { n: needsInstall ? 6 : platform === "android" ? 4 : 1 })}</span>}
    </div>
  );
}

function StepAction({ kind, p, d, home }: { kind: "notify" | "install"; p: PushState; d: T; home: string }) {
  const a = d.action;
  if (kind === "install") {
    if (!p.canInstall) return null;
    return <button type="button" className="btn btn-primary mt-4 w-full" disabled={p.busy} onClick={() => void p.install()}>{a.install}</button>;
  }
  if (p.status === "on") return <div className="mt-4 rounded-2xl bg-accent/12 px-4 py-3 text-sm text-accent">{a.on}{" "}<button type="button" className="underline" disabled={p.busy} onClick={() => void p.sendTest()}>{a.sendTest}</button></div>;
  if (p.status === "needs-install") return <div className="mt-4 rounded-2xl bg-ink/4 px-4 py-3 text-sm text-ink-3">{a.needsInstall}</div>;
  if (p.status === "needs-signin") return <a href={`${home}?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">{a.signInFirst}</a>;
  if (p.status === "ready" && p.signedIn === false) return <a href={`${home}?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">{a.signInThenOn}</a>;
  if (p.status === "ready") return <button type="button" className="btn btn-primary mt-4 w-full" disabled={p.busy} onClick={() => void p.turnOn()}>{p.busy && <span className="spinner" />}{a.turnOn}</button>;
  if (p.status === "denied") return <div className="mt-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{a.denied}</div>;
  return null;
}

/** One step: the dictionary's title and text (text may carry **bold**), its illustration and live control. */
const step = (s: { title: string; text: string }, art: React.ReactNode, action?: Step["action"]): Step => ({ title: s.title, text: <B text={s.text} />, art, ...(action ? { action } : {}) });

const STEPS: Record<Tab, (p: PushState, d: T) => Step[]> = {
  ios: (_p, { steps: { ios: s }, mocks: t }) => [
    step(s.safari, <SafariUrlMock />),
    step(s.share, <SafariShareMock t={t} />),
    step(s.choose, <ShareSheetMock t={t} />),
    step(s.add, <AddDialogMock t={t} />),
    step(s.open, <HomeScreenMock />),
    step(s.allow, <IosPermissionMock t={t} />, "notify"),
  ],
  android: (p, { steps: { android: s }, mocks: t }) => [
    step(s.chrome, <ChromeMenuMock t={t} />),
    step(p.canInstall ? s.install : s.menu, <ChromeInstallMock t={t} />, "install"),
    step(s.open, <HomeScreenMock />),
    step(s.allow, <AndroidPermissionMock t={t} />, "notify"),
  ],
  desktop: (_p, { steps: { desktop: s }, mocks: t }) => [
    step(s.allow, <DesktopPermissionMock t={t} />, "notify"),
    step(s.install, <DesktopInstallMock t={t} />, "install"),
    step(s.phone, <HomeScreenMock />),
  ],
};
