/**
 * English client strings: install (the /install guide and its hand-drawn phone screens). The mock labels imitate the
 * operating system's own UI ("Share", "Add to Home Screen", "Allow"): a translation uses the words iOS, Android and
 * Chrome show in that language, not a fresh rendering.
 */
export const install = {
  hero: {
    eyebrow: "Home Screen app · no download",
    title: "Alerts on your lock screen.",
    lead: "Add PickupChecker to your Home Screen and allow notifications. Restocks land on your lock screen in seconds.",
    seeSteps: "See the steps",
    sendTest: "Send a test",
    turnOn: "Turn on notifications",
    /** A device on the account already gets alerts: {label} is its name ("iPhone app"), {link} the "My alerts" link. */
    already: "**✓ You're set up.** Alerts go to your {label}. The steps below add this device too. {link}",
    myAlerts: "My alerts",
  },
  progress: {
    homeScreen: "On the Home Screen",
    signedIn: "Signed in",
    on: "Notifications on",
    blocked: "Blocked in settings — see step {n}.",
  },
  steps: {
    title: "Set up notifications",
    intro: {
      ios: "On iPhone and iPad, notifications only work from the Home Screen app.",
      android: "Installing is optional on Android; Chrome can notify on its own.",
      desktop: "Works in the browser. No install needed.",
    },
    tabsLabel: "Your device",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computer" },
    ios: {
      safari: { title: "Open pickupchecker.com in Safari", text: "Safari only. Not Chrome or an in-app browser." },
      share: { title: "Tap Share", text: "Bottom bar on iPhone, top on iPad." },
      choose: { title: "Choose “Add to Home Screen”", text: "Scroll down if you don't see it." },
      add: { title: "Tap Add", text: "Keep the name PickupChecker." },
      open: { title: "Open it from the Home Screen and sign in", text: "The app has its own sign-in. Same email, same alerts." },
      allow: { title: "Tap “Turn on notifications”, then Allow", text: "The button is on your alerts page. iPhone asks once." },
    },
    android: {
      chrome: { title: "Open pickupchecker.com in Chrome", text: "Samsung Internet and Edge also work. In-app browsers don't." },
      /** Chrome offered its install prompt. */
      install: { title: "Install the app", text: "One tap, no app store." },
      /** No prompt: Chrome's menu. */
      menu: { title: "Menu ⋮ → “Add to Home screen”", text: "Sometimes labeled **Install app**." },
      open: { title: "Open PickupChecker and sign in", text: "From your Home Screen or app drawer. Same email, same alerts." },
      allow: { title: "Tap “Turn on notifications”, then Allow", text: "Android asks once. Also works in the Chrome tab." },
    },
    desktop: {
      allow: { title: "Tap “Turn on notifications”", text: "Chrome, Edge, Firefox, Safari 16+. The browser asks once." },
      install: { title: "Optional: install as an app", text: "Chrome or Edge: the install icon in the address bar. Notifies even with the browser closed." },
      phone: { title: "Your phone too", text: "Sign in on your phone with the same email. Every device with notifications on gets every alert." },
    },
  },
  action: {
    install: "Install PickupChecker",
    on: "✓ Notifications are on for this device.",
    sendTest: "Send a test",
    needsInstall: "Available once you open the Home Screen app.",
    signInFirst: "Sign in first",
    signInThenOn: "Sign in, then turn on",
    turnOn: "Turn on notifications",
    denied: "Blocked. Allow PickupChecker in Settings, then reload.",
  },
  notes: [
    { q: "Why Safari on iPhone?", a: "Only Safari can add a site to the Home Screen. In-app browsers can't." },
    { q: "Battery?", a: "Nothing runs on your phone. Our servers do the checking." },
    { q: "Email?", a: "No. Alerts come only as notifications, so turn them on on at least one device." },
    { q: "Several devices?", a: "Sign in with the same email on each. Every device gets every alert." },
  ],
  cta: { title: "No alert yet?", button: "Set up an alert" },

  /** The illustrations (components/push/Mocks.tsx): the OS's own labels in that language. */
  mocks: {
    share: "Share",
    shareSheet: { copy: "Copy", readingList: "Add to Reading List", bookmark: "Add Bookmark", favorites: "Add to Favorites", addToHome: "Add to Home Screen", markup: "Markup" },
    addDialog: { cancel: "Cancel", title: "Add to Home Screen", add: "Add", note: "An icon will be added to your Home Screen so you can quickly access this website." },
    iosAlert: { title: "“PickupChecker” Would Like to Send You Notifications", text: "Notifications may include alerts, sounds and icon badges. These can be configured in Settings.", dontAllow: "Don’t Allow", allow: "Allow" },
    chromeMenuLabel: "Menu",
    /** Chrome's ⋮ menu: the rows above "Add to Home screen", that row, the rows below it. */
    chromeMenu: { before: ["New tab", "History", "Downloads", "Bookmarks", "Share…"], add: "Add to Home screen", after: ["Desktop site"] },
    androidAlert: { title: "Allow PickupChecker to send you notifications?", dontAllow: "Don’t allow", allow: "Allow" },
    desktopAlert: { wantsTo: "pickupchecker.com wants to", show: "Show notifications", block: "Block", allow: "Allow" },
    desktopInstall: { callout: "Install", title: "Install PickupChecker", text: "Opens in its own window", cancel: "Cancel", install: "Install" },
    lockScreen: { date: "Thursday, October 29", now: "now", title: "iPhone 18 Pro 256GB Black", body: "Apple Fifth Avenue · New York, NY — Available Today. Tap to reserve on apple.com." },
  },
};
