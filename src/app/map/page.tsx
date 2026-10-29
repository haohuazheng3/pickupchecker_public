import type { Metadata } from "next";
import { STORES, stateCodeOf, stateSlug } from "@/lib/apple/catalog";
import { mapSnapshot } from "@/lib/stock/queries";
import { StockMap, type MapStore } from "@/components/map/StockMap";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "iPhone pickup stock map — every US Apple Store, live",
  description: "A live map of all 269 US Apple Stores showing where the iPhone 18 Pro, Pro Max and Duo are available for in-store pickup right now, by storage and color.",
  alternates: { canonical: "/map" },
};

export default async function MapPage() {
  const stores: MapStore[] = STORES.map((s) => ({ n: s.storeNumber, name: s.name, city: s.city, state: s.state, code: stateCodeOf(s), slug: `${stateSlug(s.state)}/${s.slug}`, lat: s.lat, lng: s.lng }));
  const initial = await mapSnapshot();
  return <StockMap stores={stores} initial={initial} />;
}
