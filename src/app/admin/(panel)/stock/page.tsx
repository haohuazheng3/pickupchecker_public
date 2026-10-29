import { stockByModel, skuTable, storeFreshness, recentTransitions, eventBuckets } from "@/lib/admin/ops";
import { Section, Chip, Filters } from "@/components/admin/Status";
import { StackedBars, PALETTE } from "@/components/admin/Charts";
import { Table, timeAgo, ageMs } from "@/components/admin/Bits";

export default async function AdminStock({ searchParams }: PageProps<"/admin/stock">) {
  const sp = await searchParams;
  const kind = sp.kind === "restock" || sp.kind === "soldout" ? sp.kind : undefined;
  const [models, skus, fresh, trans, ev24] = await Promise.all([stockByModel(), skuTable(), storeFreshness(), recentTransitions(80, kind), eventBuckets(24, 3600)]);
  const stale = fresh.filter((f) => ageMs(f.last) > 30 * 60_000).sort((a, b) => (a.last ?? "").localeCompare(b.last ?? ""));
  const never = fresh.filter((f) => !f.last);
  return (
    <>
      <section className="grid gap-3 md:grid-cols-3">
        {models.map((m) => {
          const total = m.available + m.unavailable + m.unknown || 1;
          return (
            <div key={m.model.key} className="pane-2 p-4">
              <div className="flex items-baseline justify-between"><span className="font-semibold">{m.model.name}</span><span className="text-xs text-ink-3">{m.available + m.unavailable + m.unknown} rows</span></div>
              <div className="mt-3 flex h-2.5 gap-px overflow-hidden rounded-full"><span style={{ width: `${(m.available / total) * 100}%`, background: PALETTE.good }} /><span style={{ width: `${(m.unavailable / total) * 100}%` }} className="bg-white/15" /><span style={{ width: `${(m.unknown / total) * 100}%`, background: PALETTE.warning }} /></div>
              <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-ink-2"><span><b className="text-ink">{m.available}</b> available</span><span><b className="text-ink">{m.unavailable}</b> unavailable</span><span><b className={m.unknown ? "text-warn" : "text-ink"}>{m.unknown}</b> unknown</span></div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Transitions · last 24 h" aside="hourly">
          <StackedBars data={ev24} series={[{ key: "restocks", label: "restocks", color: PALETTE.blue }, { key: "soldouts", label: "sold out", color: PALETTE.orange }]} />
        </Section>
        <Section title="Freshness" aside={`${fresh.length} stores · stale = not confirmed in 30 min`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="pane-2 p-3"><div className="text-2xl font-semibold text-accent">{fresh.length - stale.length}</div><div className="text-xs text-ink-3">fresh</div></div>
            <div className="pane-2 p-3"><div className={`text-2xl font-semibold ${stale.length - never.length ? "text-warn" : ""}`}>{stale.length - never.length}</div><div className="text-xs text-ink-3">stale</div></div>
            <div className="pane-2 p-3"><div className={`text-2xl font-semibold ${never.length ? "text-bad" : ""}`}>{never.length}</div><div className="text-xs text-ink-3">never checked</div></div>
          </div>
          {stale.length > 0 && (
            <ul className="mt-3 max-h-48 overflow-auto text-xs text-ink-2">
              {stale.slice(0, 60).map((f) => <li key={f.store.storeNumber} className="flex justify-between py-0.5"><span>{f.store.name} <span className="text-ink-3">· {f.store.city}, {f.store.state}</span></span><span className={f.last ? "text-warn" : "text-bad"}>{f.last ? timeAgo(f.last) : "never"}</span></li>)}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-3">Stores that are never checked sit outside every anchor&apos;s 12-store radius: add an anchor ZIP in data/apple/coverage-plan.json.</p>
        </Section>
      </div>

      <Section title="Recent transitions">
        <Filters><Chip href="/admin/stock" on={!kind}>All</Chip><Chip href="/admin/stock?kind=restock" on={kind === "restock"}>Restocks</Chip><Chip href="/admin/stock?kind=soldout" on={kind === "soldout"}>Sold out</Chip></Filters>
        <Table head={["At", "Kind", "Item", "Store", "Quote", "Notified"]} rows={trans.map((t) => [timeAgo(t.at), <span key="k" className={t.kind === "restock" ? "text-accent" : "text-ink-3"}>{t.kind}</span>, t.item ? `${t.item.model} ${t.item.storage} ${t.item.color}` : t.partNumber, t.store ? `${t.store.name} · ${t.store.city}, ${t.store.state}` : t.storeNumber, t.quote, t.notifiedAt ? timeAgo(t.notifiedAt) : "—"])} />
      </Section>

      <Section title="Configurations" aside={`${skus.length} SKUs · stores listing each for pickup right now`}>
        <Table head={["Model", "Storage", "Color", "Part", "Stores available", "Unknown", "Last seen available"]} rows={skus.map((s) => [s.item!.model, s.item!.storage, s.item!.color, <code key="p" className="text-xs">{s.partNumber}</code>, <span key="a" className={s.available ? "text-accent" : "text-ink-3"}>{s.available} / {s.tracked}</span>, s.unknown, s.lastAvailableAt ? timeAgo(s.lastAvailableAt) : "never"])} />
      </Section>
    </>
  );
}
