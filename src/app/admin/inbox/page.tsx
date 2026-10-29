import { inbox, contacts } from "@/lib/admin/queries";
import { Table, timeAgo } from "@/components/admin/Bits";

export default async function AdminInbox() {
  const [mail, msgs] = await Promise.all([inbox(50), contacts(50)]);
  return (
    <div className="space-y-6">
      <section><h2 className="mb-2 text-lg font-semibold">test@pickupchecker.com inbox</h2><Table head={["Received", "From", "To", "Subject", "SPF/DKIM/DMARC", "Text"]} rows={mail.map((m) => [timeAgo(m.receivedAt), m.from, m.to, m.subject, `${m.auth?.spf ?? "?"}/${m.auth?.dkim ?? "?"}/${m.auth?.dmarc ?? "?"}`, <span key="t" className="line-clamp-3 max-w-md whitespace-pre-wrap text-xs">{m.text?.slice(0, 600)}</span>])} /></section>
      <section><h2 className="mb-2 text-lg font-semibold">Contact form</h2><Table head={["At", "Email", "Subject", "Message", "IP"]} rows={msgs.map((c) => [timeAgo(c.createdAt), c.email, c.subject, <span key="m" className="whitespace-pre-wrap">{c.message.slice(0, 800)}</span>, c.ip])} /></section>
    </div>
  );
}
