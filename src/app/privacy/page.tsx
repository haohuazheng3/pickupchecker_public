import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Privacy Policy", description: "What PickupChecker stores (your email, alerts and push subscription), why, how long, and how to delete it.", alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (
    <Page title="Privacy Policy" lead="Last updated October 29, 2026.">
      <h2>What we collect</h2>
      <ul>
        <li><b>Email address</b> — to sign you in (one-time code) and send alerts by email when no device has notifications on. Authentication is handled by Clerk.</li>
        <li><b>Push subscription</b> — when you turn on notifications, your browser gives us an anonymous delivery address (an endpoint and two encryption keys) for that device. We store it with your account and delete it when you turn notifications off or remove the device.</li>
        <li><b>Alert settings</b> — model, storage, color and the stores you picked. If you allow location access, it is used in your browser to sort nearby stores and is never sent to us.</li>
        <li><b>Payment</b> — processed by Stripe. We store your Stripe customer and subscription ids, never card numbers.</li>
        <li><b>Usage analytics</b> — pages, clicks and form interactions, collected by FlowGlance to improve the product. No advertising trackers.</li>
        <li><b>Server logs</b> — IP address and request metadata for security and rate limiting, kept for 30 days.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run the service you asked for: checking stock, matching it with your alerts, sending notifications and emails, billing. We don&apos;t sell or rent personal data.</p>
      <h2>Processors</h2>
      <p>Clerk (authentication), Stripe (payments), Resend (email delivery), Apple, Google and Mozilla push services (delivering notifications to your device), Neon (database), Vercel and Linode (hosting), Cloudflare (DNS and inbound mail), FlowGlance (analytics). Each processes data on our instructions under their own privacy terms.</p>
      <h2>Retention and deletion</h2>
      <p>Alerts and account data are kept while your account exists. Email us from your account address to delete your account; we remove it within 7 days, keeping only what tax law requires about payments.</p>
      <h2>Your rights</h2>
      <p>You can access, correct or delete your data, and object to processing, by contacting hello@pickupchecker.com. EU/UK residents may also complain to their supervisory authority.</p>
      <h2>Cookies</h2>
      <p>Strictly necessary cookies for sign-in and a first-party analytics cookie. No third-party advertising cookies.</p>
    </Page>
  );
}
