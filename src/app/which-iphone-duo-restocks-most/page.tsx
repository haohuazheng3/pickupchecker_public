import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { ConfigsPage, configsMetadata } from "@/components/pages/decide/ConfigsPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return configsMetadata(US);
}

/** /which-iphone-duo-restocks-most: which iPhone Duo configuration restocks most and has been listed longest (US). */
export default function Page() {
  return <ConfigsPage country={US} />;
}
