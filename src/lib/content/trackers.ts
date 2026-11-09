/**
 * What other iPhone stock trackers state about themselves, read on their own sites on 2026-11-09 (the owner's
 * "evidence first" overhaul). These are their claims, quoted or closely paraphrased, never our measurements: we have
 * measured no one else's service, and every page that shows this table says so next to it. PickupChecker's own row
 * is built on the page from SPEED (the plan) and serviceStats() (the measurement), so it is not in this file.
 *
 * Wording rule (tests/cadence-copy.test.ts): a check interval other than our own 5 s / 15 s is never written as
 * "every N seconds" in src/ — an 8-second interval is "an 8-second check".
 */

/** The day these claims were read (ISO) and how pages print it. */
export const TRACKERS_READ = "2026-11-09";
export const TRACKERS_READ_LABEL = "November 9, 2026";
export const TRACKERS_READ_SHORT = "Nov 9, 2026";

export interface TrackerClaim {
  name: string;
  /** The tracker's homepage (pages link it rel="nofollow noopener"). */
  url: string;
  /** Stated check interval. */
  interval: string;
  /** Whether a first "in stock" is confirmed before the alert, as stated. */
  confirmation: string;
  /** Stated delay from spotting stock to the alert. */
  delay: string;
  channels: string;
  coverage: string;
  /** What one alert covers, as stated. */
  oneAlert: string;
  price: string;
  /** Monthly cost for 1 configuration at 3 stores, read from the stated plans (our reading). */
  needSmall: string;
  /** Monthly cost for 2 configurations at 5 stores each, read from the stated plans (our reading). */
  needLarge: string;
}

export const OTHER_TRACKER_CLAIMS: TrackerClaim[] = [
  {
    name: "Store Stock Checker",
    url: "https://storestockchecker.com",
    interval: "\"every 5 seconds\" at your Apple Stores",
    confirmation: "not stated",
    delay: "\"~2 sec from spotting stock to your alert\"",
    channels: "push, email",
    coverage: "\"531 Apple Stores in 25 countries\"",
    oneAlert: "one exact configuration at up to 5 nearby stores",
    price: "$5/mo for 2 alerts, $10 for up to 5, $20 for up to 10",
    needSmall: "$5/mo (1 alert covers the 3 stores)",
    needLarge: "$5/mo (2 alerts of 5 stores each)",
  },
  {
    name: "InStock Radar",
    url: "https://instockradar.com",
    interval: "an 8-second check \"wherever a paid alert points\"; other stores \"every few minutes\"; older models hourly",
    confirmation: "not stated",
    delay: "\"~2 s after we spot it\"; \"Median delay: 2 seconds\"",
    channels: "phone notification, Telegram, email",
    coverage: "\"all 269 Apple Stores in the US\"; 25–27 countries, 535 stores",
    oneAlert: "one iPhone at one store or area ($9.99 plan)",
    price: "$9.99 per 30 days (one iPhone, one store or area); $24.99 per 30 days for up to 25 alerts",
    needSmall: "$9.99 per 30 days if the 3 stores count as one area, otherwise $24.99",
    needLarge: "$24.99 per 30 days",
  },
  {
    name: "iPhone Stock Checker",
    url: "https://iphonestockchecker.com",
    interval: "not stated (the page you keep open refreshes itself on your device, 10–60 s)",
    confirmation: "not stated",
    delay: "not stated",
    channels: "email",
    coverage: "27 countries",
    oneAlert: "not stated",
    price: "free (tip jar)",
    needSmall: "free",
    needLarge: "free",
  },
  {
    name: "ManzanaTracker",
    url: "https://manzanatracker.com",
    interval: "\"about every 5 minutes\" for products with an alert",
    confirmation: "\"re-check stock right before we email\"",
    delay: "email after 4, 2 or 1 minute, by plan",
    channels: "email; push on paid plans",
    coverage: "US Apple Stores (\"245 of the 252\")",
    oneAlert: "not stated in what we read",
    price: "$5, $25 or $100 per month",
    needSmall: "from $5/mo (each plan's alert limit not checked)",
    needLarge: "from $5/mo (each plan's alert limit not checked)",
  },
  {
    name: "Apple Inventory Check",
    url: "https://appleinventorycheck.com",
    interval: "\"about every 5 minutes\", priority \"about every 2 minutes\" (its FAQ also says 15 minutes)",
    confirmation: "not stated",
    delay: "email \"within minutes\"",
    channels: "email",
    coverage: "30 countries",
    oneAlert: "not stated in what we read",
    price: "$14.88/month; priority $35/week",
    needSmall: "$14.88/mo (priority checks $35/week)",
    needLarge: "$14.88/mo (priority checks $35/week)",
  },
];

/** The two needs the cost table prices: alerts in PickupChecker's unit (one store × one exact configuration). */
export const NEEDS = {
  small: { label: "1 configuration at 3 stores", alerts: 3 },
  large: { label: "2 configurations at 5 stores", alerts: 10 },
} as const;
