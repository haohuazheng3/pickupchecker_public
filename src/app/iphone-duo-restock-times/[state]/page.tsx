import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceRestockTimesPage, placeRestockTimesMetadata, restockPlaces, statePlaceOf } from "@/components/pages/PlaceRestockTimesPage";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return restockPlaces().states.map((p) => ({ state: p.stateSlug }));
}

export async function generateMetadata({ params }: PageProps<"/iphone-duo-restock-times/[state]">): Promise<Metadata> {
  const place = statePlaceOf((await params).state);
  return place ? placeRestockTimesMetadata(place) : {};
}

/** /iphone-duo-restock-times/{state}: when the Apple Stores of one US state restock the iPhone Duo, hour by hour. */
export default async function Page({ params }: PageProps<"/iphone-duo-restock-times/[state]">) {
  const place = statePlaceOf((await params).state);
  if (!place) notFound(); // the proxy answered 404 / 308 before this streamed; the backstop
  return <PlaceRestockTimesPage place={place} />;
}
