"use client";
/**
 * /install — the illustrated "put PickupChecker on your Home Screen" guide. Picks the platform
 * from the device, lets the reader switch, and keeps the live notification switch next to the steps.
 */
import { useState } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { usePush, type PushState } from "./usePush";
import {
  LockScreenMock, SafariUrlMock, SafariShareMock, ShareSheetMock, AddDialogMock, HomeScreenMock, IosPermissionMock,
  ChromeMenuMock, ChromeInstallMock, AndroidPermissionMock, DesktopPermissionMock, DesktopInstallMock,
} from "./Mocks";
import type { Platform } from "@/lib/push/platform";

type Tab = "ios" | "android" | "desktop";

interface Step { title: string; text: React.ReactNode; art: React.ReactNode; action?: "notify" | "install" }

export function InstallGuide({ vapidPublicKey }: { vapidPublicKey: string }) {
  const p = usePush(vapidPublicKey);
  const [picked, setTab] = useState<Tab | null>(null);
  const tab: Tab = picked ?? (p.platform === "unknown" ? "ios" : p.platform);

  const steps = STEPS[tab](p);
  const installed = p.standalone;
  const signedIn = p.signedIn === true;
  const on = p.status === "on";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:pt-12">
      {/* hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="eyebrow mb-4">Home Screen app · no download</div>
          <h1 className="display text-4xl sm:text-6xl">Alerts on your lock screen.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">Add PickupChecker to your Home Screen and allow notifications. Restocks land on your lock screen in seconds.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#steps" className="btn btn-primary btn-lg">See the steps</a>
            {on ? <button type="button" className="btn btn-ghost btn-lg" disabled={p.busy} onClick={() => void p.sendTest()}>Send a test</button>
              : p.status === "ready" && signedIn ? <button type="button" className="btn btn-ghost btn-lg" disabled={p.busy} onClick={() => void p.turnOn()}>{p.busy && <span className="spinner" />}Turn on notifications</button>
              : null}
          </div>
          <Progress installed={installed} signedIn={signedIn} on={on} platform={p.platform} status={p.status} />
        </div>
        <LockScreenMock />
      </section>

      {/* steps */}
      <section id="steps" className="mt-20 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-2xl sm:text-4xl">Set up notifications</h2>
            <p className="mt-2 text-ink-2">{tab === "ios" ? "On iPhone and iPad, notifications only work from the Home Screen app." : tab === "android" ? "Installing is optional on Android; Chrome can notify on its own." : "Works in the browser. No install needed."}</p>
          </div>
          <div className="seg" role="tablist" aria-label="Your device">
            {(["ios", "android", "desktop"] as Tab[]).map((t) => (
              <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t === "ios" ? "iPhone / iPad" : t === "android" ? "Android" : "Computer"}</button>
            ))}
          </div>
        </div>

        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((s, i) => (
            <li key={i} className="pane flex flex-col p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="step-num">{i + 1}</span><h3 className="text-lg font-semibold">{s.title}</h3></div>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-5 flex flex-1 items-end justify-center pt-6">{s.art}</div>
              {s.action && <StepAction kind={s.action} p={p} />}
            </li>
          ))}
        </ol>
      </section>

      {/* notes */}
      <section className="mt-16 grid gap-3 md:grid-cols-2">
        {[
          ["Why Safari on iPhone?", "Only Safari can add a site to the Home Screen. In-app browsers can't."],
          ["Battery?", "Nothing runs on your phone. Our servers do the checking."],
          ["Email?", "No device with notifications on? The alert goes to your email instead."],
          ["Several devices?", "Sign in with the same email on each. Every device gets every alert."],
        ].map(([q, a]) => (
          <div key={q} className="pane-2 p-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p></div>
        ))}
      </section>

      <section className="pane mt-16 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <h2 className="display text-2xl">No alert yet?</h2>
        </div>
        <Link href="/#notify" className="btn btn-primary btn-lg">Set up an alert</Link>
      </section>
    </div>
  );
}

function Progress({ installed, signedIn, on, platform, status }: { installed: boolean; signedIn: boolean; on: boolean; platform: Platform; status: PushState["status"] }) {
  const needsInstall = platform === "ios";
  const items: [string, boolean, boolean][] = [
    ["On the Home Screen", installed, needsInstall],
    ["Signed in", signedIn, true],
    ["Notifications on", on, true],
  ];
  const visible = items.filter(([, , show]) => show);
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {visible.map(([label, done]) => (
        <span key={label} className="check-row"><span className="check-dot" data-on={done}>{done ? "✓" : ""}</span><span className={done ? "text-ink" : "text-ink-3"}>{label}</span></span>
      ))}
      {status === "denied" && <span className="text-bad">Blocked in settings — see step {needsInstall ? 6 : platform === "android" ? 4 : 1}.</span>}
    </div>
  );
}

function StepAction({ kind, p }: { kind: "notify" | "install"; p: PushState }) {
  if (kind === "install") {
    if (!p.canInstall) return null;
    return <button type="button" className="btn btn-primary mt-4 w-full" disabled={p.busy} onClick={() => void p.install()}>Install PickupChecker</button>;
  }
  if (p.status === "on") return <div className="mt-4 rounded-2xl bg-accent/12 px-4 py-3 text-sm text-accent">✓ Notifications are on for this device.{" "}<button type="button" className="underline" disabled={p.busy} onClick={() => void p.sendTest()}>Send a test</button></div>;
  if (p.status === "needs-install") return <div className="mt-4 rounded-2xl bg-ink/4 px-4 py-3 text-sm text-ink-3">Available once you open the Home Screen app.</div>;
  if (p.status === "needs-signin") return <a href={`/?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">Sign in first</a>;
  if (p.status === "ready" && p.signedIn === false) return <a href={`/?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">Sign in, then turn on</a>;
  if (p.status === "ready") return <button type="button" className="btn btn-primary mt-4 w-full" disabled={p.busy} onClick={() => void p.turnOn()}>{p.busy && <span className="spinner" />}Turn on notifications</button>;
  if (p.status === "denied") return <div className="mt-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">Blocked. Allow PickupChecker in Settings, then reload.</div>;
  return null;
}

const STEPS: Record<Tab, (p: PushState) => Step[]> = {
  ios: () => [
    { title: "Open pickupchecker.com in Safari", text: <>Safari only. Not Chrome or an in-app browser.</>, art: <SafariUrlMock /> },
    { title: "Tap Share", text: <>Bottom bar on iPhone, top on iPad.</>, art: <SafariShareMock /> },
    { title: "Choose “Add to Home Screen”", text: <>Scroll down if you don&apos;t see it.</>, art: <ShareSheetMock /> },
    { title: "Tap Add", text: <>Keep the name PickupChecker.</>, art: <AddDialogMock /> },
    { title: "Open it from the Home Screen and sign in", text: <>The app has its own sign-in. Same email, same alerts.</>, art: <HomeScreenMock /> },
    { title: "Tap “Turn on notifications”, then Allow", text: <>The button is on your alerts page. iPhone asks once.</>, art: <IosPermissionMock />, action: "notify" },
  ],
  android: (p) => [
    { title: "Open pickupchecker.com in Chrome", text: <>Samsung Internet and Edge also work. In-app browsers don&apos;t.</>, art: <ChromeMenuMock /> },
    { title: p.canInstall ? "Install the app" : "Menu ⋮ → “Add to Home screen”", text: p.canInstall ? <>One tap, no app store.</> : <>Sometimes labeled <b>Install app</b>.</>, art: <ChromeInstallMock />, action: "install" },
    { title: "Open PickupChecker and sign in", text: <>From your Home Screen or app drawer. Same email, same alerts.</>, art: <HomeScreenMock /> },
    { title: "Tap “Turn on notifications”, then Allow", text: <>Android asks once. Also works in the Chrome tab.</>, art: <AndroidPermissionMock />, action: "notify" },
  ],
  desktop: () => [
    { title: "Tap “Turn on notifications”", text: <>Chrome, Edge, Firefox, Safari 16+. The browser asks once.</>, art: <DesktopPermissionMock />, action: "notify" },
    { title: "Optional: install as an app", text: <>Chrome or Edge: the install icon in the address bar. Notifies even with the browser closed.</>, art: <DesktopInstallMock />, action: "install" },
    { title: "Your phone too", text: <>Sign in on your phone with the same email. Every device with notifications on gets every alert.</>, art: <HomeScreenMock /> },
  ],
};
