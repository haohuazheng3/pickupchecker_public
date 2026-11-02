import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { StorePage, storeMetadata, storeStaticParams } from "@/components/pages/StorePage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return storeStaticParams(US);
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]/[store]">): Promise<Metadata> {
  return storeMetadata(US, await params);
}

export default async function Page({ params }: PageProps<"/stores/[state]/[city]/[store]">) {
  return <StorePage country={US} params={await params} />;
}
