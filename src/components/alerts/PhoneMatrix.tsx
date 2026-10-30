"use client";
/**
 * Phones: a tab per model and, under it, every exact configuration as a grid — storage down the side,
 * colour across the top. Ticking a cell adds that phone (to every chosen store), unticking removes it.
 */
import { useState } from "react";
import { COLOR_META, MODELS, STORAGE_ORDER, type ModelKey } from "@/lib/apple/catalog";
import { phoneKey, type Phone } from "@/lib/alertSet";

export interface PhoneCatalog { configs: Record<ModelKey, { storage: string; color: string; price: number; partNumber: string }[]> }

export function PhoneMatrix({ catalog, selected, onToggle, initialModel, disabled = false }: {
  catalog: PhoneCatalog; selected: Phone[]; onToggle: (p: Phone) => void; initialModel?: ModelKey; disabled?: boolean;
}) {
  const firstPicked = selected[0]?.model as ModelKey | undefined;
  const [model, setModel] = useState<ModelKey>(initialModel ?? firstPicked ?? MODELS[0].key);
  const configs = catalog.configs[model] ?? [];
  const storages = STORAGE_ORDER.filter((s) => configs.some((c) => c.storage === s));
  const colors = [...new Set(configs.map((c) => c.color))];
  const picked = new Set(selected.map(phoneKey));
  const countFor = (m: ModelKey) => selected.filter((p) => p.model === m).length;
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Model">
        {MODELS.map((m) => {
          const n = countFor(m.key);
          return (
            // Colour inline: the global `button { color: inherit }` outranks a text-* utility.
            <button key={m.key} type="button" role="tab" aria-selected={model === m.key} onClick={() => setModel(m.key)} style={{ color: model === m.key ? "var(--on-ink)" : "var(--ink-2)" }}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${model === m.key ? "border-ink bg-ink" : "border-line-2 hover:border-ink/30"}`}>
              {m.name}{n > 0 && <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${model === m.key ? "bg-on-ink/20" : "bg-accent/15 text-accent"}`}>{n}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-4 max-w-2xl overflow-x-auto">
        <table className="w-full min-w-[18rem] border-separate border-spacing-1.5 text-sm" aria-label={`${MODELS.find((m) => m.key === model)?.name} configurations`}>
          <thead>
            <tr>
              <th className="w-16" />
              {colors.map((c) => (
                <th key={c} scope="col" className="pb-1 text-center align-bottom text-xs font-medium text-ink-2">
                  <span className="mx-auto mb-1 block h-4 w-4 rounded-full border border-ink/15" style={{ background: COLOR_META[c]?.hex ?? "#888" }} aria-hidden />
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {storages.map((s) => (
              <tr key={s}>
                <th scope="row" className="pr-1 text-left text-xs font-semibold text-ink-2">{s}</th>
                {colors.map((c) => {
                  const cfg = configs.find((x) => x.storage === s && x.color === c);
                  if (!cfg) return <td key={c} />;
                  const p = { model, storage: s, color: c };
                  const on = picked.has(phoneKey(p));
                  return (
                    <td key={c} className="p-0">
                      <button type="button" role="checkbox" aria-checked={on} aria-label={`${s} ${c}`} disabled={disabled} onClick={() => onToggle(p)} style={{ color: on ? "var(--ink)" : "var(--ink-3)" }}
                        className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl border text-xs transition disabled:opacity-50 ${on ? "border-accent bg-accent/10" : "border-line-2 hover:border-ink/30"}`}>
                        <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border text-[10px] font-bold ${on ? "border-accent bg-accent" : "border-ink/25"}`} style={on ? { color: "var(--accent-ink)" } : undefined} aria-hidden>{on ? "✓" : ""}</span>
                        <span className="tabular-nums">${cfg.price.toLocaleString("en-US")}</span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** "iPhone Duo 256GB Night Sky", or "Duo 256GB Night Sky" short. */
export function phoneName(p: Phone, short = false): string {
  const m = MODELS.find((x) => x.key === p.model);
  return `${short ? m?.short ?? p.model : m?.name ?? p.model} ${p.storage} ${p.color}`;
}
