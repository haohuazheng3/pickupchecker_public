import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { storesIndexMetadata } from "@/components/pages/StoresIndexPage";
import { IntlStoresIndexPage } from "@/components/pages/StoresIndexIntl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores">): Promise<Metadata> {
  const c = countryFromPrefix((await params).cc);
  return c ? storesIndexMetadata(c) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores">) {
  const c = countryFromPrefix((await params).cc);
  if (!c) notFound();
  return <IntlStoresIndexPage country={c} />;
}
