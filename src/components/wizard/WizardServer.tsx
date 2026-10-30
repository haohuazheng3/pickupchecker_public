import { MODELS, catalogFor } from "@/lib/apple/catalog";
import { Wizard, type WizardCatalog, type WizardStart } from "./Wizard";

/** Every configuration (storage × colour × price) per model: the wizard filters colours by storage from it. */
export function buildWizardCatalog(): WizardCatalog {
  const configs = {} as WizardCatalog["configs"];
  const prices = {} as WizardCatalog["prices"];
  for (const m of MODELS) {
    configs[m.key] = catalogFor(m.key).map((c) => ({ storage: c.storage, color: c.color, price: c.price, partNumber: c.partNumber }));
    prices[m.key] = Math.min(...configs[m.key].map((c) => c.price));
  }
  return { configs, prices };
}

export function WizardServer(props: WizardStart) {
  return <Wizard catalog={buildWizardCatalog()} {...props} />;
}
