import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { RestocksPage, restocksMetadata } from "@/components/pages/RestocksPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/restocks">): Promise<Metadata> {
  const r = routeCountry((await params).cc);
  return r ? restocksMetadata(r.c, r.loc) : {};
}

export default async function Page({ params, searchParams }: PageProps<"/[cc]/restocks">) {
  const r = routeCountryForPage((await params).cc);
  if (!r) notFound();
  const c = r.c;
  return <RestocksPage country={c} searchParams={await searchParams} />;
}
