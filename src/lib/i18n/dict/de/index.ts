/** German server strings (Germany, Austria; Switzerland reads them with ß → ss via derive.swiss). */
import type { Dict } from "../en";
import { common } from "./common";
import { chrome } from "./chrome";
import { place } from "./place";
import { pages } from "./pages";
import { modules } from "./modules";
import { content } from "./content";
import { alerts } from "./alerts";
import { account } from "./account";
import { views } from "./views";

export const de: Dict = { common, chrome, place, pages, views, modules, content, alerts, account };
