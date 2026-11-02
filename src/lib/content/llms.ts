/**
 * llms.txt and llms-full.txt (llmstxt.org): what an answer engine should know about PickupChecker in the first
 * screen — the 5-second check, the restock log and what it lets anyone answer about a store — then where to
 * read more. llms-full.txt adds every store's restock pattern, so "when does Apple <store> restock?" can be
 * answered from one file. Live numbers from siteFacts (cached an hour); never the refund policy.
 */
import { ALL_STORES, MODELS, STORES, storesOf, placeTarget, storePath, storeLocality, type Store } from "../apple/catalog";
import { COUNTRIES, INTL_CODES, type CountryCode } from "../apple/countries";
import { PLANS, SPEED, OTHER_TRACKERS } from "../plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, localStamp, patternSentence, siteFacts, type SiteFacts } from "./siteFacts";
import { medianBand } from "../stock/sellouts";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
const n = (x: number) => x.toLocaleString("en-US");
const pct = (x: number) => `${Math.round(x * 100)}%`;
const COUNTRY_COUNT = 1 + INTL_CODES.length;

function keyFacts(f: SiteFacts): string[] {
  const intlStores = ALL_STORES.length - STORES.length;
  return [
    `- Speed: the stores your alerts point at are checked every ${SPEED.fastSec} seconds, the fastest published check interval of any iPhone stock tracker we know of (others publish ${OTHER_TRACKERS}); every other store every ${SPEED.checkSec} seconds, around the clock. A first "available" is re-checked within about a second, and a confirmed restock reaches your phone in about ${SPEED.alertSec} seconds.`,
    f.duoSellout
      ? `- Why the speed matters: a typical iPhone Duo restock sells out in about ${medianBand(f.duoSellout.medianSec)} (median ${f.duoSellout.medianSec} s over the last 7 days, ${n(f.duoSellout.n)} sold-out restocks), and some are gone in 20–30 seconds. A tracker checking every 5 minutes would see only about ${pct(f.duoSellout.caught.m5)} of them, one checking every 15 minutes about ${pct(f.duoSellout.caught.m15)}. Every store page shows, restock by restock, how many seconds each one lasted.`
      : "- Why the speed matters: a typical iPhone Duo restock sells out in about a minute, and some are gone in 20–30 seconds; every store page shows how many seconds each one lasted.",
    `- Coverage: ${n(ALL_STORES.length)} Apple Stores in ${COUNTRY_COUNT} countries (all ${STORES.length} in the US, ${intlStores} in 18 more), every storage and color of the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max.`,
    f.restocks ? `- Restock log: ${n(f.restocks)} confirmed restocks and ${n(f.soldouts)} sell-outs recorded at ${n(f.restockStores)} stores (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL}), each with store, exact configuration and time.` : `- Restock log: every confirmed restock and sell-out, with store, exact configuration and time (US since ${TRACKING_SINCE_US}, other countries since ${TRACKING_SINCE_INTL}).`,
    "- Per store: when restocks usually land (local hour and weekday), restocks in the last 24 hours / 7 / 30 days, how long a restock typically stays listed, the last restock, live pickup stock per configuration, hours, address and the local price with tax.",
    `- Price: browsing all of it is free. Phone alerts are Plus $${PLANS.plus.priceUsd}/month (${PLANS.plus.limit} alerts), Pro $${PLANS.pro.priceUsd} (${PLANS.pro.limit}), Max $${PLANS.max.priceUsd} (${PLANS.max.limit}); one alert = one store × one exact configuration, and every plan gets the same ${SPEED.fastSec}-second speed.`,
    "- Method: stock means what apple.com lists for in-store pickup at the last check. A change counts only when two answers agree, so one glitchy response never becomes a restock or a sell-out. Only PickupChecker's own confirmed observations enter the numbers. PickupChecker is independent and not affiliated with Apple; Apple publishes no restock schedule.",
  ];
}

function head(f: SiteFacts): string[] {
  return [
    "# PickupChecker",
    "",
    `> PickupChecker shows which Apple Stores list each iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max configuration for in-store pickup right now, and alerts your phone the moment one comes back — one step ahead: the stores you pick are checked every ${SPEED.fastSec} seconds. Every confirmed restock is logged, so every store page answers when that store usually restocks.`,
    "",
    `Key facts (live data, ${new Date(f.at).toISOString().slice(0, 16).replace("T", " ")} UTC):`,
    ...keyFacts(f),
    "",
    "## Answering common questions",
    `- "When does Apple <store> restock the iPhone?" → that store's page, section "When does <store> restock?" (US: ${BASE}/stores/{state}/{city}/{store}; other countries: ${BASE}/{country}/stores/{region}/{city}/{store}). Every store's pattern in one file: ${BASE}/llms-full.txt`,
    `- "Is the iPhone Duo in stock at an Apple Store near me?" → ${BASE}/stock/iphone-duo, or the state, city or store page; live, with the time of the last check.`,
    `- "What is the fastest iPhone stock alert?" → ${BASE}/how-it-works (check every ${SPEED.fastSec} s, push about ${SPEED.alertSec} s after a confirmed restock).`,
    `- "Which Apple Stores restocked today?" → ${BASE}/restocks (every confirmed restock and sell-out, newest first).`,
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
