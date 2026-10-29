import { MODELS, storagesFor, colorsFor, catalogFor, type ModelKey } from "@/lib/apple/catalog";
import { Wizard, type WizardCatalog } from "./Wizard";

export function buildWizardCatalog(): WizardCatalog {
  const storages = {} as WizardCatalog["storages"];
  const colors = {} as WizardCatalog["colors"];
  const prices = {} as WizardCatalog["prices"];
  for (const m of MODELS) {
    storages[m.key] = storagesFor(m.key);
    colors[m.key] = colorsFor(m.key);
    prices[m.key] = Math.min(...catalogFor(m.key).map((c) => c.price));
  }
  return { storages, colors, prices };
}

export function WizardServer({ initialModel, initialStore, startSignIn, next }: { initialModel?: ModelKey; initialStore?: string; startSignIn?: boolean; next?: string }) {
  return <Wizard catalog={buildWizardCatalog()} initialModel={initialModel} initialStore={initialStore} startSignIn={startSignIn} next={next} />;
}
