/** نصوص العميل بالعربية (بيانات خام تُرسل إلى المتصفح). */
import type { CDict } from "../en";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cAr: CDict = { chrome, alerts, account, install, map, modules, content };
/** The same, under the name the brief gives it. */
export const ar = cAr;
