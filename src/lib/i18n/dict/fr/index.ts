/**
 * Chaînes serveur françaises (France, Belgique, Suisse, Canada ; fr-CA lit ce dictionnaire). Écrites avec des espaces
 * ordinaires ; la typographie française (espace insécable avant : et », fine avant ; ? ! %, après «) est appliquée
 * ici une fois pour tout le dictionnaire, chaînes et fonctions (texte React compris).
 */
import type { Dict } from "../en";
import { mapDict } from "../../derive";
import { typo } from "./util";
import { common } from "./common";
import { chrome } from "./chrome";
import { place } from "./place";
import { pages } from "./pages";
import { views } from "./views";
import { modules } from "./modules";
import { content } from "./content";
import { alerts } from "./alerts";
import { account } from "./account";

export const fr: Dict = mapDict<Dict>({ common, chrome, place, pages, views, modules, content, alerts, account }, typo);
