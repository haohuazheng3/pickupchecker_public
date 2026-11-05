/**
 * Notification texts (push, alert email, "notifications stopped" email, device names), English. Plain TS with no
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
  email: {
    /** `more`: how many other alerts the same email carries (0 = none). */
    subject: (cfg: string, store: string, more: number) => `In stock: ${cfg} at ${store}${more > 0 ? ` +${more} more` : ""}`,
    intro: "Good news — available for in-store pickup right now:",
    reserve: "Reserve",
    store: "Store",
    tip: 'Pickup stock moves fast: open the Apple Store app or apple.com, choose "Pick up", and select the store.',
    manage: (url: string) => `Manage or pause this alert: ${url}`,
    htmlTitle: "In stock for pickup now",
    htmlReserve: "Reserve on apple.com",
    htmlStorePage: "Store page →",
    /** HTML: <b>…</b> allowed. */
    htmlTip: "Pickup stock moves fast — reserve in the Apple Store app or on apple.com, choose <b>Pick up</b> and select the store.",
    htmlManage: "Manage or pause this alert",
    /** The plan's way out, under every alert: `url` = /account/cancel (lands on the plan's cancel step). */
    cancel: (url: string) => `Got your iPhone? Cancel anytime: ${url}`,
    htmlGotIt: "Got your iPhone?",
    htmlCancel: "Cancel anytime",
  },
  /** Stripe Checkout's line above the pay button: the plan, its alerts, how fast checks run (5 s / 15 s / ~3 s push). */
  checkoutSubmit: (plan: string, limit: number, fastSec: number, checkSec: number, alertSec: number) => `${plan}: ${limit} alerts. Your stores are checked every ${fastSec} s (every store every ${checkSec} s), with a push about ${alertSec} s after a restock is confirmed. Monthly, cancel anytime.`,
  stopped: {
    deviceWord: { ios: "iPhone", android: "Android phone", desktop: "computer", other: "device" },
    subject: (device: string) => `Notifications stopped on your ${device} — open PickupChecker from the Home Screen`,
    gone: (device: string) => `Your ${device} stopped accepting PickupChecker notifications (the push service reported the subscription is gone).`,
    byEmail: "Restock alerts for your rules now arrive by email until you turn notifications back on.",
    reopenIos: 'Open PickupChecker from your Home Screen (not Safari) and tap "Turn on notifications" on the Account page.',
    reopenOther: 'Open PickupChecker, go to Account and tap "Turn on notifications".',
    causes: "Common causes: the app was removed from the Home Screen, notifications were switched off in Settings, or the phone was restored.",
  },
};
export type NotifyText = typeof notifyEn;
