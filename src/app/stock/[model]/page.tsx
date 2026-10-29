import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MODELS, modelBySlug, storagesFor, colorsFor, type ModelKey } from "@/lib/apple/catalog";
import { StockBoard, StockBoardSkeleton } from "@/components/stock/StockBoard";
import { RecentRestocks } from "@/components/stock/RecentRestocks";
import { BrowseStates, BrowsePopular } from "@/components/seo/Browse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return MODELS.map((m) => ({ model: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/stock/[model]">): Promise<Metadata> {
  const { model } = await params;
  const m = modelBySlug(model);
  if (!m) return {};
  return {
    title: `${m.name} in-store pickup stock — every US Apple Store, live`,
    description: `Which Apple Stores have the ${m.name} available for in-store pickup right now, updated around the clock. Set a free alert and get a notification the moment stock appears near you.`,
    alternates: { canonical: `/stock/${m.slug}` },
  };
}

export default async function StockModelPage({ params, searchParams }: PageProps<"/stock/[model]">) {
  const { model } = await params;
  const sp = await searchParams;
  const m = modelBySlug(model);
  if (!m) notFound();
  const key = m.key as ModelKey;
  const storage = typeof sp.storage === "string" && storagesFor(key).includes(sp.storage) ? sp.storage : undefined;
  const color = typeof sp.color === "string" && colorsFor(key).includes(sp.color) ? sp.color : undefined;
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Models">
        {MODELS.map((x) => (
          <Link key={x.key} href={`/stock/${x.slug}`} className="chip" data-on={x.key === key}>{x.name}</Link>
        ))}
      </nav>
      <h1 className="display text-3xl sm:text-5xl">{m.name} pickup stock, live</h1>
      <p className="mt-3 max-w-2xl text-ink-2">Every Apple Store in the US, checked continuously. Green means a store currently lists the {m.short} for in-store pickup on apple.com.</p>
      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={`/stock/${m.slug}`} className="chip" data-on={!storage && !color}>All</Link>
        {storagesFor(key).map((s) => <Link key={s} href={`/stock/${m.slug}?storage=${encodeURIComponent(s)}${color ? `&color=${encodeURIComponent(color)}` : ""}`} className="chip" data-on={storage === s}>{s}</Link>)}
        <span className="mx-1 self-center text-ink-3">·</span>
        {colorsFor(key).map((c) => <Link key={c} href={`/stock/${m.slug}?color=${encodeURIComponent(c)}${storage ? `&storage=${encodeURIComponent(storage)}` : ""}`} className="chip" data-on={color === c}>{c}</Link>)}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section className="pane p-5 sm:p-6">
          <Suspense fallback={<StockBoardSkeleton />}>
            <StockBoard model={key} storage={storage} color={color} />
          </Suspense>
        </section>
        <aside className="space-y-4">
          <div className="pane p-5">
            <div className="eyebrow">Alerts</div>
            <p className="mt-2 text-ink-2">Don&apos;t refresh this page. Get a notification the second a {m.short} appears near you.</p>
            <Link href={`/?model=${m.key}#notify`} className="btn btn-primary mt-4 w-full">Get notified · free</Link>
          </div>
          <div className="pane p-5">
            <div className="flex items-baseline justify-between gap-3"><div className="eyebrow">Recent restocks</div><Link href={`/restocks?model=${key}`} className="text-xs text-ink-3 hover:text-ink">Full log →</Link></div>
            <Suspense fallback={<div className="skeleton mt-3 h-24" />}>
              <RecentRestocks model={key} />
            </Suspense>
          </div>
        </aside>
      </div>
      <RelatedBlock title={`${m.name} by place`}>
        <LinkRow title="This model" links={[{ href: `/restocks?model=${key}`, label: `${m.short} restock log` }, { href: `/map?model=${key}`, label: `${m.short} on the map` }, { href: `/?model=${key}#notify`, label: `${m.short} alert · free` }, ...MODELS.filter((x) => x.key !== key).map((x) => ({ href: `/stock/${x.slug}`, label: `${x.name} stock` }))]} />
        <BrowseStates />
        <BrowsePopular states={0} cities={12} />
      </RelatedBlock>
    </div>
  );
}
