import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { SupplyPage, supplyMetadata } from "@/components/pages/decide/SupplyPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/iphone-duo-shortage">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? supplyMetadata(r.c, r.loc) : {};
}

/** /{cc}/iphone-duo-shortage and /{lang}-{cc}/iphone-duo-shortage: the same page for another country, in English or its language. */
export default async function Page({ params }: PageProps<"/[cc]/iphone-duo-shortage">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  return <SupplyPage country={r.c} />;
}
