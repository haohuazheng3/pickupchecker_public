import { AlertPanel } from "./AlertSetup";
import { startFrom } from "@/lib/alertStart";
import { buildPhoneCatalog } from "./catalog";

/** A page's folded alert section, pre-filled from the page's own "Alert me" link. */
export function AlertPanelFor({ href, summary }: { href: string; summary: string }) {
  const q = new URL(href, "https://pickupchecker.com").searchParams;
  return (
    <div className="mt-6">
      <AlertPanel catalog={buildPhoneCatalog()} start={startFrom((k) => q.get(k))} title="Get alerts" summary={summary} />
    </div>
  );
}
