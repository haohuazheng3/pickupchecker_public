import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Terms of Service", alternates: { canonical: "/terms" } };
export default function Terms() {
  return (
    <Page title="Terms of Service" lead="Last updated October 29, 2026.">
      <h2>The service</h2>
      <p>PickupChecker sends email notifications about in-store pickup availability of selected iPhone models at Apple Stores in the United States, based on publicly displayed availability on apple.com. We don&apos;t sell devices, reserve them for you, or guarantee that a notification results in a purchase.</p>
      <h2>Accounts</h2>
      <p>You sign in with a one-time email code. Keep access to that mailbox secure; you are responsible for activity under your account.</p>
      <h2>Subscriptions</h2>
      <p>Alerts for a model cost US$5 per month, billed in advance by Stripe, renewing monthly until cancelled. Cancel anytime from your account; alerts continue to the end of the paid period. Prices may change with 30 days&apos; notice.</p>
      <h2>Acceptable use</h2>
      <p>Personal, non-commercial use. No scraping, reselling of alerts, or automated accounts.</p>
      <h2>Availability and accuracy</h2>
      <p>Stock data comes from Apple and can be delayed, wrong or withdrawn. The service is provided &ldquo;as is&rdquo; without warranties; our liability is limited to the fees you paid in the last 3 months.</p>
      <h2>Changes and termination</h2>
      <p>We may update these terms or stop the service; material changes are announced by email. We may suspend accounts that break these terms.</p>
      <h2>Contact</h2>
      <p>hello@pickupchecker.com</p>
    </Page>
  );
}
