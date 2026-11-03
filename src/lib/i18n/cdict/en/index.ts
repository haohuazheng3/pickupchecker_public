/**
 * English strings for client components (bundled). Plain data only: another language's copy reaches the browser
 * as props from the root layout, so placeholders are "{n}" (format.fill), plural forms { one, other } (format.plural),
 * and **bold** marks emphasis (Rich).
 */
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cen = { chrome, alerts, account, install, map, modules, content };
export type CDict = typeof cen;
