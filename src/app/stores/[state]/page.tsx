import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { RegionPage, regionMetadata, regionStaticParams } from "@/components/pages/RegionPage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return regionStaticParams(US);
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]">): Promise<Metadata> {
  return regionMetadata(US, await params);
}

export default async function Page({ params }: PageProps<"/stores/[state]">) {
  return <RegionPage country={US} params={await params} />;
}
