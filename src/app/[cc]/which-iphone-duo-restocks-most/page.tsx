import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { ConfigsPage, configsMetadata } from "@/components/pages/decide/ConfigsPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/which-iphone-duo-restocks-most">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? configsMetadata(r.c, r.loc) : {};
}

/** /{cc}/which-iphone-duo-restocks-most and /{lang}-{cc}/which-iphone-duo-restocks-most: the same page for another country, in English or its language. */
export default async function Page({ params }: PageProps<"/[cc]/which-iphone-duo-restocks-most">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  return <ConfigsPage country={r.c} />;
}
