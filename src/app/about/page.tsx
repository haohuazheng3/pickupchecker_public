import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "About", description: "PickupChecker is an independent in-store pickup availability checker for iPhone across 468 Apple Stores in 19 countries and regions.", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <Page title="About PickupChecker" lead="One job: tell you the second the iPhone you want is ready for pickup near you.">
      <p>PickupChecker covers 468 Apple Stores across 19 countries and regions, including 269 in the US. It organizes observed stock changes by store and exact configuration. Eligible active member targets are scheduled for checks every five seconds.</p>
      <p><a href="/research/iphone-duo-week-2026-11-07#coverage">See the full coverage list and our latest stock research</a>.</p>
      <h2>Independent</h2>
      <p>Not affiliated with, endorsed by or sponsored by Apple Inc. We never ask for your Apple ID. Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
      <h2>Contact</h2>
      <p><a href="/contact">Contact form</a> or hello@pickupchecker.com.</p>
    </Page>
  );
}
