import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { MapPage, mapMetadata } from "@/components/pages/MapPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/map">): Promise<Metadata> {
  const c = countryFromPrefix((await params).cc);
  return c ? mapMetadata(c) : {};
}

export default async function Page({ params, searchParams }: PageProps<"/[cc]/map">) {
  const c = countryFromPrefix((await params).cc);
  if (!c) notFound();
  return <MapPage country={c} searchParams={await searchParams} />;
}
