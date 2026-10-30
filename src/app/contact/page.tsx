import type { Metadata } from "next";
import { Page } from "@/components/site/Page";
import { ContactForm } from "@/components/site/ContactForm";
export const metadata: Metadata = { title: "Contact", description: "Questions about PickupChecker alerts, billing or a store we got wrong? Write to us; a person answers, usually the same day.", alternates: { canonical: "/contact" } };
export default function Contact() {
  return (
    <Page title="Contact" lead="Bugs, refunds, ideas.">
      <p>Email <a href="mailto:hello@pickupchecker.com">hello@pickupchecker.com</a> or use the form.</p>
      <ContactForm />
    </Page>
  );
}
