import type { Metadata } from "next";
import { STORES, STORE_INDEX, STATE_CODES, stateCodeOf, storePath, cityPath, statePath, modelByKey, DEFAULT_MODEL, type ModelKey } from "@/lib/apple/catalog";
import { mapSnapshot } from "@/lib/stock/queries";
import { StockMap, type MapStore, type MapFocus } from "@/components/map/StockMap";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "iPhone Duo pickup stock map — every US Apple Store, live",
  description: "A live map of all 269 US Apple Stores showing where the iPhone Duo, 18 Pro and 18 Pro Max are available for in-store pickup right now, by storage and color. Tap any store for its page, restock times and history.",
  alternates: { canonical: "/map" },
};

/** ?store=R095 · ?stores=R095,R032 · ?state=NY · ?model=duo|18-pro|18-pro-max|all — all optional. */
export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const sp = await searchParams;
  const stores: MapStore[] = STORES.map((s) => ({ n: s.storeNumber, name: s.name, city: s.city, state: s.state, code: stateCodeOf(s), path: storePath(s), cityHref: cityPath(s.state, s.city), stateHref: statePath(s.state), lat: s.lat, lng: s.lng }));
  const modelParam = typeof sp.model === "string" ? sp.model : "";
  const focus: MapFocus = {
    model: modelParam === "all" ? "all" : modelByKey(modelParam) ? (modelParam as ModelKey) : DEFAULT_MODEL,
    store: typeof sp.store === "string" && STORE_INDEX.has(sp.store) ? sp.store : undefined,
    stores: typeof sp.stores === "string" ? sp.stores.split(",").filter((n) => STORE_INDEX.has(n)) : undefined,
    stateCode: typeof sp.state === "string" && Object.values(STATE_CODES).includes(sp.state.toUpperCase()) ? sp.state.toUpperCase() : undefined,
  };
  const initial = await mapSnapshot();
  return <StockMap stores={stores} initial={initial} focus={focus} />;
}
