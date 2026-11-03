/**
 * /which-iphone-duo-restocks-most: the eight configurations ranked by confirmed restocks, shown as tiles, tables and
 * keyword lines. Each H2 is a question with one answer-first sentence; the numbers are live from the restock log.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PendingLink as Link } from "@/components/ui/PendingLink";
import { BlockView } from "@/components/content/Blocks";
import { Inline } from "@/components/content/Inline";
import { Figure } from "@/components/content/Figure";
import { RichFaq, SourceList } from "@/components/content/RichFaq";
import { JsonLd } from "@/components/seo/JsonLd";
import { getFacts, type Facts } from "@/lib/content/facts";
import type { Block, Faq, Source } from "@/lib/content/types";
import { PART_INDEX, STORES, appleName, catalogFor, storeByNumber, storePath } from "@/lib/apple/catalog";
import { COUNTRIES, type CountryCode } from "@/lib/apple/countries";
import { PLANS, SPEED } from "@/lib/plans";
import { TRACKING_SINCE_INTL, TRACKING_SINCE_US, localStamp } from "@/lib/content/siteFacts";
import { duoRestockTimes, type RestockTimes } from "@/lib/content/restockTimes";
import { fmtPrice, listWords, plural } from "@/lib/seo/enrich";
import { Measured, Points, Stat, StatGrid, StepStrip } from "@/components/ui/Viz";

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

/** A question, its one-sentence answer, then the UI. */
function Section({ id, h2, lead, facts, children }: { id: string; h2: string; lead: string; facts: Facts; children: ReactNode }) {
  return (
    <section id={id} className="pane scroll-mt-24 p-5 sm:p-7">
      <h2 className="display text-2xl sm:text-3xl">{h2}</h2>
      <p className="mt-3 text-base text-ink-2 sm:text-lg"><Inline text={lead} facts={facts} /></p>
      {children}
    </section>
  );
}
/** Where to go next: a row of chip links. */
function LinkRow({ links, className = "mt-4" }: { links: { label: string; href: string }[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((l) => l.href.startsWith("http") ? <a key={l.href} href={l.href} target="_blank" rel="noopener" className="chip chip-sm">{l.label}</a> : <Link key={l.href} href={l.href} className="chip chip-sm">{l.label}</Link>)}
    </div>
  );
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
  const ratio = most && fewest && have && fewest.share > 0 ? Math.max(1, Math.round(most.share / fewest.share)) : null;
  const oneIn = big && big.share > 0 ? Math.max(1, Math.round(1 / big.share)) : null;

  const rankTable: Block = { t: "table", head: ["Configuration", "Price", `Restocks since ${since}`, "Share", "Last restock", "Stores with it now"], rows: rows.map((r) => [r.name, fmtPrice(r.price), n(r.restocks), pct(r.share), lastLine(r.lastAt, r.lastStore), `{{duo.cfg:${r.name}}}`]), caption: `All eight iPhone Duo configurations at the ${STORES.length} US Apple Stores, most restocks first`, source: `PickupChecker restock log; prices from [apple.com](${APPLE_DUO}), before sales tax` };
  const storageTable: Block = { t: "table", head: ["Storage", "Price (either color)", "Restocks", "Share", "Stores with it now"], rows: storageRows.map((r) => [r.storage, fmtPrice(r.price), n(r.restocks), pct(r.share), nowText(r.now)]), caption: "By storage size", source: "PickupChecker restock log" };
  const colorTable: Block = { t: "table", head: ["Color", "Restocks", "Share", "Stores with it now"], rows: colorRows.map((r) => [r.color, n(r.restocks), pct(r.share), `{{duo.color:${r.color}}}`]), caption: "By color", source: "PickupChecker restock log" };
  const abroadTable: Block = { t: "table", head: ["Country", "Most-restocked configuration", "Its restocks", "All Duo restocks", "Stores with a restock"], rows: abroadRows.map((r) => [`[${r.name}](/${r.cc}/iphone-duo-restock-times)`, r.top ? r.top.name : r.t.unknown ? "—" : "none confirmed yet", r.top ? n(r.top.restocks) : "—", n(r.t.n), `${n(r.t.stores)} of ${r.t.storesTotal}`]), caption: `Since ${intlSince}, each country's own Apple Stores and part numbers`, source: "PickupChecker restock log" };

  const mostLead = have && most
    ? `**${most.name}**, with **${n(most.restocks)}** confirmed US restocks since ${since}${rows[1] ? `; ${rows[1].name} is second with ${n(rows[1].restocks)}` : ""}.`
    : "The ranking below is computed from every confirmed restock at every US Apple Store and fills in as they happen.";
  const storageLead = have && storageSorted.length >= 2 && colorSorted.length >= 2
    ? `**${storageWins ? "Storage" : "Color"} matters more**: ${storageSorted[0].storage} has **${pct(storageSorted[0].share)}** of confirmed US restocks and ${storageSorted[storageSorted.length - 1].storage} ${pct(storageSorted[storageSorted.length - 1].share)}; ${colorSorted[0].color} has **${pct(colorSorted[0].share)}** and ${colorSorted[1].color} ${pct(colorSorted[1].share)}.`
    : "Whichever shows the wider gap between its most- and least-restocked option; the sums by storage and by color below come from the same confirmed restocks.";
  const bigLead = have && big
    ? `Yes, but rarely: **${n(big.restocks)}** confirmed ${biggest} restocks since ${since}, **${pct(big.share)}** of all iPhone Duo restocks, and {{duo.storage:${biggest}}} US stores listing one right now.`
    : `Occasionally: the ${biggest} is the thinnest slice of the mix, and its live count fills in as restocks are confirmed.`;
  const watchLead = `Two or three you would actually keep, led by the storage that restocks most${leadStorage && have ? ` (**${leadStorage.storage}**, ${pct(leadStorage.share)} of restocks)` : ""}, at two or three stores: one alert is one store × one configuration, so the odds multiply.`;
  const abroadLead = abroadWithData.length
    ? `Early days, but so far ${abroadWithData.map((r) => `**${r.name}** leads with ${r.top!.name} (${plural(r.top!.restocks, "restock")})`).join(", ")}, all since ${intlSince}.`
    : `Too early to say: tracking outside the US began on ${intlSince}, and the table below fills in with each country's first confirmed restocks.`;
  const countLead = `A restock is logged when **two checks** of apple.com, about a second apart, both list the configuration for pickup at that store; the first sighting of a store × configuration is excluded, and the count runs from ${longDate(TRACKING_SINCE_US)}.`;

  const nav = [
    { id: "most", label: "The ranking" },
    { id: "storage-or-color", label: "Storage vs color" },
    { id: "2tb", label: `The ${biggest}` },
    { id: "watch", label: "What to watch" },
    { id: "countries", label: "Other countries" },
    { id: "counting", label: "How we count" },
  ];

  const c0 = colors[0], c1 = colors[1] ?? colors[0];
  const s0 = storages[0], s1 = storages[1] ?? storages[0];
  const priceGap = fmtPrice((items.find((i) => i.storage === s1)?.price ?? 0) - items[0].price);
  const faq: Faq[] = [
    { q: `Is ${c1} or ${c0} easier to get?`, a: have && colorSorted.length === 2
      ? `${colorSorted[0].color}, slightly: ${n(colorSorted[0].restocks)} confirmed US restocks (${pct(colorSorted[0].share)}) to ${colorSorted[1].color}'s ${n(colorSorted[1].restocks)} (${pct(colorSorted[1].share)}) since ${since}, and right now {{duo.color:${colorSorted[0].color}}} stores list a ${colorSorted[0].color} and {{duo.color:${colorSorted[1].color}}} a ${colorSorted[1].color}. The gap is small enough that we would take either.`
      : `Neither by much, in our experience; right now {{duo.color:${c0}}} stores list a ${c0} and {{duo.color:${c1}}} a ${c1}.` },
    { q: `Does the ${s0} restock less than the ${s1}?`, a: have && storageRows.length >= 2
      ? `${storageRows[0].restocks < storageRows[1].restocks ? "Yes" : storageRows[0].restocks > storageRows[1].restocks ? "No, the other way round" : "They are level"}: ${n(storageRows[0].restocks)} confirmed ${s0} restocks (${pct(storageRows[0].share)}) to ${n(storageRows[1].restocks)} for the ${s1} (${pct(storageRows[1].share)}) since ${since}. The ${s1} costs ${priceGap} more.`
      : `The storage table above answers this live; the ${s1} costs ${priceGap} more than the ${s0}.` },
    { q: `Why does Apple seem to restock the ${leadStorage?.storage ?? s1} most?`, a: "We do not know, and we would distrust anyone who says they do: Apple does not publish its allocation by configuration, and PickupChecker only counts what apple.com shows for pickup, store by store. The share on this page is an observation about restocks, not a statement about how many units Apple built." },
    { q: "Can I set an alert for several configurations at once?", a: `Yes: on [the alert setup](/#notify) you tick the configurations and the stores, each store × configuration becomes one alert, and every alert's store is checked every ${SPEED.fastSec} seconds. Plus covers ${PLANS.plus.limit} of them for $${PLANS.plus.priceUsd} a month, Pro ${PLANS.pro.limit}, Max ${PLANS.max.limit}.` },
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
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:pt-12">
      <JsonLd data={ld} />

      {/* hero */}
      <section className="grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="eyebrow mb-4">iPhone Duo · all eight configurations</div>
          <h1 className="display text-4xl sm:text-6xl">Which iPhone Duo configuration is easiest to get?</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2">
            {have && most && fewest
              ? <><b className="text-ink">{most.name}</b> ({fmtPrice(most.price)}): <b className="text-ink">{pct(most.share)}</b> of the {n(t.n)} iPhone Duo restocks confirmed at US Apple Stores since {since}; {fewest.name} has the fewest at {pct(fewest.share)}.</>
              : <>The configuration with the most confirmed restocks, the one with the fewest and how many stores list each right now; PickupChecker checks every configuration at all {STORES.length} US Apple Stores every {SPEED.checkSec} seconds.</>}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/#notify" className="btn btn-primary btn-lg">Set up alerts</Link>
            <Link href="/stock/iphone-duo" className="btn btn-ghost btn-lg">Live Duo stock</Link>
          </div>
        </div>
        <StatGrid cols={2}>
          <Stat value={most ? n(most.restocks) : "—"} label={most ? <>{most.name} · most restocks since {since}</> : "most-restocked configuration"} tone="accent" />
          <Stat value={fewest ? n(fewest.restocks) : "—"} label={fewest ? <>{fewest.name} · fewest restocks</> : "least-restocked configuration"} tone="muted" />
          <Stat value={most ? nowText(most.now) : "—"} label={most ? <>of {STORES.length} US stores list the {most.name} now</> : "stores listing it now"} live={!!most && most.now != null} />
          <Stat value={fewest ? nowText(fewest.now) : "—"} label={fewest ? <>list the {fewest.name} now</> : "stores listing it now"} tone="muted" />
        </StatGrid>
      </section>

      <nav aria-label="On this page" className="mt-8 flex flex-wrap gap-2 text-sm">
        {nav.map((s) => <a key={s.id} href={`#${s.id}`} className="chip px-3 py-1.5 text-xs">{s.label}</a>)}
      </nav>

      <div className="mt-6 grid gap-5">
        {/* ranking */}
        <Section id="most" h2="Which iPhone Duo restocks most often?" lead={mostLead} facts={facts}>
          <BlockView b={rankTable} facts={facts} />
          <Points items={[
            { text: <Inline text={`Apple's first [foldable smartphone](${WIKI_FOLDABLE}) · ${storages.length} storage sizes × ${colors.length} colors (${listWords(colors)}) = **eight configurations**`} facts={facts} /> },
            { text: <>Each configuration has its own pickup availability at each store</> },
            { text: t.sellout ? <>&quot;Stores with it now&quot; is live and usually small: half of all Duo restocks were gone within <b className="text-ink">{n(t.sellout.medianSec)} seconds</b></> : <>&quot;Stores with it now&quot; is live and usually small: most listings are gone within minutes</>, no: true },
          ]} />
          <Figure id="foldable-hands" />
        </Section>

        {/* storage vs color */}
        <Section id="storage-or-color" h2="Storage or color: which matters more?" lead={storageLead} facts={facts}>
          <StatGrid cols={2} className="mt-5">
            <Stat value={have ? points(storageGap) : "—"} label="gap between the most- and least-restocked storage size, share of all restocks" tone={storageWins ? "accent" : "plain"} />
            <Stat value={have ? points(colorGap) : "—"} label="gap between the two colors" tone={storageWins ? "plain" : "accent"} />
          </StatGrid>
          <BlockView b={storageTable} facts={facts} />
          <BlockView b={colorTable} facts={facts} />
          <Points items={have ? [
            { text: storageWins ? <><b className="text-ink">Storage is the lever</b>: pick your storage for the odds, take whichever color comes</> : <><b className="text-ink">Color is the lever this week</b>: take {colorSorted[0]?.color ?? "the leading color"} in the size you want</> },
            { text: <>A configuration that restocks twice as often is one you see <b className="text-ink">twice as many pushes</b> for</>, step: true },
          ] : [
            { text: <>Whichever of storage or color shows the wider spread is the lever that changes your odds</> },
            { text: <>The gaps fill in as restocks are confirmed</>, step: true },
          ]} />
          <Figure id="two-phones-sky" />
        </Section>

        {/* the biggest size */}
        <Section id="2tb" h2={`Is the ${biggest} iPhone Duo ever in stock?`} lead={bigLead} facts={facts}>
          <StatGrid cols={4} className="mt-5">
            <Stat value={big ? n(big.restocks) : "—"} label={<>{biggest} restocks since {since}{big && have ? <> · {pct(big.share)} of all Duo restocks</> : null}</>} tone="accent" />
            <Stat value={<Inline text={`{{duo.storage:${biggest}}}`} facts={facts} />} label={<>of {STORES.length} US stores list a {biggest} right now</>} live />
            {bigRows.length === 2
              ? <Stat value={<>{n(bigRows[0].restocks)}<span className="text-base text-ink-3"> / </span>{n(bigRows[1].restocks)}</>} label={<>{bigRows[0].item.color} / {bigRows[1].item.color}</>} tone="muted" />
              : <Stat value="—" label="split by color" tone="muted" />}
            <Stat value={fmtPrice(items[items.length - 1].price)} label={<>either color · {fmtPrice(items[items.length - 1].price - items[0].price)} more than the {storages[0]}</>} />
          </StatGrid>
          <Points className="mt-5" items={[
            { text: <Inline text={`**Last ${biggest} restock:** ${bigLast ? `${bigLast.name} at ${lastLine(bigLast.lastAt, bigLast.lastStore)}` : "none confirmed yet"}`} facts={facts} /> },
            { text: <>Set the {biggest} alerts <b className="text-ink">and the next size down</b></> },
            { text: oneIn ? <>A {pct(big!.share)} share ≈ one Duo restock in <b className="text-ink">{oneIn}</b> is a {biggest}; at a single store that can be days between chances</> : <>The {biggest} is the thinnest slice of the mix; at a single store that can be days between chances</>, no: true },
          ]} />
          <LinkRow links={[{ label: `Live ${biggest} stock`, href: "/stock/iphone-duo" }, { label: "Stores with one listed near you", href: "/iphone-duo-near-me" }]} />
        </Section>

        {/* what to watch */}
        <Section id="watch" h2="Which configuration should I watch?" lead={watchLead} facts={facts}>
          <StepStrip className="mt-5" steps={[
            { title: <>Lead with {leadStorage && have ? leadStorage.storage : "the storage that restocks most"}</>, hint: "it is where the pushes come from" },
            { title: "Add the next size you would keep", hint: "not one you would return; a cancelled reservation is a slot someone else lost" },
            { title: "Take both colors", hint: "color changes the odds less than storage, and a case hides most of it" },
            { title: "Two or three stores", hint: <Inline text={`3 stores × 3 configurations = ${plural(9, "alert")}, inside Plus's ${PLANS.plus.limit} ([pricing](/pricing))`} facts={facts} /> },
          ]} />
          <StatGrid cols={3} className="mt-6">
            <Stat value={ratio ? `${ratio}×` : "—"} label={ratio && most && fewest ? <>as many pushes for {most.name} ({pct(most.share)}) as for {fewest.name} ({pct(fewest.share)})</> : "pushes for the most- vs least-restocked configuration"} tone="accent" />
            <Stat value={`${SPEED.fastSec}`} unit="s" label="between checks at the stores your alerts point at" />
            <Stat value={`~${SPEED.alertSec}`} unit="s" label="confirmed restock to the push on your phone" />
          </StatGrid>
          <LinkRow links={[{ label: "Set the alerts", href: "/#notify" }, { label: "How the alerts behave", href: "/iphone-duo-stock-alerts" }]} />
          <Figure id="phone-on-box" />
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/#notify" className="btn btn-primary">Set up alerts for these configurations</Link>
            <span className="text-sm text-ink-3">Plus: ${PLANS.plus.priceUsd}/month for {PLANS.plus.limit} alerts.</span>
          </div>
        </Section>

        {/* other countries */}
        <Section id="countries" h2="Does the mix differ in other countries?" lead={abroadLead} facts={facts}>
          <BlockView b={abroadTable} facts={facts} />
          {abroadWithData.length > 0 && leadStorage && (
            <Points items={[
              sameStorage.length === abroadWithData.length
                ? { text: <>Not a US quirk so far: <b className="text-ink">{listWords(abroadWithData.map((r) => r.name))}</b> {abroadWithData.length === 1 ? "leads" : "all lead"} with the same storage size, the {leadStorage.storage}</> }
                : { text: <>The mix already differs: <b className="text-ink">{listWords(abroadWithData.filter((r) => r.top!.storage !== leadStorage.storage).map((r) => `${r.name} (${r.top!.storage})`))}</b> {abroadWithData.length - sameStorage.length === 1 ? "leads" : "lead"} with a different size from the US&apos;s {leadStorage.storage}</> },
              { text: <>Each country&apos;s page has its own hour-of-day and day-by-day tables</>, step: true },
            ]} />
          )}
          <Measured title="Thin data">
            Tracking outside the US began on {intlSince}, so these are a few days of restocks, not a pattern. We call a country&apos;s favourite configuration a pattern only once it has enough restocks over enough days, the same rule as our hour-of-day patterns.
          </Measured>
        </Section>

        {/* how we count */}
        <Section id="counting" h2="How does PickupChecker count a restock?" lead={countLead} facts={facts}>
          <Points className="mt-5" size="base" items={[
            { text: <><b className="text-ink">Two checks must agree</b> · about a second apart · a one-answer glitch is thrown away</> },
            { text: <><b className="text-ink">The first sighting is excluded</b> · it is the start of a store × configuration&apos;s history, not a restock</> },
            { text: <><b className="text-ink">All {STORES.length} US stores every {SPEED.checkSec} seconds</b> · stores with alerts every {SPEED.fastSec} · since {longDate(TRACKING_SINCE_US)}, other countries since {intlSince}</> },
            { text: <><b className="text-ink">Only our own observations</b> · other trackers&apos; reports are a separate, labelled series, never counted here</> },
            { text: <Inline text={`Shares are of restocks, not of units: Apple shows availability, never quantities ([Apple: Delivery and Pickup](${PICKUP})), so one phone and ten count the same`} facts={facts} />, no: true },
          ]} />
          <LinkRow links={[{ label: "The check cycle: how PickupChecker works", href: "/how-it-works" }, { label: "Every restock behind these counts", href: "/restocks" }, { label: "How to get an iPhone Duo when it is sold out", href: "/how-to-get-an-iphone-duo" }, { label: "When Apple restocks the iPhone Duo", href: "/iphone-duo-restock-times" }, { label: "How fast it sells out", href: "/iphone-duo-sell-out-times" }]} />
        </Section>
      </div>

      <div className="mx-auto mt-10 max-w-3xl"><RichFaq items={faq} facts={facts} title="Questions" /></div>
      <div className="mx-auto mt-8 max-w-3xl"><SourceList sources={sources} facts={facts} where={`all ${STORES.length} US Apple Stores`} /></div>
    </div>
  );
}
