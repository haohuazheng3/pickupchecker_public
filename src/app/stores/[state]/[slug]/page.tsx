import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORES, stateSlug, MODELS, modelKeyFor, STORAGE_ORDER } from "@/lib/apple/catalog";
import { storeStatus } from "@/lib/stock/queries";
import { Dot, timeAgo } from "@/components/stock/StatusBits";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return STORES.map((s) => ({ state: stateSlug(s.state), slug: s.slug }));
}

function find(state: string, slug: string) {
  return STORES.find((s) => s.slug === slug && stateSlug(s.state) === state);
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[slug]">): Promise<Metadata> {
  const { state, slug } = await params;
  const s = find(state, slug);
  if (!s) return {};
  return {
    title: `Apple ${s.name} (${s.city}, ${s.state}) — iPhone pickup stock right now`,
    description: `Live in-store pickup availability for every iPhone 18 Pro, Pro Max and iPhone Duo configuration at Apple ${s.name}, ${s.street?.trim()}, ${s.city}, ${s.state}.`,
    alternates: { canonical: `/stores/${state}/${slug}` },
  };
}

export default async function StorePage({ params }: PageProps<"/stores/[state]/[slug]">) {
  const { state, slug } = await params;
  const s = find(state, slug);
  if (!s) notFound();
  const rows = await storeStatus(s.storeNumber);
  const byModel = MODELS.map((m) => ({
    m,
    rows: rows.filter((r) => modelKeyFor(r.item!.model) === m.key).sort((a, b) => STORAGE_ORDER.indexOf(a.item!.storage) - STORAGE_ORDER.indexOf(b.item!.storage) || a.item!.color.localeCompare(b.item!.color)),
  }));
  const last = rows.reduce<Date | null>((acc, r) => (!acc || (r.lastCheckedAt && r.lastCheckedAt > acc) ? r.lastCheckedAt : acc), null);
  const ld = {
    "@context": "https://schema.org", "@type": "Store", name: `Apple ${s.name}`, url: s.url,
    address: { "@type": "PostalAddress", streetAddress: s.street?.trim(), addressLocality: s.city, addressRegion: s.state, postalCode: s.postalCode, addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng }, telephone: s.phone, image: s.image,
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <nav className="text-sm text-ink-3"><Link href="/stores" className="hover:text-ink">Stores</Link> / <Link href={`/stores/${state}`} className="hover:text-ink">{s.state}</Link> / {s.name}</nav>
      <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="display text-3xl sm:text-5xl">Apple {s.name}</h1>
          <p className="mt-2 text-ink-2">{s.street?.trim()}, {s.city}, {s.state} {s.postalCode} · {s.phone}</p>
          <p className="mt-1 text-sm text-ink-3">Last checked {timeAgo(last)} · <a className="underline" href={s.url} rel="nofollow noopener" target="_blank">apple.com store page</a></p>
          {byModel.map(({ m, rows }) => (
            <section key={m.key} className="pane mt-6 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">{m.name}</h2>
                <Link href={`/?model=${m.key}#notify`} className="btn btn-ghost btn-sm">Alert me</Link>
              </div>
              {rows.length === 0 ? <p className="mt-3 text-sm text-ink-3">Not checked yet.</p> : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {rows.map((r) => (
                    <li key={r.partNumber} className="flex items-center justify-between rounded-xl bg-white/4 px-3 py-2 text-sm">
                      <span>{r.item!.storage} · {r.item!.color}</span>
                      <span className="inline-flex items-center gap-2 text-ink-3"><Dot state={r.status === "available" ? "ok" : r.status === "unknown" ? "warn" : "idle"} live={r.status === "available"} />{r.status === "available" ? (r.quote ?? "Available") : r.status === "unknown" ? "Unknown" : "Unavailable"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <aside className="space-y-4">
          {s.image && (
            // eslint-disable-next-line @next/next/no-img-element -- Apple CDN image, already sized by its query string
            <img src={s.image} alt={`Apple ${s.name}`} className="w-full rounded-[20px] border border-line" loading="lazy" />
          )}
          <div className="pane p-5">
            <div className="eyebrow">Hours</div>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {(s.hours ?? []).map((h, i) => <li key={i}>{h.days.length === 7 ? "Every day" : h.days.join(", ")}: {h.opens.slice(0, 5)}–{h.closes.slice(0, 5)}</li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
