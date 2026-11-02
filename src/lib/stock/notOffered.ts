/**
 * Stores Apple offers no pickup lookups for. Asked on its own (`store=R###`, the per-store round of the other
 * countries), Apple answers some stores — R384 Chermside, Australia, on 2026-11-02 — with HTTP 200, an empty
 * store list and body.errorMessage "There is no store associated with this search. Please try another search
 * value." (client.ts isNoStoreAnswer). Asking again in 15 s changes nothing, so that answer is an outcome of its
 * own, not a failure: no retry, no poll_log row, no error group, no share in a country's backoff.
 *
 * Two such answers in a row mark the store (one alone could be a blip); a marked store is left out of the rounds
 * and asked once every NOT_OFFERED_RECHECK_MS, so the day Apple turns its lookups back on it rejoins every round.
 * Any answer that lists the store clears the mark at once.
 *
 * Where it lives: poller_state, key NOT_OFFERED_KEY — one small JSON row ({ stores: { R384: {…} } }) written only
 * when the set changes or a marked store is re-asked (≤ 2 writes an hour per store), read by the poller when its
 * loop starts and by the store page (queries.ts pickupLookupOff, cached 60 s). No table and no store_sku_status
 * rows: a store that never answered keeps having none, and the page tells why.
 *
 * Pure (tested).
 */

export const NOT_OFFERED_KEY = "pickup:not-offered";
/** A marked store is asked again this often. */
export const NOT_OFFERED_RECHECK_MS = 30 * 60_000;

/** One marked store as persisted (and as the store page reads it). Times are ISO. */
export interface PickupOffEntry { country: string; message: string; since: string; checkedAt: string }
/** The poller's view: the persisted stores (confirmed) plus first sightings waiting for a second answer. */
export interface NotOfferedEntry extends PickupOffEntry { confirmed: boolean }
export type NotOfferedState = Record<string, NotOfferedEntry>;

/** What one round of per-store requests said: Apple's "no store" answers (store → country and message) and the stores it answered with. */
export interface NotOfferedRound { notOffered: Record<string, { country: string; message: string }>; answered: Iterable<string> }

/** Is this store asked in the next round? Yes unless it is marked and was asked less than NOT_OFFERED_RECHECK_MS ago. */
export function notOfferedDue(state: NotOfferedState, store: string, now: number): boolean {
  const e = Object.hasOwn(state, store) ? state[store] : undefined;
  return !e || !e.confirmed || now - Date.parse(e.checkedAt) >= NOT_OFFERED_RECHECK_MS;
}

/**
 * The state after a round. A store that answered is cleared. A "no store" answer holds a store on its first
 * sighting, marks it on the next, and only refreshes `checkedAt` once it is marked. A store whose request failed,
 * or that was not asked, keeps what it had. `marked` / `cleared` / `rechecked` say what to log and persist.
 */
export function nextNotOffered(prev: NotOfferedState, round: NotOfferedRound, now: Date): { state: NotOfferedState; marked: string[]; cleared: string[]; rechecked: string[] } {
  const state: NotOfferedState = { ...prev };
  const marked: string[] = [], cleared: string[] = [], rechecked: string[] = [];
  const iso = now.toISOString();
  const answered = new Set(round.answered);
  for (const store of answered) {
    if (!Object.hasOwn(state, store)) continue;
    if (state[store].confirmed) cleared.push(store);
    delete state[store];
  }
  for (const [store, a] of Object.entries(round.notOffered)) {
    if (answered.has(store)) continue; // another batch of the same round listed it: it is offered
    const e = Object.hasOwn(state, store) ? state[store] : undefined;
    if (!e) state[store] = { country: a.country, message: a.message, since: iso, checkedAt: iso, confirmed: false };
    else if (!e.confirmed) { state[store] = { ...e, message: a.message, checkedAt: iso, confirmed: true }; marked.push(store); }
    else { state[store] = { ...e, message: a.message, checkedAt: iso }; rechecked.push(store); }
  }
  return { state, marked: marked.sort(), cleared: cleared.sort(), rechecked: rechecked.sort() };
}

/** The poller_state value: the marked stores only. */
export function persistNotOffered(state: NotOfferedState): { stores: Record<string, PickupOffEntry> } {
  const stores: Record<string, PickupOffEntry> = {};
  for (const [store, e] of Object.entries(state)) if (e.confirmed) stores[store] = { country: e.country, message: e.message, since: e.since, checkedAt: e.checkedAt };
  return { stores };
}

/** The marked stores in a poller_state value; anything malformed is left out. */
export function parseNotOffered(value: unknown): Record<string, PickupOffEntry> {
  const raw = (value as { stores?: unknown } | null | undefined)?.stores;
  const out: Record<string, PickupOffEntry> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [store, v] of Object.entries(raw as Record<string, unknown>)) {
    const e = v as Partial<PickupOffEntry> | null;
    if (!/^R\d{3,4}$/.test(store) || !e || typeof e.since !== "string" || typeof e.checkedAt !== "string" || !Number.isFinite(Date.parse(e.checkedAt))) continue;
    out[store] = { country: String(e.country ?? ""), message: String(e.message ?? ""), since: e.since, checkedAt: e.checkedAt };
  }
  return out;
}

/** The poller's state from a persisted value, limited to the stores it polls (a country taken off POLL_COUNTRIES drops out). */
export function restoreNotOffered(value: unknown, polled: Set<string>): NotOfferedState {
  const state: NotOfferedState = {};
  for (const [store, e] of Object.entries(parseNotOffered(value))) if (polled.has(store)) state[store] = { ...e, confirmed: true };
  return state;
}
