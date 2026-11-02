import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { StoresIndexPage, storesIndexMetadata } from "@/components/pages/StoresIndexPage";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return storesIndexMetadata(US);
}

export default async function StoresIndex() {
  return <StoresIndexPage country={US} />;
}
