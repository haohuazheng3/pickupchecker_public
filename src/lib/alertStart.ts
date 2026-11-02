/** Where an alert setup starts: from an "Alert me" link's query (?model ?storage ?color ?store ?state ?city). */
import { DEFAULT_MODEL, MODELS, slugify, stateCodeOf, type ModelKey, type Store } from "./apple/catalog-us";
import { wizardStartFrom } from "./wizardStart";

export interface AlertStart { model?: ModelKey; storage?: string; color?: string; store?: string; state?: string; city?: string }

/** Store slugs, state and city slugs resolved; a model only when the link named one. */
export function startFrom(get: (k: string) => string | null | undefined): AlertStart {
  const s = wizardStartFrom(get);
  return { model: s.requested ? s.initialModel : undefined, storage: s.initialStorage, color: s.initialColor, store: s.initialStore, state: s.initialState, city: s.initialCity };
}

type PoolStore = Pick<Store, "storeNumber" | "name" | "city" | "state"> & { slug?: string; country?: Store["country"]; region?: string; regionCode?: string | null };

/**
 * The same, against another country's stores and catalogue (its pages hand both in): a store number or slug of
 * that country, a region by slug or code, a city of that region, and only configurations that country sells.
 */
export function startFromPool(get: (k: string) => string | null | undefined, stores: PoolStore[], configs: Partial<Record<ModelKey, { storage: string; color: string }[]>>): AlertStart {
  const m = get("model");
  const requested = Boolean(m && MODELS.some((x) => x.key === m));
  const model = (requested ? m : DEFAULT_MODEL) as ModelKey;
  const list = configs[model] ?? [];
  const st = get("storage");
  const storage = st && list.some((c) => c.storage === st) ? st : undefined;
  const co = get("color");
  const color = co && list.some((c) => c.color === co && (!storage || c.storage === storage)) ? co : undefined;
  const sp = get("store");
  const store = sp ? stores.find((x) => x.storeNumber === sp || x.slug === sp)?.storeNumber : undefined;
  const rp = get("state")?.toLowerCase();
  const region = rp ? stores.find((x) => slugify(x.state) === rp || stateCodeOf(x as Store).toLowerCase() === rp)?.state : undefined;
  const cp = get("city");
  const city = region && cp ? stores.find((x) => x.state === region && slugify(x.city) === cp)?.city : undefined;
  return { model: requested ? model : undefined, storage, color, store, state: region, city };
}
