/**
 * How each restock on the dashboard relates to the member's own alerts (2026-11-10). The account page's restock
 * modules cover every configuration of the watched models at the member's stores, so a Star White restock at a
 * store where they watch Night Sky showed up as "your" restock next to "Nothing sent yet" — and members wrote in that
 * alerts had failed. Each row now says which it was: an alert we sent (and, since receipts, whether the phone got
 * it), a configuration they have no alert for, or a restock from before they set the alert.
 */
import { PART_INDEX, modelKeyFor } from "@/lib/apple/catalog";

export type AlertMark = "delivered" | "sent" | "other" | "before";

interface Row { id: number; at: Date | string; storeNumber: string; partNumber: string }
interface Rule { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[]; createdAt: Date | string }
interface Note { eventId: number | null; status: string; deliveredAt: Date | string | null }

/** Pure. Rows the member has an alert for but got none (a return within the same batch) carry no mark. */
export function alertMarks(rows: Row[], rules: Rule[], notes: Note[]): Record<number, AlertMark> {
  const sent = new Map<number, boolean>();
  for (const n of notes) if (n.eventId != null && n.status === "sent") sent.set(n.eventId, Boolean(n.deliveredAt) || (sent.get(n.eventId) ?? false));
  const out: Record<number, AlertMark> = {};
  for (const r of rows) {
    if (sent.has(r.id)) { out[r.id] = sent.get(r.id) ? "delivered" : "sent"; continue; }
    const item = PART_INDEX.get(r.partNumber);
    if (!item) continue;
    const key = modelKeyFor(item.model);
    const match = rules.filter((w) => w.active && w.model === key && w.storeNumbers.includes(r.storeNumber) && w.storages.includes(item.storage) && w.colors.includes(item.color));
    if (match.length === 0) out[r.id] = "other";
    else if (match.every((w) => new Date(w.createdAt).getTime() > new Date(r.at).getTime())) out[r.id] = "before";
  }
  return out;
}
