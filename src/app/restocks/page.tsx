import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { RestocksPage, restocksMetadata } from "@/components/pages/RestocksPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = restocksMetadata(US);

/** The full restock log: filter by model, state and sold-outs; paged; times in the reader's zone. */
export default async function Restocks({ searchParams }: PageProps<"/restocks">) {
  return <RestocksPage country={US} searchParams={await searchParams} />;
}
