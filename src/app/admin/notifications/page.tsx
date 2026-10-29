import { recentNotifications } from "@/lib/admin/queries";
import { PART_INDEX, STORE_INDEX } from "@/lib/apple/catalog";
import { Table, timeAgo } from "@/components/admin/Bits";

export default async function AdminNotifications() {
  const rows = await recentNotifications(150);
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">Alerts sent</h2>
      <Table head={["At", "To", "Channel", "Item", "Store", "Status", "Latency", "Provider id / error"]} rows={rows.map(({ n, email }) => { const i = PART_INDEX.get(n.partNumber); const s = STORE_INDEX.get(n.storeNumber); return [timeAgo(n.createdAt), email, n.channel, i ? `${i.model} ${i.storage} ${i.color}` : n.partNumber, s?.name ?? n.storeNumber, <span key="s" className={n.status === "sent" ? "text-accent" : "text-bad"}>{n.status}</span>, n.latencyMs ? `${n.latencyMs} ms` : "—", n.error ?? n.providerId]; })} />
    </section>
  );
}
