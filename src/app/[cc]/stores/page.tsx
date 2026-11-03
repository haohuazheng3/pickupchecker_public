import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { storesIndexMetadata } from "@/components/pages/StoresIndexPage";
import { IntlStoresIndexPage } from "@/components/pages/StoresIndexIntl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? storesIndexMetadata(r.c, r.loc) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  const c = r.c;
  return <IntlStoresIndexPage country={c} />;
}
