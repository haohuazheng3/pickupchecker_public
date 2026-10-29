import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
export const metadata: Metadata = { title: "Refund Policy", alternates: { canonical: "/refunds" } };
export default function Refunds() {
  return (
    <Page title="Refund Policy" lead="Simple: if it didn't work for you, ask within 7 days.">
      <ul>
        <li>Request a refund of your latest charge within 7 days of it, from the email on your account, via the <a href="/contact">contact page</a>.</li>
        <li>We refund in full, to the original payment method, usually within 5 business days.</li>
        <li>Cancelling stops future charges; it doesn&apos;t refund past ones unless requested as above.</li>
      </ul>
    </Page>
  );
}
