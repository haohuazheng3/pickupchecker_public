import type { Metadata } from "next";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { Inline } from "@/components/content/Inline";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleName, catalogFor, storeByNumber, storePath } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, localStamp } from "@/lib/content/siteFacts";
import { duoRestockTimes, type RestockTimes } from "@/lib/content/restockTimes";
import { fmtPrice, listWords, plural } from "@/lib/seo/enrich";

export const dynamic = "force-dynamic";

const TITLE = "Which iPhone Duo Restocks Most? Storage & Color Odds";
const DESCRIPTION = "Every confirmed iPhone Duo restock at all 269 US Apple Stores by storage and color: which configuration comes back most, which least, and how many stores list each now.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} · PickupChecker` },
  description: DESCRIPTION,
  alternates: { canonical: "/which-iphone-duo-restocks-most" },
  openGraph: { type: "article", siteName: "PickupChecker", title: TITLE, description: DESCRIPTION, url: "/which-iphone-duo-restocks-most" },
};

const APPLE_DUO = "https://www.apple.com/shop/buy-iphone/iphone-duo";
const PICKUP = "https://www.apple.com/shop/shipping-pickup";
const WIKI_FOLDABLE = "https://en.wikipedia.org/wiki/Foldable_smartphone";
/** The other countries whose mix we compare, in the order the site lists them. */
const ABROAD: CountryCode[] = ["ca", "uk", "au", "jp"];

const n = (x: number) => x.toLocaleString("en-US");
/** Whole-percent shares; a share under half a percent reads "<1%", never a misleading "0%". */
const pct = (x: number) => (x > 0 && x < 0.005 ? "<1%" : `${Math.round(x * 100)}%`);
const points = (x: number) => `${Math.round(x * 100)} points`;
const LONG = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const longDate = (date: string) => LONG.format(new Date(`${date}T12:00:00Z`));
const ET = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function storeLink(storeNumber: string): string {
  const s = storeByNumber(storeNumber);
  return s ? `[${appleName(s)}](${storePath(s)})` : storeNumber;
}
/** "[Apple Fifth Avenue](…), Nov 2, 9:31 AM local time" for a restock. */
function lastLine(at: string | null, storeNumber: string | null): string {
  if (!at || !storeNumber) return "none yet";
  const s = storeByNumber(storeNumber);
  return s ? `${storeLink(storeNumber)}, ${localStamp(at, s)} local time` : `${ET.format(new Date(at))} ET`;
}
/** A country's most-restocked configuration (storage, color), or null before its first confirmed restock. */
function topAbroad(t: RestockTimes): { name: string; storage: string; restocks: number } | null {
  const p = t.byPart.find((x) => x.restocks > 0);
  const i = p ? PART_INDEX.get(p.partNumber) : undefined;
  return p && i ? { name: `${i.storage} ${i.color}`, storage: i.storage, restocks: p.restocks } : null;
}

export default async function WhichDuoRestocksMost() {
  const [t, facts, ...abroad] = await Promise.all([duoRestockTimes("us"), getFacts(), ...ABROAD.map((cc) => duoRestockTimes(cc))]);
  const duo = facts.models.duo;
  const have = t.n > 0 && !t.unknown;
  const since = longDate(t.since);
  const intlSince = longDate(TRACKING_SINCE_INTL);
  const items = catalogFor("duo");
  const storages = [...new Set(items.map((i) => i.storage))];
  const colors = [...new Set(items.map((i) => i.color))];
  const nowOf = (name: string): number | null => (duo && !duo.unknown ? duo.byConfig[name] ?? 0 : null);
  const nowText = (v: number | null) => (v == null ? "—" : n(v));

  // One row per configuration, most restocks first (byPart is zero-filled for all eight).
  const rows = t.byPart.flatMap((p) => {
    const item = items.find((i) => i.partNumber === p.partNumber) ?? PART_INDEX.get(p.partNumber);
    if (!item) return [];
    const name = `${item.storage} ${item.color}`;
    return [{ ...p, item, name, price: item.price, share: t.n ? p.restocks / t.n : 0, now: nowOf(name) }];
  });
  const most = rows[0];
  const fewest = rows.length ? rows[rows.length - 1] : undefined;
  const storageRows = storages.map((storage) => {
    const rs = rows.filter((r) => r.item.storage === storage);
    const restocks = rs.reduce((a, r) => a + r.restocks, 0);
    return { storage, restocks, share: t.n ? restocks / t.n : 0, price: rs[0]?.price ?? items.find((i) => i.storage === storage)?.price ?? 0, now: rs.reduce<number | null>((a, r) => (a == null || r.now == null ? null : a + r.now), 0) };
  });
  const colorRows = colors.map((color) => ({ color, restocks: rows.filter((r) => r.item.color === color).reduce((a, r) => a + r.restocks, 0) })).map((r) => ({ ...r, share: t.n ? r.restocks / t.n : 0 }));
  const storageSorted = [...storageRows].sort((a, b) => b.restocks - a.restocks);
  const colorSorted = [...colorRows].sort((a, b) => b.restocks - a.restocks);
  const storageGap = storageSorted.length ? storageSorted[0].share - storageSorted[storageSorted.length - 1].share : 0;
  const colorGap = colorSorted.length >= 2 ? colorSorted[0].share - colorSorted[colorSorted.length - 1].share : 0;
  const storageWins = storageGap >= colorGap;
  const leadStorage = storageSorted[0];
  const biggest = storages[storages.length - 1];
  const big = storageRows.find((r) => r.storage === biggest);
  const bigRows = rows.filter((r) => r.item.storage === biggest);
  const bigLast = bigRows.filter((r) => r.lastAt).sort((a, b) => (b.lastAt! > a.lastAt! ? 1 : -1))[0];
  const abroadRows = ABROAD.map((cc, i) => ({ cc, name: COUNTRIES[cc].name, t: abroad[i], top: topAbroad(abroad[i]) }));
  const abroadWithData = abroadRows.filter((r) => r.top);
  const sameStorage = abroadWithData.filter((r) => leadStorage && r.top!.storage === leadStorage.storage);
  const todayLine = t.today ? `${plural(t.today.restocks, "restock")} at ${plural(t.today.stores, "store")}` : "no count yet";

  const lead = have && most && fewest
    ? `${most.name} (${fmtPrice(most.price)}): ${n(most.restocks)} of the ${n(t.n)} iPhone Duo restocks PickupChecker has confirmed at US Apple Stores since ${since}, ${pct(most.share)} of them. ${fewest.name} has the fewest, ${n(fewest.restocks)} (${pct(fewest.share)}). Right now ${nowText(most.now)} of ${STORES.length} stores list the ${most.name} for pickup and ${nowText(fewest.now)} list the ${fewest.name}.`
    : `The configuration with the most confirmed restocks, the one with the fewest and how many stores list each right now. PickupChecker checks every configuration at all ${STORES.length} US Apple Stores every ${SPEED.checkSec} seconds; the ranking below fills in as restocks are confirmed.`;

  const mostBlocks: Block[] = [
    { t: "table", head: ["Configuration", "Price", `Restocks since ${since}`, "Share", "Last restock", "Stores with it now"], rows: rows.map((r) => [r.name, fmtPrice(r.price), n(r.restocks), pct(r.share), lastLine(r.lastAt, r.lastStore), `{{duo.cfg:${r.name}}}`]), caption: `All eight iPhone Duo configurations at the ${STORES.length} US Apple Stores, most restocks first`, source: `PickupChecker restock log; prices from [apple.com](${APPLE_DUO}), before sales tax` },
    { t: "p", text: `The iPhone Duo is Apple's first [foldable smartphone](${WIKI_FOLDABLE}), sold in ${storages.length} storage sizes and ${colors.length} colors, ${listWords(colors)}: eight configurations, each with its own pickup availability at each store. "Stores with it now" is live, the number of US stores listing that configuration for pickup at this moment, and it is usually small, because ${t.sellout ? `half of all Duo restocks were gone within ${n(t.sellout.medianSec)} seconds of appearing` : "most listings are gone within minutes"}.` },
    { t: "img", id: "foldable-hands" },
  ];

  const storageBlocks: Block[] = [
    { t: "table", head: ["Storage", "Price (either color)", "Restocks", "Share", "Stores with it now"], rows: storageRows.map((r) => [r.storage, fmtPrice(r.price), n(r.restocks), pct(r.share), nowText(r.now)]), caption: "By storage size", source: "PickupChecker restock log" },
    { t: "table", head: ["Color", "Restocks", "Share", "Stores with it now"], rows: colorRows.map((r) => [r.color, n(r.restocks), pct(r.share), `{{duo.color:${r.color}}}`]), caption: "By color", source: "PickupChecker restock log" },
    { t: "p", text: have
      ? `The honest reading: ${storageWins ? `storage is the lever. The gap between the most- and least-restocked size is ${points(storageGap)} of all restocks; between the two colors it is ${points(colorGap)}. Pick your storage for the odds and take whichever color comes` : `color is the lever this week. The gap between the two colors is ${points(colorGap)} of all restocks; between the most- and least-restocked size it is ${points(storageGap)}. Take ${colorSorted[0]?.color ?? "the leading color"} in the size you want`}. A configuration that restocks twice as often is one you will see twice as many pushes for.`
      : "The honest reading comes from the gaps: whichever of storage or color shows the wider spread between its best and worst option is the lever that changes your odds. The gaps fill in as restocks are confirmed." },
    { t: "img", id: "two-phones-sky" },
  ];
  const storageLead = have && storageSorted.length >= 2 && colorSorted.length >= 2
    ? `${storageWins ? "Storage" : "Color"} matters more. ${storageSorted[0].storage} has ${pct(storageSorted[0].share)} of all confirmed US restocks and ${storageSorted[storageSorted.length - 1].storage} ${pct(storageSorted[storageSorted.length - 1].share)}; ${colorSorted[0].color} has ${pct(colorSorted[0].share)} and ${colorSorted[1].color} ${pct(colorSorted[1].share)}.`
    : "Whichever shows the wider gap between its most- and least-restocked option; the sums by storage and by color below are computed from the same confirmed restocks.";

  const bigBlocks: Block[] = [
    { t: "ul", items: [
      `**Restocks since ${since}:** ${big ? `${n(big.restocks)} (${pct(big.share)} of all Duo restocks)` : "none confirmed yet"}${bigRows.length === 2 ? `, ${bigRows.map((r) => `${r.item.color} ${n(r.restocks)}`).join(" and ")}` : ""}.`,
      `**Last ${biggest} restock:** ${bigLast ? `${bigLast.name} at ${lastLine(bigLast.lastAt, bigLast.lastStore)}` : "none confirmed yet"}.`,
      `**Stores listing a ${biggest} right now:** {{duo.storage:${biggest}}} of ${STORES.length}.`,
      `**Price:** ${fmtPrice(items[items.length - 1].price)} in either color, ${fmtPrice(items[items.length - 1].price - items[0].price)} more than the ${storages[0]}.`,
    ] },
    { t: "p", text: `Our view: if you want the ${biggest}, set its alerts and also set the next size down. ${big && big.share > 0 ? `A ${pct(big.share)} share means roughly one Duo restock in ${Math.max(1, Math.round(1 / big.share))} is a ${biggest}` : `The ${biggest} is the thinnest slice of the mix`}; at a single store that can be days between chances. Live ${biggest} stock is on [the iPhone Duo stock page](/stock/iphone-duo), and the stores with one listed are on [iPhone Duo near me](/iphone-duo-near-me).` },
  ];
  const bigLead = have && big
    ? `Yes, but rarely: ${n(big.restocks)} confirmed ${biggest} restocks since ${since}, ${pct(big.share)} of all iPhone Duo restocks, and {{duo.storage:${biggest}}} US stores listing one right now.`
    : `Occasionally. The ${biggest} is the thinnest slice of the mix; its live count fills in as restocks are confirmed.`;

  const watchBlocks: Block[] = [
    { t: "ol", items: [
      `**Lead with the storage that restocks most${leadStorage && have ? ` (${leadStorage.storage})` : ""}.** It is where the pushes come from.`,
      "**Add the next size you would actually keep.** Not the one you would return; a reservation you cancel is a slot someone else lost.",
      "**Take both colors unless one is unbearable.** Color changes the odds less than storage does, and a case hides most of it.",
      `**Set them at two or three stores.** One alert is one store × one configuration, so three stores × three configurations is ${plural(9, "alert")}, inside Plus's ${PLANS.plus.limit} ([pricing](/pricing)).`,
    ] },
    { t: "p", text: `This is the whole reason the ranking exists: a configuration with ${most && have ? pct(most.share) : "the largest share"} of restocks will page you ${most && fewest && have && fewest.share > 0 ? `about ${Math.max(1, Math.round(most.share / fewest.share))}× as often as one at ${pct(fewest.share)}` : "far more often than the rarest one"}. Set the alerts on [the alert setup](/#notify); the stores you choose are then checked every ${SPEED.fastSec} seconds, and the push arrives about ${SPEED.alertSec} seconds after a restock is confirmed. How the alerts behave: [iPhone Duo stock alerts](/iphone-duo-stock-alerts).` },
    { t: "img", id: "phone-on-box" },
    { t: "cta", label: "Set up alerts for these configurations", href: "/#notify", sub: `Plus: $${PLANS.plus.priceUsd}/month for ${PLANS.plus.limit} alerts.` },
  ];

  const abroadBlocks: Block[] = [
    { t: "table", head: ["Country", "Most-restocked configuration", "Its restocks", "All Duo restocks", "Stores with a restock"], rows: abroadRows.map((r) => [`[${r.name}](/${r.cc}/iphone-duo-restock-times)`, r.top ? r.top.name : r.t.unknown ? "—" : "none confirmed yet", r.top ? n(r.top.restocks) : "—", n(r.t.n), `${n(r.t.stores)} of ${r.t.storesTotal}`]), caption: `Since ${intlSince}, each country's own Apple Stores and part numbers`, source: "PickupChecker restock log" },
    { t: "note", text: `Thin data: tracking outside the US began on ${intlSince}, so these are a few days of restocks, not a pattern. We call a country's favourite configuration a pattern only once it has enough restocks over enough days, the same rule as our hour-of-day patterns.`, tone: "warn" },
    ...(abroadWithData.length && leadStorage ? [{ t: "p", text: sameStorage.length === abroadWithData.length
      ? `So far the ranking is not a US quirk: ${listWords(abroadWithData.map((r) => r.name))} ${abroadWithData.length === 1 ? "leads" : "all lead"} with the same storage size as the US, the ${leadStorage.storage}. Each country's page has its own hour-of-day and day-by-day tables.`
      : `The mix already differs: ${listWords(abroadWithData.filter((r) => r.top!.storage !== leadStorage.storage).map((r) => `${r.name} (${r.top!.storage})`))} ${abroadWithData.length - sameStorage.length === 1 ? "leads" : "lead"} with a different storage size from the US's ${leadStorage.storage}. Each country's page has its own hour-of-day and day-by-day tables.` } as Block] : []),
  ];
  const abroadLead = abroadWithData.length
    ? `Early days, but so far ${abroadWithData.map((r) => `${r.name} leads with ${r.top!.name} (${plural(r.top!.restocks, "restock")})`).join(", ")}, all since ${intlSince}.`
    : `Too early to say: tracking outside the US began on ${intlSince}, and the table below fills in with each country's first confirmed restocks.`;

  const countBlocks: Block[] = [
    { t: "ul", items: [
      "**Two checks must agree.** A configuration counts as restocked only when apple.com lists it for pickup at that store on two checks in a row, about a second apart; a one-answer glitch is thrown away.",
      "**The first sighting is excluded.** The first time we ever see a store × configuration listed is not a restock; it is the start of its history.",
      `**Every US Apple Store, every configuration, since ${longDate(TRACKING_SINCE_US)}.** All ${STORES.length} stores every ${SPEED.checkSec} seconds, the stores with alerts every ${SPEED.fastSec}; other countries since ${intlSince}.`,
      "**Only our own observations.** Where a page shows restocks reported by other trackers, they are a separate, labelled series and never counted here.",
    ] },
    { t: "p", text: `The shares are of confirmed restocks, not of units: Apple shows pickup availability per store and configuration, never quantities ([Apple: Delivery and Pickup](${PICKUP})), so a restock of one phone and a restock of ten count the same. The check cycle is on [how PickupChecker works](/how-it-works); every restock behind these counts is in [the restock log](/restocks).` },
  ];

  const sections: { id: string; nav: string; h2: string; lead: string; blocks: Block[] }[] = [
    { id: "most", nav: "The ranking", h2: "Which iPhone Duo restocks most often?", lead: have && most ? `${most.name}, with ${n(most.restocks)} confirmed US restocks since ${since}${rows[1] ? `; ${rows[1].name} is second with ${n(rows[1].restocks)}` : ""}. The full table, with the last restock and the live store count for each configuration:` : "The ranking below is computed from every confirmed restock at every US Apple Store and fills in as they happen.", blocks: mostBlocks },
    { id: "storage-or-color", nav: "Storage vs color", h2: "Storage or color: which matters more?", lead: storageLead, blocks: storageBlocks },
    { id: "2tb", nav: `The ${biggest}`, h2: `Is the ${biggest} iPhone Duo ever in stock?`, lead: bigLead, blocks: bigBlocks },
    { id: "watch", nav: "What to watch", h2: "Which configuration should I watch?", lead: `Two or three you would actually keep, led by the storage that restocks most${leadStorage && have ? ` (${leadStorage.storage}, ${pct(leadStorage.share)} of restocks)` : ""}, at two or three stores. One alert is one store × one configuration, so the odds multiply.`, blocks: watchBlocks },
    { id: "countries", nav: "Other countries", h2: "Does the mix differ in other countries?", lead: abroadLead, blocks: abroadBlocks },
    { id: "counting", nav: "How we count", h2: "How does PickupChecker count a restock?", lead: `A restock is logged when two checks of apple.com, about a second apart, both list the configuration for pickup at that store; the very first sighting of a store × configuration is excluded, and the count runs from ${longDate(TRACKING_SINCE_US)}.`, blocks: countBlocks },
  ];

  const c0 = colors[0], c1 = colors[1] ?? colors[0];
  const s0 = storages[0], s1 = storages[1] ?? storages[0];
  const priceGap = fmtPrice((items.find((i) => i.storage === s1)?.price ?? 0) - items[0].price);
  const faq: Faq[] = [
    { q: `Is ${c1} or ${c0} easier to get?`, a: have && colorSorted.length === 2
      ? `${colorSorted[0].color}, slightly: ${n(colorSorted[0].restocks)} confirmed US restocks (${pct(colorSorted[0].share)}) to ${colorSorted[1].color}'s ${n(colorSorted[1].restocks)} (${pct(colorSorted[1].share)}) since ${since}. Right now {{duo.color:${colorSorted[0].color}}} stores list a ${colorSorted[0].color} and {{duo.color:${colorSorted[1].color}}} a ${colorSorted[1].color}. The gap is small enough that we would take either.`
      : `Neither by much, in our experience; the color table above shows the live gap. Right now {{duo.color:${c0}}} stores list a ${c0} and {{duo.color:${c1}}} a ${c1}.` },
    { q: `Does the ${s0} restock less than the ${s1}?`, a: have && storageRows.length >= 2
      ? `${storageRows[0].restocks < storageRows[1].restocks ? "Yes" : storageRows[0].restocks > storageRows[1].restocks ? "No, the other way round" : "They are level"}: ${n(storageRows[0].restocks)} confirmed ${s0} restocks (${pct(storageRows[0].share)}) to ${n(storageRows[1].restocks)} for the ${s1} (${pct(storageRows[1].share)}) since ${since}. The ${s1} costs ${priceGap} more.`
      : `The storage table above answers this live; the ${s1} costs ${priceGap} more than the ${s0}.` },
    { q: `Why does Apple seem to restock the ${leadStorage?.storage ?? s1} most?`, a: "We do not know, and we would distrust anyone who says they do. Apple does not publish its allocation by configuration; PickupChecker only counts what apple.com shows for pickup, store by store. The share on this page is an observation about restocks, not a statement about how many units Apple built." },
    { q: "Can I set an alert for several configurations at once?", a: `Yes. On [the alert setup](/#notify) you tick the configurations and the stores, and each store × configuration becomes one alert; Plus covers ${PLANS.plus.limit} of them for $${PLANS.plus.priceUsd} a month, Pro ${PLANS.pro.limit}, Max ${PLANS.max.limit}. Every alert's store is checked every ${SPEED.fastSec} seconds.` },
    { q: "Where do I see today's restocks?", a: `On [the restock log](/restocks), which lists every confirmed restock and sell-out with store, configuration and time; today so far: ${todayLine}. PickupChecker is independent and not affiliated with Apple.` },
  ];
  const sources: Source[] = [
    { label: "Apple: Buy iPhone Duo (configurations and prices)", url: APPLE_DUO },
    { label: "Apple: Delivery and Pickup (how pickup availability works)", url: PICKUP },
    { label: "Wikipedia: Foldable smartphone", url: WIKI_FOLDABLE },
  ];

  const site = "https://pickupchecker.com";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${site}/which-iphone-duo-restocks-most`, url: `${site}/which-iphone-duo-restocks-most`, name: TITLE, description: DESCRIPTION, isPartOf: { "@id": `${site}/#website` }, about: { "@id": `${site}/#organization` }, dateModified: t.at },
      {
        "@type": "Dataset", "@id": `${site}/which-iphone-duo-restocks-most#dataset`, name: "iPhone Duo restocks by configuration, US Apple Stores",
        description: `Confirmed in-store pickup restocks of each iPhone Duo storage and color at all ${STORES.length} US Apple Stores since ${longDate(TRACKING_SINCE_US)}, from PickupChecker's own checks.`,
        url: `${site}/which-iphone-duo-restocks-most`, creator: { "@id": `${site}/#organization` }, isAccessibleForFree: true,
        temporalCoverage: `${TRACKING_SINCE_US}/..`, spatialCoverage: "Apple Stores in the United States",
        variableMeasured: ["iPhone Duo storage and color", "confirmed restocks", "share of restocks", "last restock", "stores listing it now"],
        ...(have ? { size: `${t.n} restocks across ${rows.length} configurations` } : {}),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10">
      <JsonLd data={ld} />
      <h1 className="display text-3xl sm:text-5xl">Which iPhone Duo configuration is easiest to get?</h1>
      <p className="mt-4 text-lg text-ink-2">{lead}</p>
      <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2 text-sm">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.nav}</a>)}
      </nav>
      <div className="pane prose-site mt-8 p-6 sm:p-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-24">
            <h2>{s.h2}</h2>
            <p><b><Inline text={s.lead} facts={facts} /></b></p>
            {s.blocks.map((b, i) => <BlockView key={i} b={b} facts={facts} />)}
          </section>
        ))}
        <p className="mt-6 text-sm text-ink-3">
          Related: <Link href="/how-to-get-an-iphone-duo">how to get an iPhone Duo when it is sold out</Link> · <Link href="/iphone-duo-restock-times">when Apple restocks the iPhone Duo</Link> · <Link href="/iphone-duo-sell-out-times">how fast it sells out</Link>.
        </p>
      </div>
      <div className="mt-10"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mt-8"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} /></div>
    </div>
  );
}
