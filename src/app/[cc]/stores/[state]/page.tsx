import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { RegionPage, regionMetadata } from "@/components/pages/RegionPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/stores/[state]">): Promise<Metadata> {
  const { cc, ...p } = await params;
  const r = routeCountry(cc);
  return r ? regionMetadata(r.c, p, r.loc) : {};
}

export default async function Page({ params }: PageProps<"/[cc]/stores/[state]">) {
  const { cc, ...p } = await params;
  const r = routeCountryForPage(cc);
  if (!r) notFound();
  const c = r.c;
  return <RegionPage country={c} params={p} />;
}
