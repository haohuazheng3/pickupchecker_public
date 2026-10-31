import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "About", description: "PickupChecker is an independent in-store pickup availability checker for iPhone at US Apple Stores.", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <Page title="About PickupChecker" lead="One job: tell you the second the iPhone you want is ready for pickup near you.">
      <p>apple.com shows the dozen stores nearest one ZIP code. PickupChecker checks all 269 US Apple Stores every 15 seconds and sends one notification when yours restocks.</p>
      <h2>Independent</h2>
      <p>Not affiliated with, endorsed by or sponsored by Apple Inc. We never ask for your Apple ID. Apple, iPhone and Apple Store are trademarks of Apple Inc.</p>
      <h2>Contact</h2>
      <p><a href="/contact">Contact form</a> or hello@pickupchecker.com.</p>
    </Page>
  );
}
