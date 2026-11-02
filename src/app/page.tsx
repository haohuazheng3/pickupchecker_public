import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { HomePage, homeMetadata } from "@/components/pages/HomePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = homeMetadata(US);

export default async function Home({ searchParams }: PageProps<"/">) {
  return <HomePage country={US} searchParams={await searchParams} />;
}
