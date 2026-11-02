import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { ProductPage, productMetadata, type ProductParams } from "@/components/pages/ProductPage";

export const dynamic = "force-dynamic";

type Params = ProductParams & { cc: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  return c ? productMetadata(c, p) : {};
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { cc, ...p } = await params;
  const c = countryFromPrefix(cc);
  if (!c) notFound();
  return <ProductPage country={c} params={p} />;
}
