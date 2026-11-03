import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryFromPrefix } from "@/lib/apple/countries";
import { RestockTimesPage, restockTimesMetadata } from "@/components/pages/RestockTimesPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/iphone-duo-restock-times">): Promise<Metadata> {
  const c = countryFromPrefix((await params).cc);
  return c ? restockTimesMetadata(c) : {};
}

/** /{cc}/iphone-duo-restock-times: the same page for another country's Apple Stores. */
export default async function Page({ params }: PageProps<"/[cc]/iphone-duo-restock-times">) {
  const c = countryFromPrefix((await params).cc);
  if (!c) notFound();
  return <RestockTimesPage country={c} />;
}
