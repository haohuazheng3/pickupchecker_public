import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { CityPage, cityMetadata, cityStaticParams } from "@/components/pages/CityPage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return cityStaticParams(US);
}

export async function generateMetadata({ params }: PageProps<"/stores/[state]/[city]">): Promise<Metadata> {
  return cityMetadata(US, await params);
}

export default async function Page({ params }: PageProps<"/stores/[state]/[city]">) {
  return <CityPage country={US} params={await params} />;
}
