import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceRestockTimesPage, cityPlaceOf, placeRestockTimesMetadata, restockPlaces } from "@/components/pages/PlaceRestockTimesPage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return restockPlaces().cities.map((p) => ({ state: p.stateSlug, city: p.citySlug! }));
}

export async function generateMetadata({ params }: PageProps<"/iphone-duo-restock-times/[state]/[city]">): Promise<Metadata> {
  const { state, city } = await params;
  const place = cityPlaceOf(state, city);
  return place ? placeRestockTimesMetadata(place) : {};
}

/** /iphone-duo-restock-times/{state}/{city}: when the Apple Stores of one two-plus-store US city restock the iPhone Duo. */
export default async function Page({ params }: PageProps<"/iphone-duo-restock-times/[state]/[city]">) {
  const { state, city } = await params;
  const place = cityPlaceOf(state, city);
  if (!place) notFound(); // the proxy answered 404 / 308 before this streamed; the backstop
  return <PlaceRestockTimesPage place={place} />;
}
