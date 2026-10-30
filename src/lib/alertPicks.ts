/**
 * The store step's arithmetic for a signed-in user who already has alerts: which stores start ticked, and
 * what saving the ticks would change (alerts added, existing ones switched off). Pure, so it is tested.
 */
export interface Phone { model: string; storage: string; color: string }

/** One alert: phone × store. */
export const ruleKey = (p: Phone, storeNumber: string) => `${p.model}|${p.storage}|${p.color}|${storeNumber}`;
const phoneKey = (p: Phone) => `${p.model}|${p.storage}|${p.color}`;

/** Active one-phone-one-store rules (GET /api/watches rows) as rule keys, in the order they were made. */
export function ownedKeys(rows: { active: boolean; model: string; storages: string[]; colors: string[]; storeNumbers: string[] }[]): Set<string> {
  return new Set(
    rows
      .filter((w) => w.active && w.storages.length === 1 && w.colors.length === 1 && w.storeNumbers.length === 1)
      .map((w) => ruleKey({ model: w.model, storage: w.storages[0], color: w.colors[0] }, w.storeNumbers[0])),
  );
}

/** Stores where one of these phones already has an alert, in the order the alerts were made. */
export function storesOwnedFor(owned: ReadonlySet<string>, phones: Phone[]): string[] {
  const keys = new Set(phones.map(phoneKey));
  const out: string[] = [];
  for (const k of owned) {
    const i = k.lastIndexOf("|");
    const store = k.slice(i + 1);
    if (keys.has(k.slice(0, i)) && !out.includes(store)) out.push(store);
  }
  return out;
}

/**
 * Saving `ticked` for `phones`: `added` alerts that do not exist yet, `off` existing ones whose store was
 * unticked (in `offStores`). With no phone picked yet, every ticked store counts as one new alert.
 */
export function pickDelta(phones: Phone[], ticked: string[], owned: ReadonlySet<string> | null): { added: number; off: number; offStores: string[] } {
  if (phones.length === 0) return { added: ticked.length, off: 0, offStores: [] };
  const mine = owned ? storesOwnedFor(owned, phones) : [];
  const offStores = mine.filter((n) => !ticked.includes(n));
  let added = 0, off = 0;
  for (const p of phones) {
    for (const n of ticked) if (!owned?.has(ruleKey(p, n))) added++;
    for (const n of offStores) if (owned?.has(ruleKey(p, n))) off++;
  }
  return { added, off, offStores };
}
