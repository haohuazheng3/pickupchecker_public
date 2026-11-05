/**
 * Notification texts (push, "notifications stopped" email, device names), English. There is no alert email:
 * restock alerts are push only (CLAUDE.md 「提醒只有消息弹窗」). Plain TS with no
 * imports: the poller sends these too. Every language mirrors this shape in notify/<lang>.ts.
 */
export const notifyEn = {
  /** Push title: "iPhone Duo 256GB Night Sky" alone (`cfg` = model, storage and colour as the reader writes them): a prefix pushed the colour past the one-line banner. */
  pushTitle: (cfg: string) => cfg,
  /** Push body: `where` = "Apple SoHo · New York, NY"; `quote` = Apple's own pickup wording, when it is in the reader's language. */
  pushBody: (where: string, quote: string | null) => `${where}${quote ? ` — ${quote}` : ""}. Tap to reserve on apple.com.`,
  testTitle: "PickupChecker notifications are on",
  testBody: (time: string, device: string) => `Test sent ${time} to your ${device}. Restock alerts arrive the same way, within seconds.`,
  device: {
    iphoneApp: "iPhone (Home Screen app)",
    iphoneSafari: "iPhone (Safari)",
    androidApp: "Android (installed app)",
    android: (browser: string) => `Android${browser ? ` (${browser})` : ""}`,
    computer: (browser: string) => `computer${browser ? ` (${browser})` : ""}`,
    other: "this device",
  },
  /** Stripe Checkout's line above the pay button: the plan, its alerts, how fast checks run (5 s / 15 s / ~3 s push). */
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alerts. Your stores are checked every ${fastSec} s (every store every ${checkSec} s), with a push about ${alertSec} s after a restock is confirmed. Monthly, cancel anytime.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android phone", desktop: "computer", other: "device" },
    subject: (device: string) => `Notifications stopped on your ${device} — open PickupChecker from the Home Screen`,
    gone: (device: string) => `Your ${device} stopped accepting PickupChecker notifications (the push service reported the subscription is gone).`,
    noAlerts: "Until you turn them back on, restock alerts can't reach you: PickupChecker sends alerts only as notifications, never by email.",
    reopenIos: 'Open PickupChecker from your Home Screen (not Safari) and tap "Turn on notifications" on the Account page.',
    reopenOther: 'Open PickupChecker, go to Account and tap "Turn on notifications".',
    causes: "Common causes: the app was removed from the Home Screen, notifications were switched off in Settings, or the phone was restored.",
  },
};
export type NotifyText = typeof notifyEn;
