import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { MapPage, mapMetadata } from "@/components/pages/MapPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = mapMetadata(US);

/** ?store=R095 · ?stores=R095,R032 · ?state=NY · ?model=duo|18-pro|18-pro-max|all — all optional. */
export default async function Page({ searchParams }: PageProps<"/map">) {
  return <MapPage country={US} searchParams={await searchParams} />;
}
