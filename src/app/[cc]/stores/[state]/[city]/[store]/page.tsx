import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { StorePage, storeMetadata } from "@/components/pages/StorePage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores/[state]/[city]/[store]">): Promise<Metadata> {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  return c ? storeMetadata(c, p) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores/[state]/[city]/[store]">) {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  if (!c) notFound();
  return <StorePage country={c} params={p} />;
}
