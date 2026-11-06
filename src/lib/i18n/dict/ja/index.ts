/** 日本語のサーバー文言（/ja-jp/… と、日本語を選んだ人のアプリページ）。英語 dict/en と同じ構成・同じ型。 */
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

export const ja: Dict = { common, chrome, place, pages, views, modules, content, alerts, account, decide };
