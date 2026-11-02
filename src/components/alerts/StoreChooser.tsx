"use client";
/**
 * Stores: the finder — every Apple Store ranked from you, a typed ZIP / city / state, or the chosen
 * stores — with a tick per row; chosen stores outside the list follow it ("Also chosen"). Another
 * country's pages pass that country's stores in (`pool`); the dashboard can switch country.
 */
import { useState } from "react";
import type { CountryCode } from "@/lib/apple/countries";
import { StorePicker, freshPickerMemory, type PickerMemory } from "./StorePicker";
import type { PickerStore } from "./PhoneMatrix";

export function StoreChooser({ selected, onToggle, onPretick, room, preferState, preferCity, disabled = false, pool, country, known, switchable }: {
  selected: string[]; onToggle: (n: string) => void; onPretick?: (nearest: string[]) => void; room: number;
  preferState?: string; preferCity?: string; disabled?: boolean;
  pool?: PickerStore[]; country?: CountryCode; known?: PickerStore[]; switchable?: boolean;
}) {
  const [memory, setMemory] = useState<PickerMemory>(freshPickerMemory);
  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <StorePicker value={selected} onToggle={onToggle} onPretick={onPretick} room={room} preferState={preferState} preferCity={preferCity} memory={memory} onMemory={(p) => setMemory((m) => ({ ...m, ...p }))}
        pool={pool} country={country} known={known} switchable={switchable} />
    </div>
  );
}
