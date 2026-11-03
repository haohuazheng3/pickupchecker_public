/**
 * Chaînes client françaises (données brutes envoyées au navigateur). La typographie française (espaces insécables
 * avant : ; ? ! % et dans « ») est appliquée ici, sur les chaînes, une fois pour toutes.
 */
import type { CDict } from "../en";
import { typoData } from "../../dict/fr/util";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cFr: CDict = typoData<CDict>({ chrome, alerts, account, install, map, modules, content });
