"use client";
/**
 * /install — the illustrated "put PickupChecker on your Home Screen" guide. Picks the platform
 * from the device, lets the reader switch, and keeps the live notification switch next to the steps.
 */
import { useState } from "react";
import Link from "next/link";
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
          <div className="eyebrow mb-4">Home Screen app · nothing to download</div>
          <h1 className="display text-4xl sm:text-6xl">Alerts that feel like texts.</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">Add PickupChecker to your Home Screen once and allow notifications. From then on every restock that matches your alerts lands on your lock screen within seconds, with one tap to reserve.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#steps" className="btn btn-primary btn-lg">Show me the steps</a>
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
            <h2 className="display text-2xl sm:text-4xl">Set it up in a minute</h2>
            <p className="mt-2 text-ink-2">{tab === "ios" ? "iPhone and iPad need the Home Screen app first — Apple only allows notifications from there." : tab === "android" ? "On Android, Chrome can send notifications straight away; installing just makes it feel like an app." : "On a computer, notifications work right in the browser."}</p>
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
          ["Why Safari on iPhone?", "Apple only delivers web notifications to apps on the Home Screen, and only Safari can put them there. Chrome, Instagram or an email app's built-in browser won't offer the option — open the link in Safari first."],
          ["Will it drain my battery?", "No. Nothing runs on your phone; our servers do the checking and Apple or Google hand the notification to your phone the same way iMessage does."],
          ["What about email?", "Devices with notifications on get the alert as a notification. If no device has them on, the alert goes to your email instead — so you never miss one."],
          ["Several phones?", "Open PickupChecker on each one, sign in with the same email and turn notifications on. Every device gets every matching restock."],
        ].map(([q, a]) => (
          <div key={q} className="pane-2 p-5"><h3 className="font-semibold">{q}</h3><p className="mt-2 text-sm leading-relaxed text-ink-2">{a}</p></div>
        ))}
      </section>

      <section className="pane mt-16 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <div>
          <h2 className="display text-2xl">No alert yet?</h2>
          <p className="mt-1 text-ink-2">Pick a model, the configurations you&apos;d take and the stores you can reach.</p>
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
  if (p.status === "needs-install") return <div className="mt-4 rounded-2xl bg-white/5 px-4 py-3 text-sm text-ink-3">This button lights up once you open PickupChecker from your Home Screen.</div>;
  if (p.status === "needs-signin") return <a href={`/?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">Sign in first</a>;
  if (p.status === "ready" && p.signedIn === false) return <a href={`/?signin=1&next=${encodeURIComponent("/install")}`} className="btn btn-primary mt-4 w-full">Sign in, then turn on</a>;
  if (p.status === "ready") return <button type="button" className="btn btn-primary mt-4 w-full" disabled={p.busy} onClick={() => void p.turnOn()}>{p.busy && <span className="spinner" />}Turn on notifications</button>;
  if (p.status === "denied") return <div className="mt-4 rounded-2xl bg-bad/10 px-4 py-3 text-sm text-[#ffb3b3]">Blocked. Allow notifications for PickupChecker in your settings, then reload.</div>;
  return null;
}

const STEPS: Record<Tab, (p: PushState) => Step[]> = {
  ios: () => [
    { title: "Open pickupchecker.com in Safari", text: <>Not Chrome, and not the browser inside Instagram or Mail — Safari is the only one that can add apps to the Home Screen.</>, art: <SafariUrlMock /> },
    { title: "Tap Share", text: <>The square with the arrow in the bar at the bottom of the screen (on iPad it&apos;s at the top).</>, art: <SafariShareMock /> },
    { title: "Choose “Add to Home Screen”", text: <>Scroll the list a little if you don&apos;t see it right away.</>, art: <ShareSheetMock /> },
    { title: "Tap Add", text: <>Keep the name PickupChecker so you can find it. The icon appears on your Home Screen like any app.</>, art: <AddDialogMock /> },
    { title: "Open it from the Home Screen and sign in", text: <>The app keeps its own sign-in: type your email, enter the 6-digit code. Same account, same alerts.</>, art: <HomeScreenMock /> },
    { title: "Tap “Turn on notifications”, then Allow", text: <>You&apos;ll find the button on your alerts page. iPhone asks once; choose Allow and you&apos;re done.</>, art: <IosPermissionMock />, action: "notify" },
  ],
  android: (p) => [
    { title: "Open pickupchecker.com in Chrome", text: <>Samsung Internet and Edge work too; the browser inside Instagram or Facebook does not.</>, art: <ChromeMenuMock /> },
    { title: p.canInstall ? "Install the app" : "Menu ⋮ → “Add to Home screen”", text: p.canInstall ? <>Chrome offers it right here — one tap, no store.</> : <>Open the three-dot menu, choose <b>Add to Home screen</b> (sometimes <b>Install app</b>) and confirm.</>, art: <ChromeInstallMock />, action: "install" },
    { title: "Open PickupChecker and sign in", text: <>From your Home Screen or app drawer. Enter your email and the 6-digit code.</>, art: <HomeScreenMock /> },
    { title: "Tap “Turn on notifications”, then Allow", text: <>Android asks once. Notifications also work in the Chrome tab if you skipped installing.</>, art: <AndroidPermissionMock />, action: "notify" },
  ],
  desktop: () => [
    { title: "Tap “Turn on notifications”", text: <>Works in Chrome, Edge, Firefox and Safari 16+. The browser asks once; choose Allow.</>, art: <DesktopPermissionMock />, action: "notify" },
    { title: "Optional: install as an app", text: <>In Chrome or Edge click the install icon at the right end of the address bar (or Menu → Cast, save and share → Install page as app). It opens in its own window and keeps notifying with the browser closed.</>, art: <DesktopInstallMock />, action: "install" },
    { title: "Your phone too", text: <>Open pickupchecker.com on your phone, sign in with the same email and follow the iPhone or Android steps. Every device with notifications on gets every alert.</>, art: <HomeScreenMock /> },
  ],
};
