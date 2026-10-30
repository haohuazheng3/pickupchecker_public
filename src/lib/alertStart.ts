/** Where an alert setup starts: from an "Alert me" link's query (?model ?storage ?color ?store ?state ?city). */
import type { ModelKey } from "./apple/catalog";
import { wizardStartFrom } from "./wizardStart";

export interface AlertStart { model?: ModelKey; storage?: string; color?: string; store?: string; state?: string; city?: string }

/** Store slugs, state and city slugs resolved; a model only when the link named one. */
export function startFrom(get: (k: string) => string | null | undefined): AlertStart {
  const s = wizardStartFrom(get);
  return { model: s.requested ? s.initialModel : undefined, storage: s.initialStorage, color: s.initialColor, store: s.initialStore, state: s.initialState, city: s.initialCity };
}
