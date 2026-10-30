import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "How it works", description: "How PickupChecker watches every US Apple Store for iPhone pickup stock and notifies your phone within seconds.", alternates: { canonical: "/how-it-works" } };
export default function HowItWorks() {
  return (
    <Page title="How it works" lead="The same availability apple.com shows shoppers, checked for every store at once, turned into a notification the moment it changes.">
      <h2>1. Pick what you want</h2>
      <p>Choose iPhone 18 Pro, 18 Pro Max or iPhone Duo, then any storage sizes and colors you&apos;d accept. Leave a filter empty to take anything.</p>
      <h2>2. Pick where</h2>
      <p>A ZIP code with a radius, specific stores, or all 269 US Apple Stores. Each of these is one alert rule: Plus ($5/month) holds 10 and Pro ($10/month) 20. Live stock, the map and the restock log are free to browse.</p>
      <h2>3. We watch, continuously</h2>
      <p>Our checker asks apple.com&apos;s pickup availability for every store in the country, round the clock, typically every 20 seconds. Each answer is compared with the last one; a store flipping from &ldquo;unavailable&rdquo; to &ldquo;available&rdquo; for one of your configurations is a restock.</p>
      <h2>4. You get a notification, fast</h2>
      <p>Within seconds of the flip your phone gets one notification with the store, the exact configuration and a link to reserve (add PickupChecker to your Home Screen first — <Link href="/install">here&apos;s how</Link>; without a device set up, the alert goes to your email). We never repeat an alert while the item stays in stock, and a glitch on our side never turns into a false &ldquo;sold out&rdquo; or a fake &ldquo;in stock&rdquo;: if we can&apos;t read a store we mark it unknown, we don&apos;t guess.</p>
      <h2>5. Reserve on apple.com</h2>
      <p>Open the link, choose Pick up and the store, and complete the reservation with Apple. Pickup stock can go in minutes, so keep your Apple ID and payment ready.</p>
      <h2>Honest limits</h2>
      <ul>
        <li>We read public availability; we can&apos;t see quantities or hold inventory.</li>
        <li>Apple sometimes shows stock that is reserved for existing orders. If the reservation fails, the next alert is on us at no extra cost.</li>
        <li>Notifications need the Home Screen app on iPhone and Android, and Do Not Disturb will hold them like any other. Email delivery depends on your provider: add alerts@pickupchecker.com to your contacts.</li>
      </ul>
      <p><Link href="/#notify">Set up an alert →</Link></p>
    </Page>
  );
}
