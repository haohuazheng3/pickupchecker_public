import { MODELS, STORES } from "@/lib/apple/catalog";

export const dynamic = "force-static";

/** llms.txt (llmstxt.org): what this site is, where its facts come from, and the pages worth reading. */
export function GET() {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const lines = [
    "# PickupChecker",
    "",
    `> Live in-store pickup stock for the iPhone Duo, iPhone 18 Pro and iPhone 18 Pro Max at all ${STORES.length} US Apple Stores, checked about every 20 seconds, with phone alerts the moment a store lists a configuration. Browsing is free; alerts are Plus $5/month (10 alerts), Pro $10 (20), Max $20 (50).`,
    "",
    "PickupChecker is independent and not affiliated with Apple. Stock means what apple.com lists for in-store pickup at the last check. A change counts only after a second confirming check, so a single glitchy response never becomes a restock or a sell-out. Every confirmed change is logged with a timestamp; restock counts, median time in stock and restock-hour charts on the site come from that log (tracking of all stores began October 29, 2026).",
    "",
    "## Live stock",
    `- [iPhone stock checker](${base}/): every US Apple Store, all three models, live`,
    ...MODELS.map((m) => `- [${m.name} in stock](${base}/stock/${m.slug}): which of the ${STORES.length} stores have it now, by storage and color, with restock history`),
    `- [Restock log](${base}/restocks): every confirmed restock and sell-out with time, store and configuration`,
    `- [Apple Stores by state](${base}/stores): every state, city and store page, each with hours, address and live iPhone stock`,
    "",
    "## Optional",
    `- [How it works](${base}/how-it-works)`,
    `- [Pricing](${base}/pricing)`,
    `- [Install the app and turn on notifications](${base}/install)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
