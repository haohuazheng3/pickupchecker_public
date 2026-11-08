import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { routeCountry, routeCountryForPage } from "@/components/pages/locale";
import { RestockTimesPage, restockTimesMetadata, restockTimesScope } from "@/components/pages/RestockTimesPage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[cc]/iphone-duo-restock-times/[region]/[city]">): Promise<Metadata> {
  const { cc, region, city } = await params;
  const r = routeCountry(cc);
  const scope = r ? restockTimesScope(r.c.cc, region, city) : null;
  return r && scope ? restockTimesMetadata(r.c, r.loc, scope) : {};
}

/**
 * /{cc}/iphone-duo-restock-times/{region}/{city}: the country's restock-times page counted over one city's stores.
 * Only two-plus-store cities have one; the proxy 308s the rest (seo/routes.ts, content/restockPlaces.ts).
 */
export default async function Page({ params }: PageProps<"/[cc]/iphone-duo-restock-times/[region]/[city]">) {
  const { cc, region, city } = await params;
  const r = routeCountryForPage(cc);
  if (!r) notFound();
  const scope = restockTimesScope(r.c.cc, region, city);
  if (!scope) notFound();
  return <RestockTimesPage country={r.c} scope={scope} />;
}
