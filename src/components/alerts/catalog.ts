import { MODELS, catalogFor } from "@/lib/apple/catalog";
import type { PhoneCatalog } from "./PhoneMatrix";

/** Every configuration (storage × colour × price) per model, for the phone grid. */
export function buildPhoneCatalog(): PhoneCatalog {
  const configs = {} as PhoneCatalog["configs"];
  for (const m of MODELS) configs[m.key] = catalogFor(m.key).map((c) => ({ storage: c.storage, color: c.color, price: c.price, partNumber: c.partNumber }));
  return { configs };
}
