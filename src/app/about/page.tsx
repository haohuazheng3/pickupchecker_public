import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "About", description: "PickupChecker is an independent in-store pickup availability checker for iPhone at US Apple Stores.", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <Page title="About PickupChecker" lead="Built for one job: tell you the second the iPhone you want can be picked up at a store near you.">
      <p>Launch-season iPhones sell out online for weeks while stores quietly receive stock every morning. apple.com only shows the dozen stores nearest to one ZIP code, and refreshing it all day is nobody&apos;s idea of fun. PickupChecker checks every store in the country at once and sends one notification when it matters.</p>
      <h2>What we are not</h2>
      <p>We are not affiliated with, endorsed by or sponsored by Apple Inc. We don&apos;t buy, hold or resell devices, and we never ask for your Apple ID. Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
      <h2>Contact</h2>
      <p>Questions, bugs, refund requests: <a href="/contact">contact page</a> or hello@pickupchecker.com.</p>
    </Page>
  );
}
