/** 日本語クライアント文言（ブラウザへ送る純データ）。 */
import type { CDict } from "../en";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cJa: CDict = { chrome, alerts, account, install, map, modules, content };
