import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "How it works", description: "How PickupChecker checks every US Apple Store for iPhone pickup stock and notifies your phone in seconds.", alternates: { canonical: "/how-it-works" } };
export default function HowItWorks() {
  return (
    <Page title="How it works" lead="All 269 US Apple Stores, checked every 20 seconds. Browsing stock is free; alerts to your phone are the paid part.">
      <h2>1. Pick the phone</h2>
      <p>iPhone Duo, 18 Pro or 18 Pro Max, then the exact storage and color.</p>
      <h2>2. Pick the stores</h2>
      <p>Tick one or more Apple Stores, nearest first or by search. One store × one configuration = one alert: Plus $5/month holds 10, Pro $10 holds 20, Max $20 holds 50.</p>
      <h2>3. We check every 20 seconds</h2>
      <p>Every store, around the clock. A store going from unavailable to available for your configuration is a restock.</p>
      <h2>4. Your phone buzzes</h2>
      <p>Store, exact configuration, link to reserve, within seconds. Phone notifications need the Home Screen app (<Link href="/install">install</Link>); without one you get an email. No repeats while it stays in stock.</p>
      <h2>5. Reserve on apple.com</h2>
      <p>Open the link, choose Pick up at your store and pay with Apple. Pickup stock can go in minutes.</p>
      <h2>Limits</h2>
      <ul>
        <li>Public availability only: no quantities, no holds.</li>
        <li>Apple sometimes shows stock already reserved for other orders.</li>
        <li>Email depends on your provider: allow alerts@pickupchecker.com.</li>
      </ul>
      <p><Link href="/#notify">Set up an alert →</Link></p>
    </Page>
  );
}
