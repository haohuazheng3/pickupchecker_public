import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { SupplyPage, supplyMetadata } from "@/components/pages/decide/SupplyPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return supplyMetadata(US);
}

/** /iphone-duo-shortage: is the iPhone Duo shortage easing, week over week (US). */
export default function Page() {
  return <SupplyPage country={US} />;
}
