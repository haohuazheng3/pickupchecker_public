import type { Metadata } from "next";
import { PAID_PLANS, PLANS, SPEED, type PaidPlanKey } from "@/lib/plans";
import { siteFacts } from "@/lib/content/siteFacts";
import { PLANNED_SEC, serviceStats, secs } from "@/lib/content/serviceStats";
import { medianBand } from "@/lib/stock/sellouts";
import { PlanButton } from "@/components/site/PlanButton";
import { Chips, Points, Stat, StatGrid } from "@/components/ui/Viz";
import { Md } from "@/components/i18n/Md";
import { requestLocale, setPageLocale, t } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";
import { LANG_TAG, num, unit } from "@/lib/i18n/format";
import type { Lang } from "@/lib/i18n/locales";

/** An app page: the person's language. Plans are billed in US dollars everywhere. */
export async function generateMetadata(): Promise<Metadata> {
  const d = dict((await requestLocale()).lang).account.pricing;
  return { title: d.metaTitle, description: d.metaDescription, alternates: { canonical: "/pricing" } };
}

export const dynamic = "force-dynamic";

/** The alerts table's axes: configurations down, stores across (PLANS decides each cell). */
const CONFIGS = [1, 2, 3, 5];
const STORES = [1, 5, 10, 20];
/** The smallest paid plan that holds n alerts, or null past the largest. */
const planFor = (n: number): PaidPlanKey | null => PAID_PLANS.find((k) => PLANS[k].limit >= n) ?? null;

/** A measured interval as the language writes it: "5.0 s" in English (serviceStats.secs), "5,1 Sek." in German. */
const fmtSec = (lang: Lang, s: number) => (lang === "en" ? secs(s) : unit(lang, s < 10 ? Math.round(s * 10) / 10 : Math.round(s), "s"));
/** The same number without its unit, for a tile ("5.0"). */
const fmtNum = (lang: Lang, s: number) => new Intl.NumberFormat(LANG_TAG[lang], s < 10 ? { minimumFractionDigits: 1, maximumFractionDigits: 1 } : { maximumFractionDigits: 0 }).format(s);

export default async function Pricing() {
  const loc = await requestLocale();
  setPageLocale(loc);
  const lang = loc.lang;
  const d = t().account.pricing, u = t().account.units;
  const [facts, ss] = await Promise.all([siteFacts(), serviceStats()]);
  const ds = facts.duoSellout;
  // Measured on the same basis as the plan (content/serviceStats.ts): the US fast lane and alert delivery, last 7 days.
  const us = ss.lanes["7d"]["fast-us"];
  const intl = ss.lanes["7d"]["fast-intl"];
  const push = ss.delivery["7d"].push;
  const band = ds ? d.band(medianBand(ds.medianSec).replace(/ seconds$/, "")) : d.aboutMinute;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">{d.title}</h1>
      <p className="mt-3 text-lg text-ink-2"><Md text={d.lead} tag="b" b="text-ink" /></p>
      <Chips className="mt-3" items={d.chips} />

      {/* Planned, then measured — the same lanes for every plan, never a "fastest" claim (2026-11-09). */}
      <section className="pane mt-6 grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-start" aria-labelledby="speed">
        <div className="min-w-0">
          <h2 id="speed" className="text-lg font-semibold">{d.speedTitle}</h2>
          <p className="mt-2 text-ink-2"><Md text={us ? d.speedAnswer({ p50: fmtSec(lang, us.p50Sec), p95: fmtSec(lang, us.p95Sec) }) : d.speedPlanned} tag="b" b="text-ink" /></p>
          <Points className="mt-3" items={[
            { text: <Md text={d.planned} tag="b" b="text-ink" /> },
            ...(intl ? [{ text: <Md text={d.intl({ p50: fmtSec(lang, intl.p50Sec), p95: fmtSec(lang, intl.p95Sec), above: intl.p50Sec > PLANNED_SEC["fast-intl"] + 0.5 })} tag="b" b="text-ink" />, no: intl.p50Sec > PLANNED_SEC["fast-intl"] + 0.5 }] : []),
            { text: push ? <Md text={d.push({ p50: fmtSec(lang, push.p50Sec), p90: fmtSec(lang, push.p90Sec), n: num(lang, push.events) })} tag="b" b="text-ink" /> : <>{d.pushPending}</> },
            { text: <>{d.notMeasured}</>, no: true },
            ...(ds ? [{ text: <Md text={d.listingLine(band, num(lang, ds.n))} tag="b" b="text-ink" />, step: true }] : []),
            { text: <Md text={d.report} a="underline underline-offset-4" />, step: true },
          ]} />
        </div>
        <StatGrid cols={3} className="lg:min-w-[26rem]">
          {us
            ? <Stat value={fmtNum(lang, us.p50Sec)} unit={u.s} label={d.gapTile} tone="accent" />
            : <Stat value={`${SPEED.fastSec}`} unit={u.s} label={d.plannedTile} tone="accent" />}
          {push
            ? <Stat value={fmtNum(lang, push.p50Sec)} unit={u.s} label={d.pushTile} tone="accent" />
            : <Stat value="—" label={d.pushTilePending} tone="muted" />}
          {ds
            ? <Stat value={num(lang, ds.medianSec)} unit={u.s} label={`${d.listing} (n = ${num(lang, ds.n)})`} tone="warn" />
            : <Stat value="—" label={d.listing} tone="muted" />}
        </StatGrid>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PAID_PLANS.map((k) => {
          const plan = PLANS[k];
          return (
            <div key={k} className={`pane flex flex-col p-6 ${k === "plus" ? "border-accent/40" : ""}`}>
              <div className="flex items-center justify-between"><div className="text-lg font-semibold">{plan.name}</div><span className="text-xs text-ink-3">{d.note[k]}</span></div>
              <div className="mt-3 flex items-baseline gap-2"><span className="display text-5xl">${plan.priceUsd}</span><span className="text-ink-3">{d.month}</span></div>
              <div className="mt-2 text-2xl font-semibold">{d.alerts(plan.limit)}</div>
              <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                {d.perks.map((p) => <li key={p} className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{p}</li>)}
                <li className="flex gap-2"><span className="text-accent" aria-hidden>✓</span>{d.cancel}</li>
              </ul>
              <div className="flex-1" />
              <PlanButton plan={k} label={d.get(plan.name)} primary={k === "plus"} />
            </div>
          );
        })}
      </div>

      {/* Who does not need to pay, who does: honest before it is persuasive. */}
      <section className="mt-10" aria-labelledby="need">
        <h2 id="need" className="display text-2xl sm:text-3xl">{d.needTitle}</h2>
        <p className="mt-2 max-w-3xl text-ink-2">{d.needAnswer}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="pane-2 p-5">
            <h3 className="font-semibold">{d.skipTitle}</h3>
            <Points className="mt-3" items={d.skip.map((x) => ({ text: <Md text={x} />, plain: x }))} />
          </div>
          <div className="pane-2 p-5">
            <h3 className="font-semibold">{d.helpsTitle}</h3>
            <Points className="mt-3" items={d.helps.map((x) => ({ text: <Md text={x} />, plain: x }))} />
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-2"><Md text={d.tool} /></p>
      </section>

      {/* Configurations × stores → the plan that holds it, straight from PLANS. */}
      <section className="mt-10" aria-labelledby="how-many">
        <h2 id="how-many" className="display text-2xl sm:text-3xl">{d.tableTitle}</h2>
        <p className="mt-2 max-w-3xl text-ink-2">{d.tableAnswer({ limit: PLANS.plus.limit, price: PLANS.plus.priceUsd }, { limit: PLANS.pro.limit, price: PLANS.pro.priceUsd }, { limit: PLANS.max.limit, price: PLANS.max.priceUsd })}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[20rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th scope="col" className="border-b border-line px-2 py-2 text-start text-xs font-medium text-ink-3">{d.corner}</th>
                {STORES.map((s) => <th key={s} scope="col" className="border-b border-line px-2 py-2 text-start font-semibold">{d.storesN(s)}</th>)}
              </tr>
            </thead>
            <tbody>
              {CONFIGS.map((c) => (
                <tr key={c}>
                  <th scope="row" className="border-b border-line px-2 py-2 text-start font-semibold">{d.configsN(c)}</th>
                  {STORES.map((s) => {
                    const n = c * s, k = planFor(n);
                    return (
                      <td key={s} className={`border-b border-line px-2 py-2 align-top ${k === "plus" ? "bg-accent/8" : ""}`}>
                        {k ? <><span className="font-semibold">{PLANS[k].name}</span> <span className="tabular-nums">${PLANS[k].priceUsd}</span></> : <span className="text-ink-3">{d.noPlan}</span>}
                        <span className="block text-xs tabular-nums text-ink-3">{d.alerts(n)}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">{d.tableNote}</p>
      </section>

      <Points className="mt-8" items={[
        { text: <>{d.billing}</> },
        { text: <Md text={d.refund} a="underline" /> },
      ]} />
    </div>
  );
}
