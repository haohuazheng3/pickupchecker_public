/** 한국어 클라이언트 문구(번들). 순수 데이터만: 자리표시자 "{n}", 복수형 { other }, **굵게**. */
import type { CDict } from "../en";
import { chrome } from "./chrome";
import { alerts } from "./alerts";
import { account } from "./account";
import { install } from "./install";
import { map } from "./map";
import { modules } from "./modules";
import { content } from "./content";

export const cKo: CDict = { chrome, alerts, account, install, map, modules, content };
