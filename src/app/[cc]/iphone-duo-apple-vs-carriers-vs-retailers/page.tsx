import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { ChannelsPage, channelsMetadata } from "@/components/pages/decide/ChannelsPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/iphone-duo-apple-vs-carriers-vs-retailers">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? channelsMetadata(r.c, r.loc) : {};
}

/** /{cc}/iphone-duo-apple-vs-carriers-vs-retailers and /{lang}-{cc}/iphone-duo-apple-vs-carriers-vs-retailers: the same page for another country, in English or its language. */
export default async function Page({ params }: PageProps<"/[cc]/iphone-duo-apple-vs-carriers-vs-retailers">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  return <ChannelsPage country={r.c} />;
}
