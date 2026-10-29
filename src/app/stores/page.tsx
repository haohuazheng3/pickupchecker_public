import type { Metadata } from "next";
import Link from "next/link";
import { citiesWithStores, cityPath, statePath, statesWithStores, DEFAULT_MODEL } from "@/lib/apple/catalog";
import { BrowseModels, BrowsePopular } from "@/components/seo/Browse";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";

export const metadata: Metadata = {
  title: "Apple Stores in the US by state and city — iPhone Duo pickup stock",
  description: "All 269 US Apple Stores grouped by state and city, each with live iPhone Duo, 18 Pro and Pro Max in-store pickup availability, restock times and history.",
  alternates: { canonical: "/stores" },
};

export default function StoresIndex() {
  const states = statesWithStores();
  const cities = citiesWithStores();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="display text-3xl sm:text-5xl">Apple Stores by state and city</h1>
      <p className="mt-3 max-w-2xl text-ink-2">{states.reduce((n, s) => n + s.count, 0)} stores in {cities.length} cities across {states.length} states and territories. Every store page shows live pickup stock, when it usually restocks and its restock history.</p>
      <div className="mt-6 flex flex-wrap gap-2"><Link href={`/map?model=${DEFAULT_MODEL}`} className="btn btn-ghost btn-sm">Live map</Link><Link href="/restocks" className="btn btn-ghost btn-sm">Restock log</Link><Link href={`/?model=${DEFAULT_MODEL}#notify`} className="btn btn-primary btn-sm">Alert me · free</Link></div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {states.map((s) => {
          const mine = cities.filter((c) => c.state === s.name);
          return (
            <li key={s.slug} className="pane-2 p-4">
              <Link href={statePath(s.name)} className="flex items-center justify-between font-semibold hover:underline"><span>{s.name}</span><span className="text-sm font-normal text-ink-3">{s.count} store{s.count > 1 ? "s" : ""}</span></Link>
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                {mine.map((c) => <Link key={c.slug} href={cityPath(c.state, c.name)} className="text-ink-2 hover:text-ink hover:underline">{c.name}{c.stores.length > 1 ? ` (${c.stores.length})` : ""}</Link>)}
              </div>
            </li>
          );
        })}
      </ul>
      <RelatedBlock>
        <BrowsePopular />
        <BrowseModels />
        <LinkRow title="More" links={[{ href: "/restocks", label: "Restock log" }, { href: "/map", label: "Live map" }, { href: "/install", label: "Get the app" }, { href: "/how-it-works", label: "How it works" }, { href: "/pricing", label: "Pricing" }]} />
      </RelatedBlock>
    </div>
  );
}
