/**
 * English client strings: account (the dashboard's client parts, the notification card every app page shows, the
 * device labels the server sends with it). Plain data: "{name}" → fill(), { one, other } → plural(), **bold** → <Rich>
 * (or the class-less <b> renderer in PushSetup).
 */
export const account = {
  signOut: "Sign out",

  /** Device names (lib/devices.ts, summarised for "Alerts go to your {label}") and the device list. */
  devices: {
    iphone: "iPhone",
    ipad: "iPad",
    /** A Home Screen install of the site: "iPhone app". */
    app: "{device} app",
    android: "Android phone",
    computer: "computer",
    device: "device",
    many: { one: "{n} device", other: "{n} devices" },
    platforms: { ios: "iPhone / iPad", android: "Android", desktop: "Computer", unknown: "Device" } as Record<string, string>,
    homeScreenApp: "Home Screen app",
    browser: "browser",
    /** Follows the platform name; keep the leading " · ". */
    meta: " · {kind} · added {added}",
    lastAlert: " · last alert {when}",
    stopped: "stopped — turn on again on that device",
    remove: "Remove",
  },

  /** The notification card (PushSetup) and its state machine (usePush). */
  push: {
    title: "Phone notifications",
    pill: { checking: "Checking…", "in-app-browser": "Open in Safari", "needs-install": "Not installed", unsupported: "Unsupported", "needs-signin": "Sign in", denied: "Blocked", ready: "Off", on: "On" },
    explain: {
      checking: "Checking this device…",
      inAppBrowser: "Tap ··· and choose **Open in Safari** (or Chrome).",
      needsInstall: "On iPhone and iPad, notifications only work from the Home Screen app.",
      unsupported: "This browser can't receive notifications, so alerts go to your email.",
      needsSignin: "Sign in on this device to turn on notifications.",
      deniedIos: "Allow in **Settings → Notifications → PickupChecker**, then reload.",
      denied: "Allow in your browser's site settings, then reload.",
      readyIos: "Off on this device, so your alerts go to your email for now. Tap **Turn on notifications**, then **Allow**, to get them here within seconds.",
      readyDevice: "Off on this device, so your alerts go to your email for now. Tap **Turn on notifications** to get them here within seconds.",
      readyBrowser: "Off on this browser, so your alerts go to your email for now. Tap **Turn on notifications** to get them here within seconds.",
      on: "Restocks arrive here in seconds, even with the app closed.",
    },
    /** Another device on the account already gets the alerts; {label} is a device name ("iPhone app", "2 devices"). */
    elsewhere: {
      needsInstall: "Alerts go to your {label}. Safari can't show them on iPhone; the Home Screen app does.",
      ready: "Alerts go to your {label}. Turn them on here to get them on this device too.",
      denied: "Alerts go to your {label}. Notifications are blocked in this browser.",
      other: "Alerts go to your {label}.",
    },
    turnOnToo: "Turn on here too",
    sendTest: "Send a test",
    showMeHow: "Show me how",
    signIn: "Sign in",
    installApp: "Install app",
    turnOn: "Turn on notifications",
    turnOff: "Turn off",
    setupGuide: "Setup guide",
    /** iPhone in Safari: the three steps under the card (iOS's own words for Share / Add to Home Screen). */
    miniSteps: ["Tap Share in Safari", "Add to Home Screen", "Open it, allow notifications"],
    /** "Send a test": what the server answered. {device} names come from the server. */
    test: {
      gone: "The push service says this device's subscription is gone. Turn notifications off and on again on that device.",
      none: "No device received the test{error}. Turn notifications off and on again.",
      noneError: " ({error})",
      soon: "Sending in {s} seconds — go to your Home Screen or lock your phone now: iPhone shows the banner only while this app is closed.",
      iosHint: "No banner? iPhone shows none while this app is open: swipe down from the top of the screen to see the test in Notification Center.",
      away: "The test went out while the app was in the background. No banner? Swipe down from the top of the screen to find it in Notification Center.",
      sent: "Test sent at {when} to {where} — it should pop up within a few seconds; the banner names the device and the time.{failed}",
      one: "your {device}",
      many: "{n} devices ({list})",
      /** Appended after a space. */
      failed: { one: "{n} device failed.", other: "{n} devices failed." },
    },
    errors: {
      notSaved: "Could not save this device — try again",
      notConfigured: "Notifications are not configured yet",
      allow: "Allow notifications to continue",
      notSavedPlain: "Could not save this device",
      noTest: "Could not send a test",
      noServiceWorker: "Service worker unavailable",
    },
    onNotice: "Notifications are on for this device. Send a test to see one land.",
  },

  /**
   * The restock timeline. {zone} is "Eastern" in English (hence "{zone} time"); in other languages it is the full
   * zone name from Intl ("日本標準時", "Mitteleuropäische Zeit"), which already says "time": translations drop the word.
   * {time} and {gap} arrive formatted ("9:25 AM", "2 h 5 min").
   */
  timeline: {
    title: "Restock timeline",
    badge: "Past restocks · not a forecast",
    window: "{yours} · last {days} days",
    order: "{zone} time, earliest first",
    bars: "longer bar = more often",
    mixedSome: "yours are few, so other stores on this zone fill in",
    mixedNone: "none at yours yet: other stores on this zone fill in",
    otherStores: "Other stores on {zone} time",
    empty: "Nothing yet. This fills in as restocks happen.",
    listLabel: "Restock times, {zone} time",
    now: "Now",
    nowLabel: "Now, {time}",
    nowNext: ". Next restock time {soon}",
    aboutNow: "about now",
    in: "in {gap}",
    reportedPrefix: "Reported · ",
    tomorrow: "tomorrow",
    nextTomorrow: "Next: {time} tomorrow, {soon}",
    /** Row labels for screen readers. */
    rowReported: { one: "{time}: {n} restock reported by other trackers at {where}", other: "{time}: {n} restocks reported by other trackers at {where}" },
    rowMine: { one: "{time}: {n} restock at {where}", other: "{time}: {n} restocks at {where}" },
    rowArea: { one: "{time}: {n} restock at {where} on {zone} time", other: "{time}: {n} restocks at {where} on {zone} time" },
    rowNext: ", next",
    rowNextTomorrow: ", next, tomorrow",
    /** Tooltip on a row's bar. */
    often: { one: "{n} restock around this time in the last {days} days", other: "{n} restocks around this time in the last {days} days" },
    oftenReported: { one: "{n} restock reported by other trackers around this time in the last {days} days", other: "{n} restocks reported by other trackers around this time in the last {days} days" },
    hidden: { one: "Your busiest times; {n} restock at quieter times aren't listed.", other: "Your busiest times; {n} restocks at quieter times aren't listed." },
    /** Starts the other trackers' footnote: "Dashed rings: iPhone Duo restocks published by …". */
    reportMark: "Dashed rings",
  },
  /** The dashboard's language setting. */
  language: {
    title: "Language",
    label: "Language for this page, your alerts and emails",
    help: "Pushes, alert emails and Stripe's checkout follow this choice; prices stay in each store's currency, times in each store's own time zone.",
    alertsIn: "Your alerts are currently sent in {lang}.",
    saving: "Saving…",
  },
};
