import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { RestocksPage, restocksMetadata } from "@/components/pages/RestocksPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/restocks">): Promise<Metadata> {
  const c = countryFromPrefix((await params).cc);
  return c ? restocksMetadata(c) : {};
}

export default async function Page({ params, searchParams }: PageProps<"/[cc]/restocks">) {
  const c = countryFromPrefix((await params).cc);
  if (!c) notFound();
  return <RestocksPage country={c} searchParams={await searchParams} />;
}
