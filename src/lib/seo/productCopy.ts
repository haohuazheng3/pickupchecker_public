/** Titles, descriptions, FAQ and structured data for the product × place pages. Short, and only what the data says. */
import { PART_INDEX, catalogFor, modelByKey, stateCodeOf, appleName } from "../apple/catalog";
import type { PlaceStats, RestockStats } from "../stock/queries";
import { fitTitle, fmtDuration, fmtPrice, listWords, peakOf, plural, type FaqItem } from "./enrich";
import { inPlace, productPath, type Place, type Product } from "./products";
import type { StoreLine } from "./productData";

const BASE = "https://pickupchecker.com";

export function productTitle(product: Product, place: Place, inStock: number): string {
  const n = place.stores.length;
  if (place.level === "us") return fitTitle([...(inStock > 0 ? [`${product.name} in stock at ${plural(inStock, "Apple Store")} now`] : []), `${product.name} in-store pickup stock, live`, `${product.name} pickup stock, live`, `${product.short} pickup stock`]);
  if (place.level === "store") {
    const s = place.store!;
    const now = inStock > 0 ? "in stock now" : "pickup stock";
    return fitTitle([`${product.name} at ${appleName(s)}: ${now}`, `${product.short} at ${appleName(s)}, ${s.city}`, `${product.short} at ${appleName(s)}`, `${product.short} at ${s.name}`, `${product.short} · ${s.name.replace(/^The /, "")}`]);
  }
  return fitTitle([`${product.name} in stock in ${place.name}: ${inStock} of ${n}`, `${product.name} in ${place.name}: pickup stock`, `${product.short} in stock in ${place.name}`, `${product.short} in ${place.name}`]);
}

export function productDescription(product: Product, place: Place, inStock: number, stats: PlaceStats): string {
  const week = `${plural(stats.week, "restock")} this week`;
  if (place.level === "store") {
    const s = place.store!;
    return fitTitle([
      `${product.name} pickup stock at ${appleName(s)}, ${s.city} ${stateCodeOf(s)}: ${inStock > 0 ? "in stock now" : "not in stock right now"}, ${week}. Live status, restock times and alerts.`,
      `${product.name} at ${appleName(s)}: ${inStock > 0 ? "in stock now" : "not in stock now"}, ${week}. Live status and alerts.`,
    ], 155);
  }
  const where = place.level === "us" ? "US Apple Stores" : `Apple Stores in ${place.name}`;
  return fitTitle([
    `${product.name} pickup stock: ${inStock} of ${place.stores.length} ${where} have it now, ${week}. Live by store, restock times and alerts.`,
    `${product.name}: ${inStock} of ${place.stores.length} ${where} have it now, ${week}. Live by store and alerts.`,
  ], 155);
}

/** Three short, data-driven questions. */
export function productFaq(product: Product, place: Place, lines: StoreLine[], stats: PlaceStats, clock: RestockStats, nearest: { name: string; city: string; distance: number } | null): FaqItem[] {
  const out: FaqItem[] = [];
  const at = inPlace(place);
  const inStock = lines.filter((l) => l.available.length > 0);
  if (place.level === "store") {
    const l = lines[0];
    out.push({
      q: `Is the ${product.name} in stock ${at}?`,
      a: l && l.available.length > 0
        ? `Yes${product.parts.length > 1 ? `, ${listWords(l.available.map((i) => `${i.storage} ${i.color}`), 4)}` : ""} at the last check.`
        : `Not at the last check${nearest ? `; the nearest store with it is ${appleName(nearest)} in ${nearest.city}, ${Math.round(nearest.distance)} mi away` : ""}.`,
    });
  } else {
    out.push({
      q: `Which Apple Stores ${at} have the ${product.name}?`,
      a: inStock.length === 0
        ? `None at the last check${nearest ? `; the nearest with it is ${appleName(nearest)} in ${nearest.city}, ${Math.round(nearest.distance)} mi away` : ""}.`
        : `${plural(inStock.length, "store")} at the last check: ${listWords(inStock.map((l) => `${appleName(l.store)}`), 4)}.`,
    });
  }
  const peak = peakOf(clock);
  out.push({
    q: `How often does the ${product.name} restock ${at}?`,
    a: stats.month === 0 ? `No restock logged ${at} in the last ${stats.days} days.` : `${plural(stats.month, "restock")} in the last ${stats.days} days, ${stats.week} this week${peak ? `, most around ${peak.hour} local time` : ""}.`,
  });
  if (stats.medianMs != null) out.push({ q: `How long does it stay in stock ${at}?`, a: `About ${fmtDuration(stats.medianMs)} (median) before selling out again.` });
  return out;
}

export function productJsonLdFor(product: Product, place: Place, inStock: number) {
  const m = modelByKey(product.model)!;
  const items = catalogFor(product.model).filter((c) => product.parts.includes(c.partNumber));
  const prices = items.map((i) => i.price);
  const availability = inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const one = product.parts.length === 1 ? PART_INDEX.get(product.parts[0]) : undefined;
  return {
    "@context": "https://schema.org", "@type": "Product", name: product.name, brand: { "@type": "Brand", name: "Apple" }, model: m.name,
    ...(one ? { sku: one.partNumber, color: one.color } : {}),
    url: `${BASE}${productPath(product, place)}`,
    offers: one
      ? { "@type": "Offer", priceCurrency: "USD", price: one.price, availability, seller: { "@type": "Organization", name: "Apple" } }
      : { "@type": "AggregateOffer", priceCurrency: "USD", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: items.length, availability, seller: { "@type": "Organization", name: "Apple" } },
  };
}

export function priceLabel(product: Product): string {
  const prices = catalogFor(product.model).filter((c) => product.parts.includes(c.partNumber)).map((c) => c.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return lo === hi ? fmtPrice(lo) : `${fmtPrice(lo)}–${fmtPrice(hi)}`;
}
