/** نصوص الخادم بالعربية (/ar-ae/… وصفحات التطبيق لمن اختار العربية). البنية والنوع نفسهما في dict/en. */
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

export const ar: Dict = { common, chrome, place, pages, views, modules, content, alerts, account, decide };
