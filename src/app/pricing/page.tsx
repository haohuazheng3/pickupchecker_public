import type { Metadata } from "next";
import { PAID_PLANS, PLANS, SPEED } from "@/lib/plans";
import { siteFacts } from "@/lib/content/siteFacts";
import { medianBand } from "@/lib/stock/sellouts";
import { PlanButton } from "@/components/site/PlanButton";
import { Chips, Points, Stat, StatGrid } from "@/components/ui/Viz";
import { Md } from "@/components/i18n/Md";
import { requestLocale, setPageLocale, t } from "@/lib/i18n/server";
import { dict } from "@/lib/i18n/dict";

/** An app page: the person's language. Plans are billed in US dollars everywhere. */
export async function generateMetadata(): Promise<Metadata> {
  const d = dict((await requestLocale()).lang).account.pricing;
  return { title: d.metaTitle, description: d.metaDescription, alternates: { canonical: "/pricing" } };
}

export const dynamic = "force-dynamic";

export default async function Pricing() {
  setPageLocale(await requestLocale());
  const d = t().account.pricing, u = t().account.units;
  const ds = (await siteFacts()).duoSellout;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <h1 className="display text-3xl sm:text-5xl">{d.title}</h1>
      <p className="mt-3 text-lg text-ink-2"><Md text={d.lead} tag="b" b="text-ink" /></p>
      <Chips className="mt-3" items={d.chips} />

      <div className="pane mt-6 grid gap-5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="font-semibold">{d.fastest}</div>
          <Points className="mt-3" items={[
            { text: <Md text={d.everyFast} tag="b" b="text-ink" /> },
            // medianBand: "60–80 seconds"; the range is the language's to word.
            { text: <Md text={d.sellsOut(ds ? d.band(medianBand(ds.medianSec).replace(/ seconds$/, "")) : d.aboutMinute)} tag="b" b="text-ink" />, no: true },
            { text: <>{d.sameSpeed}</>, step: true },
          ]} />
        </div>
        <StatGrid cols={3} className="lg:min-w-[26rem]">
          <Stat value={`${SPEED.fastSec}`} unit={u.s} label={d.rechecked} tone="accent" />
          <Stat value={`~${SPEED.alertSec}`} unit={u.s} label={d.toPhone} tone="accent" />
          <Stat value={ds ? `${ds.medianSec}` : "~60"} unit={u.s} label={d.listing} tone="warn" />
        </StatGrid>
      </div>

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
      <Points className="mt-6" items={[
        { text: <>{d.billing}</> },
        { text: <Md text={d.refund} a="underline" /> },
      ]} />
    </div>
  );
}
