/**
 * English server strings: the source text and the type every language follows. One file per area so work on
 * different areas never touches the same file; every other language mirrors this folder (dict/<lang>/…).
 * Values are strings or functions returning strings / React nodes (server only, never sent to the browser).
 */
import { common } from "./common";
import { chrome } from "./chrome";
import { place } from "./place";
import { pages } from "./pages";
import { modules } from "./modules";
import { content } from "./content";
import { alerts } from "./alerts";
import { account } from "./account";
import { views } from "./views";

export const en = { common, chrome, place, pages, views, modules, content, alerts, account };
export type Dict = typeof en;
