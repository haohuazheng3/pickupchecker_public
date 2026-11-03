import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { HomePage, homeMetadata } from "@/components/pages/HomePage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? homeMetadata(r.c, r.loc) : {};
}

export default async function CountryHome({ params, searchParams }: PageProps<"/[cc]">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  const c = r.c;
  return <HomePage country={c} searchParams={await searchParams} />;
}
