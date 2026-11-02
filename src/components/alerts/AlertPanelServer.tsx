import { AlertPanel } from "./AlertSetup";
import { startFrom, startFromPool } from "@/lib/alertStart";
import type { CountryCode } from "@/lib/apple/countries";
import { buildPhoneCatalog } from "./catalog";

/** A page's folded alert section, pre-filled from the page's own "Alert me" link; another country's pages list its stores and prices. */
export function AlertPanelFor({ href, summary, country = "us" }: { href: string; summary: string; country?: CountryCode }) {
  const q = new URL(href, "https://pickupchecker.com").searchParams;
  const catalog = buildPhoneCatalog(country);
  const start = catalog.stores ? startFromPool((k) => q.get(k), catalog.stores, catalog.configs) : startFrom((k) => q.get(k));
  return (
    <div className="mt-6">
      <AlertPanel catalog={catalog} start={start} title="Get alerts" summary={summary} />
    </div>
  );
}
