import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { CityPage, cityMetadata } from "@/components/pages/CityPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores/[state]/[city]">): Promise<Metadata> {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  return c ? cityMetadata(c, p) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores/[state]/[city]">) {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  if (!c) notFound();
  return <CityPage country={c} params={p} />;
}
