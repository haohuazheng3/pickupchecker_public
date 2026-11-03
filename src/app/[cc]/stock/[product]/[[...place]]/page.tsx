import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { ProductPage, productMetadata, type ProductParams } from "@/components/pages/ProductPage";

export const dynamic = "force-dynamic";

type Params = ProductParams & { cc: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cc, ...p } = await params;
  const r = routeCountry(cc);
  return r ? productMetadata(r.c, p, r.loc) : {};
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { cc, ...p } = await params;
  const r = routeCountryForPage(cc);
  if (!r) notFound();
  const c = r.c;
  return <ProductPage country={c} params={p} />;
}
