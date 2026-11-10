import { AlertPanel } from "./AlertSetup";
import { t } from "@/lib/i18n/server";
import type { CountryCode } from "@/lib/apple/countries";

/**
 * A page's alert block: its button opens the alert lightbox with the page's own "Alert me" link (the pre-fill:
 * this store, this model…). In the page's language: its title here, `summary` comes written.
 */
export function AlertPanelFor({ href, summary }: { href: string; summary: string; country?: CountryCode }) {
  const d = t().alerts;
  return (
    <div className="mt-6">
      <AlertPanel href={href} title={d.panelTitle} summary={summary} />
    </div>
  );
}
