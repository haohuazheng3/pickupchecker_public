/** 繁體中文（香港）server strings (pages under /zh-hk). */
import type { Dict } from "../en";
import { common, panDict } from "./common";
import { chrome } from "./chrome";
import { place } from "./place";
import { pages } from "./pages";
import { views } from "./views";
import { modules } from "./modules";
import { content } from "./content";
import { alerts } from "./alerts";
import { account } from "./account";

export const zhHK: Dict = panDict({ common, chrome, place, pages, views, modules, content, alerts, account });
