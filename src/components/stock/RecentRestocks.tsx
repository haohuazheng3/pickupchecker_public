import { restockFeed } from "@/lib/stock/queries";
import type { ModelKey } from "@/lib/apple/catalog";
import { RestockFeed } from "@/components/restocks/RestockFeed";

export async function RecentRestocks({ model, limit = 8 }: { model?: ModelKey; limit?: number }) {
  const rows = await restockFeed({ model, limit });
  return <div className="mt-2"><RestockFeed rows={rows} model={model} showModel={!model} /></div>;
}
