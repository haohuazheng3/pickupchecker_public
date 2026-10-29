"use client";
/** Thin wrapper over the FlowGlance snippet's global; safe when the script is absent. */
type Fw = (event: string, props?: Record<string, unknown>) => void;
export function track(event: string, props?: Record<string, unknown>) {
  const w = window as unknown as { fw?: Fw };
  try { w.fw?.(event, props); } catch { /* ignore */ }
}
