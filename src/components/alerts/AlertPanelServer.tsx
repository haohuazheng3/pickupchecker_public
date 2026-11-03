import { AlertPanel } from "./AlertSetup";
import { startFrom, startFromPool } from "@/lib/alertStart";
import type { CountryCode } from "@/lib/apple/countries";
import { buildPhoneCatalog } from "./catalog";
import { pageLocale, t } from "@/lib/i18n/server";

/**
 * A page's folded alert section, pre-filled from the page's own "Alert me" link; another country's pages list its
 * stores and prices. In the page's language: its title here, names and prices in the catalogue (`summary` comes written).
 */
export function AlertPanelFor({ href, summary, country = "us" }: { href: string; summary: string; country?: CountryCode }) {
  const d = t().alerts;
  const q = new URL(href, "https://pickupchecker.com").searchParams;
  const catalog = buildPhoneCatalog(country, pageLocale().lang);
  const start = catalog.stores ? startFromPool((k) => q.get(k), catalog.stores, catalog.configs) : startFrom((k) => q.get(k));
  return (
    <div className="mt-6">
      <AlertPanel catalog={catalog} start={start} title={d.panelTitle} summary={summary} />
    </div>
  );
}
