import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { RestockTimesPage, restockTimesMetadata } from "@/components/pages/RestockTimesPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return restockTimesMetadata(US);
}

/** /iphone-duo-restock-times: when US Apple Stores restock the iPhone Duo, hour by hour and day by day. */
export default function Page() {
  return <RestockTimesPage country={US} />;
}
