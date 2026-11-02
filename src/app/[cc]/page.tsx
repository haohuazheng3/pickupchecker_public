import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { HomePage, homeMetadata } from "@/components/pages/HomePage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]">): Promise<Metadata> {
  const c = countryFromPrefix((await params).cc);
  return c ? homeMetadata(c) : {};
}

export default async function CountryHome({ params, searchParams }: PageProps<"/[cc]">) {
  const c = countryFromPrefix((await params).cc);
  if (!c) notFound();
  return <HomePage country={c} searchParams={await searchParams} />;
}
