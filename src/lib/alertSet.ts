/**
 * An account's alerts as two lists: phones (exact configurations) and stores. Every phone is watched at
 * every store, so the rules are phones × stores — the dashboard edits the two lists and the server makes
 * the rules match. Pure, so it is tested.
 */
export interface Phone { model: string; storage: string; color: string }
export interface AlertSet { phones: Phone[]; stores: string[] }
type RuleRow = { id: string; active: boolean; createdAt: Date | string; model: string; storages: string[]; colors: string[]; storeNumbers: string[] };

export const phoneKey = (p: Phone) => `${p.model}|${p.storage}|${p.color}`;
const comboKey = (p: Phone, store: string) => `${phoneKey(p)}|${store}`;
const single = (w: RuleRow) => w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1;

/** The phones and stores an account's active rules cover, oldest first. */
export function alertSetOf(rows: RuleRow[]): AlertSet {
  const live = rows.filter((w) => w.active && single(w)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id));
  const phones = new Map<string, Phone>(), stores = new Set<string>();
  for (const w of live) {
    const p = { model: w.model, storage: w.storages[0], color: w.colors[0] };
    if (!phones.has(phoneKey(p))) phones.set(phoneKey(p), p);
    stores.add(w.storeNumbers[0]);
  }
  return { phones: [...phones.values()], stores: [...stores] };
}

/**
 * What it takes to make the active rules exactly phones × stores: the combinations to create (store-major,
 * in list order, so the first store ticked is first in line for the plan) and the active rules to switch off.
 */
export function reconcile(rows: RuleRow[], want: AlertSet): { add: (Phone & { storeNumber: string })[]; retire: string[] } {
  const target = new Set(want.stores.flatMap((n) => want.phones.map((p) => comboKey(p, n))));
  const live = rows.filter((w) => w.active && single(w));
  const have = new Set(live.map((w) => comboKey({ model: w.model, storage: w.storages[0], color: w.colors[0] }, w.storeNumbers[0])));
  const add = want.stores.flatMap((n) => want.phones.filter((p) => !have.has(comboKey(p, n))).map((p) => ({ ...p, storeNumber: n })));
  const retire = live.filter((w) => !target.has(comboKey({ model: w.model, storage: w.storages[0], color: w.colors[0] }, w.storeNumbers[0]))).map((w) => w.id);
  return { add, retire };
}

/** Toggle one phone or store in a list (by key), keeping order: new ones go to the end. */
export function togglePhone(list: Phone[], p: Phone): Phone[] {
  return list.some((x) => phoneKey(x) === phoneKey(p)) ? list.filter((x) => phoneKey(x) !== phoneKey(p)) : [...list, p];
}
export function toggleStore(list: string[], n: string): string[] {
  return list.includes(n) ? list.filter((x) => x !== n) : [...list, n];
}
