/** Swedish server strings (sv-se pages, and app pages for a Swedish reader). Mirrors dict/en. */
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
import { decide } from "./decide";

export const sv: Dict = { common, chrome, place, pages, views, modules, content, alerts, account, decide };
