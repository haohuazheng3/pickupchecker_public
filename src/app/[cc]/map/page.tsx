import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { MapPage, mapMetadata } from "@/components/pages/MapPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/map">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? mapMetadata(r.c, r.loc) : {};
}

export default async function Page({ params, searchParams }: PageProps<"/[cc]/map">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  const c = r.c;
  return <MapPage country={c} searchParams={await searchParams} />;
}
