/** 台灣中文（zh-TW）的客戶端字串：純資料，與 cdict/en 同樣的分區與型別。 */
import type { CDict } from "../en";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cZhTW: CDict = { chrome, alerts, account, install, map, modules, content };
