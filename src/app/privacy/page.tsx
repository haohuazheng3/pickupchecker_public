import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Privacy Policy", description: "What PickupChecker stores (your email, alerts and push subscription), why, how long, and how to delete it.", alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (
    <Page title="Privacy Policy" lead="Last updated October 31, 2026.">
      <h2>What we collect</h2>
      <ul>
        <li><b>Email address</b> — to sign you in (one-time code) and send alerts by email when no device has notifications on. Authentication is handled by Clerk.</li>
        <li><b>Push subscription</b> — when you turn on notifications, your browser gives us an anonymous delivery address (an endpoint and two encryption keys) for that device. We store it with your account and delete it when you turn notifications off or remove the device.</li>
        <li><b>Alert settings</b> — model, storage, color and the stores you picked. If you allow location access, it is used in your browser to sort nearby stores and is never sent to us.</li>
        <li><b>Payment</b> — processed by Stripe. We store your Stripe customer and subscription ids, never card numbers.</li>
        <li><b>Usage analytics</b> — pages, clicks and form interactions, collected by FlowGlance to improve the product (see <a href="#analytics">Analytics and your choice</a>). No advertising trackers.</li>
        <li><b>Server logs</b> — IP address and request metadata for security and rate limiting, kept for 30 days.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To run the service you asked for: checking stock, matching it with your alerts, sending notifications and emails, billing. We don&apos;t sell or rent personal data.</p>
      <h2>Processors</h2>
      <p>Clerk (authentication), Stripe (payments), Resend (email delivery), Apple, Google and Mozilla push services (delivering notifications to your device), Vercel (hosting) and Linode (our servers, including the database), Cloudflare (DNS and inbound mail), FlowGlance (analytics). Each processes data on our instructions under their own privacy terms.</p>
      <h2 id="analytics">Analytics and your choice</h2>
      <p>FlowGlance is our only analytics tool. It records the pages you view, clicks and form interactions, your device and browser type, and an approximate location derived from your network address. When you&apos;re signed in, it is linked to your account id and email so a support question can be matched to what you saw.</p>
      <ul>
        <li><b>EU, EEA, UK and Switzerland</b> — and anyone whose location we can&apos;t determine: we ask first. FlowGlance loads only after you choose <b>Accept</b>; if you choose <b>Decline</b>, it never loads.</li>
        <li><b>Everywhere else</b> (including the US): FlowGlance runs by default. To opt out, choose <b>Do not track me</b> at the bottom of any page. FlowGlance stops loading from then on; if it was already running, the page reloads once without it. We also treat a <a href="https://globalprivacycontrol.org" rel="noopener">Global Privacy Control</a> signal from your browser as an opt-out.</li>
      </ul>
      <p>Your choice is kept in the <code>pc_consent</code> cookie for 180 days and can be changed at any time from the same place at the bottom of the page (<b>Analytics off · Turn on</b>). To decide which rule applies, your browser asks our host (Vercel) for the country of your network address once; the answer is remembered in the <code>pc_region</code> cookie for 180 days, and we don&apos;t store it on our servers.</p>
      <h2>Retention and deletion</h2>
      <p>Alerts and account data are kept while your account exists. Email us from your account address to delete your account; we remove it within 7 days, keeping only what tax law requires about payments.</p>
      <h2>Your rights</h2>
      <p>You can access, correct or delete your data, and object to processing, by contacting hello@pickupchecker.com. Where we rely on your consent (analytics in the EU, EEA, UK and Switzerland), you can withdraw it at any time; this doesn&apos;t affect what was collected before. EU/UK residents may also complain to their supervisory authority. California residents: we don&apos;t sell or share personal information as the CCPA defines it, and we honor Global Privacy Control.</p>
      <h2>Cookies</h2>
      <p>Strictly necessary cookies for sign-in (Clerk), plus two of ours that remember your analytics choice (<code>pc_consent</code>) and whether your region is asked first (<code>pc_region</code>). FlowGlance sets its own first-party analytics cookie only when it runs (see above). No third-party advertising cookies.</p>
    </Page>
  );
}
