import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { RegionPage, regionMetadata } from "@/components/pages/RegionPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores/[state]">): Promise<Metadata> {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  return c ? regionMetadata(c, p) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores/[state]">) {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  if (!c) notFound();
  return <RegionPage country={c} params={p} />;
}
