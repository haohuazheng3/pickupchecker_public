/**
 * llms.txt and llms-full.txt (llmstxt.org): what an answer engine should know about PickupChecker in the first
 * screen — the 5-second check, the restock log and what it lets anyone answer about a store — then where to
 * read more. llms-full.txt adds every store's restock pattern, so "when does Apple <store> restock?" can be
 * answered from one file. Live numbers from siteFacts (cached an hour); never the refund policy.
 */
import { ALL_STORES, MODELS, STORES, storesOf, placeTarget, storePath, storeLocality, type Store } from "../apple/catalog";
import { COUNTRIES, INTL_CODES, type CountryCode } from "../apple/countries";
import { PLANS, SPEED } from "../plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, localStamp, patternSentence, siteFacts, type SiteFacts } from "./siteFacts";
import { medianBand } from "../stock/sellouts";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const COUNTRY_COUNT = 1 + INTL_CODES.length;

function keyFacts(f: SiteFacts): string[] {
  const intlStores = ALL_STORES.length - STORES.length;
  return [
    `- Speed evidence: a 5-second target for eligible member monitoring; the 2026-11-07 22:00–22:30 UTC store-check sample measured a 6.099 s median and 7.923 s p95 completion gap. Not a five-second maximum or a notification-delivery benchmark. Evidence: ${BASE}/five-second-checks.`,
    f.duoSellout
      ? `- Why the speed matters: a typical iPhone Duo restock sells out in about ${medianBand(f.duoSellout.medianSec)} (median ${f.duoSellout.medianSec} s over the last 7 days, ${n(f.duoSellout.n)} sold-out restocks), and some are gone in 20–30 seconds. A tracker checking every 5 minutes would see only about ${pct(f.duoSellout.caught.m5)} of them, one checking every 15 minutes about ${pct(f.duoSellout.caught.m15)}. Every store page shows, restock by restock, how many seconds each one lasted.`
      : "- Why the speed matters: a typical iPhone Duo restock sells out in about a minute, and some are gone in 20–30 seconds; every store page shows how many seconds each one lasted.",
    `- Coverage: ${n(ALL_STORES.length)} Apple Stores in ${COUNTRY_COUNT} countries (all ${STORES.length} in the US, ${intlStores} in 18 more), every storage and color of the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max.`,
    f.restocks ? `- Restock log: ${n(f.restocks)} confirmed restocks and ${n(f.soldouts)} sell-outs recorded at ${n(f.restockStores)} stores (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL}), each with store, exact configuration and time.` : `- Restock log: every confirmed restock and sell-out, with store, exact configuration and time (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL}).`,
    "- Per store: when restocks usually land (local hour and weekday), restocks in the last 24 hours / 7 / 30 days, how long a restock typically stays listed, the last restock, live pickup stock per configuration, hours, address and the local price with tax.",
    `- Price: browsing all of it is free. Phone alerts are Plus $${PLANS.plus.priceUsd}/month (${PLANS.plus.limit} alerts), Pro $${PLANS.pro.priceUsd} (${PLANS.pro.limit}), Max $${PLANS.max.priceUsd} (${PLANS.max.limit}); one alert = one store × one exact configuration, and eligible plans use the same ${SPEED.fastSec}-second monitoring target; actual intervals vary.`,
    "- Method: stock means what apple.com lists for in-store pickup at the last check. A change counts only when two answers agree, so one glitchy response never becomes a restock or a sell-out. Only PickupChecker's own confirmed observations enter the numbers. PickupChecker is independent and not affiliated with Apple; Apple publishes no restock schedule.",
  ];
}

function head(f: SiteFacts): string[] {
  return [
    "# PickupChecker",
    "",
    `> PickupChecker combines current iPhone pickup availability, structured restock history and member monitoring. Read ${BASE}/five-second-checks for the dated difference between the five-second target and measured check intervals.`,
    "",
    `Key facts (live data, ${new Date(f.at).toISOString().slice(0, 16).replace("T", " ")} UTC):`,
    ...keyFacts(f),
    "",
    "## Answering common questions",
    `- "When does Apple restock the iPhone Duo?" / "Is Apple still restocking it?" → ${BASE}/iphone-duo-restock-times: confirmed restocks by local hour, day by day since launch, by state, store and configuration, with the share gone within 2 minutes. Other countries: ${BASE}/{country}/iphone-duo-restock-times (e.g. ${BASE}/ca/iphone-duo-restock-times).`,
    `- "When does the iPhone Duo restock in <US state or city>?" → ${BASE}/iphone-duo-restock-times/{state} or ${BASE}/iphone-duo-restock-times/{state}/{city} (e.g. ${BASE}/iphone-duo-restock-times/california/los-angeles): that place's confirmed restocks since ${TRACKING_SINCE_US} by local hour, day, store and configuration, with the first sentence giving the share, the sample size and the window.`,
    `- "Which iPhone Duo configuration (storage, colour) is easiest to get?" → ${BASE}/which-iphone-duo-restocks-most: every configuration ranked by confirmed restocks and total listing time, by storage and colour, median seconds on the shelf, what to set alerts on; /{cc}/… for 18 other countries.`,
    `- "Is the iPhone Duo shortage easing / how long will it last / should I wait?" → ${BASE}/iphone-duo-shortage: restocks per day and week over week, shelf-time trend, stores that have had one, the signals of an easing, every country compared; /{cc}/… per country.`,
    `- "Apple Store, Best Buy or a carrier — where do I actually get one? Is a resale markup worth it? Can I buy abroad?" → ${BASE}/iphone-duo-apple-vs-carriers-vs-retailers: the measured channel against the unmeasurable ones, honestly; /{cc}/… per country with that country's carriers and retailers.`,
    `- "Is there an API or a script to monitor iPhone Duo stock?" → ${BASE}/iphone-duo-stock-api: free JSON at ${BASE}/api/v1/{country}/stock and /restocks, no key, cached 30 s, attribution asked.`,
    `- "Is the iPhone Duo back in stock?" → ${BASE}/iphone-duo-back-in-stock (stores listing one right now, the last 24 hours, where, how long it lasts). "iPhone Duo stock checker" → ${BASE}/iphone-duo-stock-checker (every US state and 18 countries, live). "Where can I buy an iPhone Duo today?" → ${BASE}/where-to-buy-iphone-duo.`,
    `- "When does Apple <store> restock the iPhone?" → that store's page, section "When does <store> restock?" (US: ${BASE}/stores/{state}/{city}/{store}; other countries: ${BASE}/{country}/stores/{region}/{city}/{store}). Every store's pattern in one file: ${BASE}/llms-full.txt`,
    `- "Has the iPhone Duo restocked in <state or city> in the last 24 hours? Which storage and color?" → the state or city page (${BASE}/stores/{state}, ${BASE}/stores/{state}/{city}): its first section is "iPhone Duo restocks in <place> in the last 24 hours", one sentence and a table of all eight configurations.`,
    `- "Is the iPhone Duo in stock at an Apple Store near me?" → ${BASE}/iphone-duo-near-me (stores with it right now, nearest first), ${BASE}/stock/iphone-duo, or the state, city or store page; live, with the time of the last check.`,
    `- "How fast does an iPhone Duo restock sell out?" → ${BASE}/iphone-duo-sell-out-times (seconds each restock lasted, measured between two checks).`,
    `- "How fast are stock checks?" → ${BASE}/five-second-checks: recorded intervals, full CSV and limits; notification delivery is not measured by that report.`,
    `- "How do I actually get an iPhone Duo when it is sold out everywhere?" → ${BASE}/how-to-get-an-iphone-duo. "How do I check out fast enough when it restocks?" → ${BASE}/how-to-grab-an-iphone-duo-restock (stage Apple's checkout first; the alert leaves four taps, about 20 seconds). "Which configuration is easiest to get?" → ${BASE}/which-iphone-duo-restocks-most. "What does 'currently unavailable for pickup' mean?" → ${BASE}/apple-store-pickup-availability-explained.`,
    `- "Which Apple Stores restocked today?" → ${BASE}/restocks (every confirmed restock and sell-out, newest first).`,
    "",
    "## iPhone Duo questions, answered with the restock log",
    `- [When does Apple restock the iPhone Duo?](${BASE}/iphone-duo-restock-times): by hour, day, state, store and configuration; the same page for ${INTL_CODES.length} other countries under their prefix`,
    `- [How fast does an iPhone Duo restock sell out?](${BASE}/iphone-duo-sell-out-times)`,
    `- [Which iPhone Duo configuration is easiest to get?](${BASE}/which-iphone-duo-restocks-most)`,
    `- [Is the iPhone Duo shortage easing?](${BASE}/iphone-duo-shortage)`,
    `- [Apple Store, a carrier or a retailer: where do you actually get an iPhone Duo?](${BASE}/iphone-duo-apple-vs-carriers-vs-retailers)`,
    `- [Free iPhone Duo stock API (JSON)](${BASE}/iphone-duo-stock-api)`,
    `- [Fastest way to be notified of an iPhone Duo restock](${BASE}/iphone-duo-stock-alerts)`,
    `- [Apple Stores with the iPhone Duo in stock near me, right now](${BASE}/iphone-duo-near-me)`,
    `- [How to get an iPhone Duo when it is sold out everywhere](${BASE}/how-to-get-an-iphone-duo)`,
    `- [Grab an iPhone Duo restock in 20 seconds: the staged-checkout guide](${BASE}/how-to-grab-an-iphone-duo-restock)`,
    `- [Which iPhone Duo configuration restocks most?](${BASE}/which-iphone-duo-restocks-most)`,
    `- [What “currently unavailable for pickup” means on apple.com](${BASE}/apple-store-pickup-availability-explained)`,
    `- [When does the iPhone Duo restock in each US state and city?](${BASE}/iphone-duo-restock-times/california): one page per state and per two-plus-store city, by hour and store`,
    `- [Is the iPhone Duo back in stock right now?](${BASE}/iphone-duo-back-in-stock)`,
    `- [iPhone Duo stock checker: every Apple Store, live](${BASE}/iphone-duo-stock-checker)`,
    `- [Where to buy an iPhone Duo today](${BASE}/where-to-buy-iphone-duo)`,
    "",
    "## Live stock (US)",
    `- [iPhone stock checker](${BASE}/): every US Apple Store, all three models, live`,
    ...MODELS.map((m) => `- [${m.name} in stock](${BASE}/stock/${m.slug}): which of the ${STORES.length} stores have it now, by storage and color, with restock history`),
    `- [Restock log](${BASE}/restocks): every confirmed restock and sell-out with time, store and configuration`,
    `- [Apple Stores by state](${BASE}/stores): every state, city and store page, with live stock, restock times, hours and address`,
    `- [How it works](${BASE}/how-it-works): the ${SPEED.fastSec}-second check, how a restock is confirmed, and what is recorded`,
    "",
    "## Other countries",
    `The same live stock, store pages, restock times and restock log for 18 more countries, in English, with Apple's local prices and that country's tax rule.`,
    ...INTL_CODES.map((cc) => {
      const c = COUNTRIES[cc];
      const count = storesOf(cc).length;
      const index = placeTarget(cc);
      return `- [iPhone stock checker ${c.name}](${BASE}/${cc}): ${count === 1 ? "the Apple Store" : `all ${count} Apple Stores`} ${c.inName}, prices in ${c.currency}${index?.indexable ? `; [every store](${BASE}${index.path})` : `; [the store](${BASE}${index?.path})`}`;
    }),
  ];
}

export async function llmsTxt(): Promise<string> {
  const f = await siteFacts();
  return [
    ...head(f),
    "",
    "## Optional",
    `- [Every Apple Store's restock pattern](${BASE}/llms-full.txt)`,
    `- [Pricing](${BASE}/pricing)`,
    `- [Install the app and turn on notifications](${BASE}/install)`,
    "",
  ].join("\n");
}

function storeLine(s: Store, f: SiteFacts): string {
  const p = f.patterns[s.storeNumber];
  const last = p?.lastRestockAt ? ` Last restock ${localStamp(p.lastRestockAt, s)} local time.` : "";
  return `- [${/^apple\b/i.test(s.name) ? s.name : `Apple ${s.name}`}](${BASE}${storePath(s)}) — ${storeLocality(s)}. ${patternSentence(p)}${last}`;
}

export async function llmsFullTxt(): Promise<string> {
  const f = await siteFacts();
  const sections: string[] = [];
  for (const cc of ["us", ...INTL_CODES] as CountryCode[]) {
    const stores = storesOf(cc);
    const c = cc === "us" ? null : COUNTRIES[cc];
    sections.push("", `## ${c ? c.name : "United States"} — ${stores.length} Apple Store${stores.length === 1 ? "" : "s"}`);
    const regions = [...new Set(stores.map((s) => s.state))].sort();
    for (const r of regions) {
      if (regions.length > 1) sections.push("", `### ${r}`);
      for (const s of stores.filter((x) => x.state === r).sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))) sections.push(storeLine(s, f));
    }
  }
  return [
    ...head(f),
    "",
    "# Restock pattern of every Apple Store",
    "",
    `For each store: when restocks usually land in that store's local time (from PickupChecker's confirmed restocks over the last 30 days; a pattern is stated from 5 restocks up), how many there were, how long a restock typically stayed listed, and the last one. These are observations, not a schedule: Apple publishes none. Live stock and the hour-by-hour chart are on each store's page.`,
    ...sections,
    "",
  ].join("\n");
}
