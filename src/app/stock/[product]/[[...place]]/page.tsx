import type { Metadata } from "next";
import { US } from "@/lib/apple/countries";
import { ProductPage, productMetadata, type ProductParams } from "@/components/pages/ProductPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<ProductParams> }): Promise<Metadata> {
  return productMetadata(US, await params);
}

export default async function Page({ params }: { params: Promise<ProductParams> }) {
  return <ProductPage country={US} params={await params} />;
}
