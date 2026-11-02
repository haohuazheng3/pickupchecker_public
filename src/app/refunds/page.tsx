import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Refund Policy", description: "Full refund within 7 days of a payment as long as no restock alert has reached you since. How to ask, what counts as an alert, and how cancelling works.", alternates: { canonical: "/refunds" } };
export default function Refunds() {
  return (
    <Page title="Refund Policy" lead="No restock alert yet? Ask within 7 days of paying and we refund that payment in full.">
      <h2>When you can get a refund</h2>
      <ul>
        <li><b>Within 7 days</b> of the payment, counted from the moment you were charged.</li>
        <li><b>Before any restock alert has reached you</b> since that payment. Once a restock push has been sent to any of your devices, or a restock email has been sent to you, the service has been used for that payment and it isn&apos;t refundable.</li>
        <li>Test notifications don&apos;t count: &ldquo;Send a test notification&rdquo; and &ldquo;Preview on this device&rdquo; never use up your refund.</li>
      </ul>
      <h2>How to ask</h2>
      <p>Email <a href="mailto:hello@pickupchecker.com?subject=Refund%20request">hello@pickupchecker.com</a> from the address on your account, with &ldquo;Refund&rdquo; in the subject. We check the alert log, reply within one business day, and refund to the original payment method; your bank usually shows it within 5 business days.</p>
      <h2>What happens after a refund</h2>
      <ul>
        <li>The refunded payment is returned in full, and the plan ends right away: alerts stop and no further charges are made.</li>
        <li>Your saved alerts stay on your account, so they switch back on if you subscribe again.</li>
      </ul>
      <h2>Cancelling instead</h2>
      <p>Cancelling (Dashboard → Cancel subscription) stops the next renewal. Alerts keep working until the end of the period you paid for; cancelling on its own doesn&apos;t refund a payment, ask as above if it qualifies.</p>
      <p>Nothing here limits any right you have under the consumer law where you live.</p>
    </Page>
  );
}
