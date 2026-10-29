import { inbox, contacts } from "@/lib/admin/queries";
import { Table, timeAgo } from "@/components/admin/Bits";
import { Section } from "@/components/admin/Status";

export default async function AdminInbox() {
  const [mail, msgs] = await Promise.all([inbox(50), contacts(50)]);
  return (
    <>
      <Section title="test@pickupchecker.com inbox" aside="Cloudflare Email Routing → worker → /api/inbox/ingest · sign-in codes for the production test account land here"><Table head={["Received", "From", "To", "Subject", "SPF/DKIM/DMARC", "Text"]} rows={mail.map((m) => [timeAgo(m.receivedAt), m.from, m.to, m.subject, `${m.auth?.spf ?? "?"}/${m.auth?.dkim ?? "?"}/${m.auth?.dmarc ?? "?"}`, <span key="t" className="line-clamp-3 max-w-md whitespace-pre-wrap text-xs">{m.text?.slice(0, 600)}</span>])} /></Section>
      <Section title="Contact form"><Table head={["At", "Email", "Subject", "Message", "IP"]} rows={msgs.map((c) => [timeAgo(c.createdAt), c.email, c.subject, <span key="m" className="whitespace-pre-wrap">{c.message.slice(0, 800)}</span>, c.ip])} /></Section>
    </>
  );
}
