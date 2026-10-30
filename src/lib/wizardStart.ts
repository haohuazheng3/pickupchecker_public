/**
 * The wizard's starting state from an "Alert me" link's query: ?model ?storage ?color ?store ?state ?city.
 * Used by the home page (deep links) and by the alert dialog (every in-site "Alert me" opens it).
 */
import { DEFAULT_MODEL, STORES, STORE_INDEX, cityBySlug, colorsFor, modelByKey, statesWithStores, storagesFor, type ModelKey } from "./apple/catalog";

export interface StartParams {
  initialModel: ModelKey;
  initialStorage?: string;
  initialColor?: string;
  initialStore?: string;
  initialState?: string;
  initialCity?: string;
}

export function wizardStartFrom(get: (key: string) => string | null | undefined): StartParams & { requested: boolean } {
  const m = get("model");
  const requested = Boolean(m && modelByKey(m));
  const model = (requested ? m : DEFAULT_MODEL) as ModelKey;
  const s = get("store");
  // A store number (R123) or the store slug the floating button reads off a store page URL.
  const initialStore = s ? (STORE_INDEX.has(s) ? s : STORES.find((x) => x.slug === s)?.storeNumber) : undefined;
  const st = get("storage");
  const initialStorage = st && storagesFor(model).includes(st) ? st : undefined;
  const c = get("color");
  const initialColor = c && colorsFor(model, initialStorage).includes(c) ? c : undefined;
  const stateParam = get("state")?.toLowerCase();
  const state = stateParam ? statesWithStores().find((x) => x.slug === stateParam || x.code.toLowerCase() === stateParam) : undefined;
  const cityParam = get("city");
  const city = state && cityParam ? cityBySlug(state.slug, cityParam) : undefined;
  return { requested, initialModel: model, initialStorage, initialColor, initialStore, initialState: state?.name, initialCity: city?.name };
}
