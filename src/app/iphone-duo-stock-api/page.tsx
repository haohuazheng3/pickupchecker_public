import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { ApiPage, apiMetadata } from "@/components/pages/decide/ApiPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return apiMetadata(US);
}

/** /iphone-duo-stock-api: the free iPhone Duo stock API, documented (US). */
export default function Page() {
  return <ApiPage country={US} />;
}
