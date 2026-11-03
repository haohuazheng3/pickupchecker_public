import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { CityPage, cityMetadata } from "@/components/pages/CityPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores/[state]/[city]">): Promise<Metadata> {
  const { cc, ...p } = await params;
  const r = routeCountry(cc);
  return r ? cityMetadata(r.c, p, r.loc) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores/[state]/[city]">) {
  const { cc, ...p } = await params;
  const r = routeCountryForPage(cc);
  if (!r) notFound();
  const c = r.c;
  return <CityPage country={c} params={p} />;
}
