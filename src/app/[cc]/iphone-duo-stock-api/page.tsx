import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { ApiPage, apiMetadata } from "@/components/pages/decide/ApiPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/iphone-duo-stock-api">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? apiMetadata(r.c, r.loc) : {};
}

/** /{cc}/iphone-duo-stock-api and /{lang}-{cc}/iphone-duo-stock-api: the same page for another country, in English or its language. */
export default async function Page({ params }: PageProps<"/[cc]/iphone-duo-stock-api">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  return <ApiPage country={r.c} />;
}
