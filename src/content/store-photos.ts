/**
 * Two photos per store page. None of them pretends to show the store itself, except Apple Fifth Avenue,
 * whose glass cube Pexels has; Manhattan stores get a Manhattan street. Everything else gets the pickup
 * counter plus one buying-context photo, picked deterministically by store number.
 */
import type { Store } from "@/lib/apple/catalog";

const CONTEXT = ["phone-map", "phone-card-payment", "phone-on-box", "city-map-phone", "phone-notification"];

export function storePhotos(s: Pick<Store, "slug" | "city" | "state" | "storeNumber">): [string, string] {
  if (s.slug === "fifthavenue") return ["apple-fifth-avenue-cube", "apple-fifth-avenue-taxi"];
  if (s.city === "New York" && s.state === "New York") return ["nyc-street", "apple-store-pickup-counter"];
  const n = [...s.storeNumber].reduce((a, c) => a + c.charCodeAt(0), 0);
  return ["apple-store-pickup-counter", CONTEXT[n % CONTEXT.length]];
}
