import { MODELS, PART_INDEX, catalogFor, modelByKey, modelKeyFor, type ModelKey } from "@/lib/apple/catalog";
import { modelStock } from "@/lib/stock/queries";
import { alertHref } from "@/lib/seo/enrich";
import type { Product } from "@/lib/seo/products";
import { QuickCheck, type QuickCheckData } from "./QuickCheck";

async function stockFor(model: ModelKey, parts?: Set<string>): Promise<Record<string, number>> {
  const rows = await modelStock(model);
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.status !== "available") continue;
    if (parts && !parts.has(r.partNumber)) continue;
    const item = PART_INDEX.get(r.partNumber);
    if (!item || modelKeyFor(item.model) !== model) continue;
    out[r.storeNumber] = (out[r.storeNumber] ?? 0) + 1;
  }
  return out;
}

/**
 * Server half of the first-screen checker. With a model: all three models, switchable. With a product
 * (a color or storage page): that product only, counting just its configurations.
 */
export async function QuickCheckServer({ model, product }: { model: ModelKey; product?: Product }) {
  if (product && product.kind !== "model") {
    const key = product.model;
    const m = modelByKey(key)!;
    const data: QuickCheckData = {
      stock: { [key]: await stockFor(key, new Set(product.parts)) } as Record<ModelKey, Record<string, number>>,
      configs: { [key]: product.parts.length } as Record<ModelKey, number>,
      models: [{ key, name: m.name, short: m.short }],
      alerts: { [key]: alertHref({ model: key, storage: product.storage, color: product.color }) } as Record<ModelKey, string>,
      slugs: { [key]: product.slug } as Record<ModelKey, string>,
      label: product.name,
    };
    return <QuickCheck data={data} initialModel={key} />;
  }
  const counts = await Promise.all(MODELS.map((m) => stockFor(m.key)));
  const data: QuickCheckData = {
    stock: Object.fromEntries(MODELS.map((m, i) => [m.key, counts[i]])) as Record<ModelKey, Record<string, number>>,
    configs: Object.fromEntries(MODELS.map((m) => [m.key, catalogFor(m.key).length])) as Record<ModelKey, number>,
    models: MODELS.map((m) => ({ key: m.key, name: m.name, short: m.short })),
    alerts: Object.fromEntries(MODELS.map((m) => [m.key, alertHref({ model: m.key })])) as Record<ModelKey, string>,
    slugs: Object.fromEntries(MODELS.map((m) => [m.key, m.slug])) as Record<ModelKey, string>,
  };
  return <QuickCheck data={data} initialModel={model} />;
}
