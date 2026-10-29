import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORES, statesWithStores, stateSlug, MODELS } from "@/lib/apple/catalog";
import { stockByStore } from "@/lib/stock/queries";
import { Dot, timeAgo } from "@/components/stock/StatusBits";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return statesWithStores().map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]">): Promise<Metadata> {
  const { state } = await params;
  const s = statesWithStores().find((x) => x.slug === state);
  if (!s) return {};
  return {
    title: `Apple Stores in ${s.name} — iPhone 18 Pro & Pro Max pickup stock`,
    description: `Live in-store pickup availability for iPhone 18 Pro, Pro Max and iPhone Duo at the ${s.count} Apple Store${s.count > 1 ? "s" : ""} in ${s.name}.`,
    alternates: { canonical: `/stores/${s.slug}` },
  };
}

export default async function StatePage({ params }: PageProps<"/stores/[state]">) {
  const { state } = await params;
  const s = statesWithStores().find((x) => x.slug === state);
  if (!s) notFound();
  const stores = STORES.filter((x) => x.state === s.name).sort((a, b) => a.city.localeCompare(b.city));
  const per = await Promise.all(MODELS.map(async (m) => [m.key, await stockByStore(m.key)] as const));
  const avail = new Map(per.map(([k, rows]) => [k, new Map(rows.map((r) => [r.storeNumber, r]))]));
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <nav className="text-sm text-ink-3"><Link href="/stores" className="hover:text-ink">Stores</Link> / {s.name}</nav>
      <h1 className="display mt-2 text-3xl sm:text-5xl">Apple Stores in {s.name}</h1>
      <p className="mt-3 text-ink-2">{stores.length} store{stores.length > 1 ? "s" : ""}. Dots show which models are available for pickup right now.</p>
      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {stores.map((st) => (
          <li key={st.storeNumber} className="pane-2 pane-hover p-4">
            <Link href={`/stores/${stateSlug(st.state)}/${st.slug}`} className="block">
              <div className="font-semibold">Apple {st.name}</div>
              <div className="text-sm text-ink-3">{st.street?.trim()}, {st.city}</div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {MODELS.map((m) => {
                  const r = avail.get(m.key)?.get(st.storeNumber);
                  const n = r?.availableParts.length ?? 0;
                  return <span key={m.key} className="inline-flex items-center gap-1.5 text-ink-2"><Dot state={n ? "ok" : r ? "idle" : "idle"} /> {m.short}{n ? ` · ${n}` : ""}</span>;
                })}
              </div>
              <div className="mt-2 text-xs text-ink-3">Checked {timeAgo(avail.get("18-pro")?.get(st.storeNumber)?.lastCheckedAt ?? null)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
