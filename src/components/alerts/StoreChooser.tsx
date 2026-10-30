"use client";
/**
 * Stores: the chosen ones as chips (× takes one off), then the finder — every Apple Store ranked by
 * distance from you, a typed ZIP / city / state, or the chosen stores — with a tick per row.
 */
import { useState } from "react";
import { STORES, STORE_INDEX, stateCodeOf } from "@/lib/apple/catalog";
import { StorePicker, freshPickerMemory, type PickerMemory } from "./StorePicker";

/** Store names that more than one store has: their chips add the state. */
const SHARED = new Set(STORES.map((s) => s.name).filter((n, i, all) => all.indexOf(n) !== i));

export function StoreChooser({ selected, onToggle, onPretick, room, preferState, preferCity, disabled = false }: {
  selected: string[]; onToggle: (n: string) => void; onPretick?: (nearest: string[]) => void; room: number;
  preferState?: string; preferCity?: string; disabled?: boolean;
}) {
  const [memory, setMemory] = useState<PickerMemory>(freshPickerMemory);
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      {selected.length > 0 && (
        <ul className="mb-4 flex flex-wrap gap-1.5" aria-label="Chosen stores">
          {selected.map((n) => {
            const s = STORE_INDEX.get(n);
            return (
              <li key={n}>
                <button type="button" onClick={() => onToggle(n)} className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-0.5 pl-2.5 pr-1.5 text-xs hover:border-accent" style={{ color: "var(--ink)" }} aria-label={`Remove ${s?.name ?? n}`}>
                  {s?.name ?? n}{s && SHARED.has(s.name) && <span className="text-ink-3">{stateCodeOf(s)}</span>}<span className="text-ink-3" aria-hidden>×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <StorePicker value={selected} onToggle={onToggle} onPretick={onPretick} room={room} preferState={preferState} preferCity={preferCity} memory={memory} onMemory={(p) => setMemory((m) => ({ ...m, ...p }))} />
    </div>
  );
}
