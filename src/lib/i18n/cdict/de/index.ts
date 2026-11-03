/** German client strings (Switzerland reads them with ß → ss via derive.swiss). Plain data only. */
import type { CDict } from "../en";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cDe: CDict = { chrome, alerts, account, install, map, modules, content };
