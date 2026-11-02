/**
 * The other 18 countries' static Apple data, imported statically (Next and the poller's esbuild graph only see
 * files that are imported by name; a directory read at run time would bundle nothing and fingerprint nothing).
 * They live in data/apple/<cc>/ (generated from apple.com, docs/i18n.md §0); the US files keep their original
 * place (data/apple/*.json) and are read by catalog-us.ts. catalog.ts turns these rows into typed stores and
 * catalogue items — read them from there, not from here. Server-side only: client modules import catalog-us.ts.
 */
import caCatalog from "../../../data/apple/ca/catalog.json";
import caStores from "../../../data/apple/ca/stores.json";
import ukCatalog from "../../../data/apple/uk/catalog.json";
import ukStores from "../../../data/apple/uk/stores.json";
import auCatalog from "../../../data/apple/au/catalog.json";
import auStores from "../../../data/apple/au/stores.json";
import deCatalog from "../../../data/apple/de/catalog.json";
import deStores from "../../../data/apple/de/stores.json";
import frCatalog from "../../../data/apple/fr/catalog.json";
import frStores from "../../../data/apple/fr/stores.json";
import itCatalog from "../../../data/apple/it/catalog.json";
import itStores from "../../../data/apple/it/stores.json";
import esCatalog from "../../../data/apple/es/catalog.json";
import esStores from "../../../data/apple/es/stores.json";
import jpCatalog from "../../../data/apple/jp/catalog.json";
import jpStores from "../../../data/apple/jp/stores.json";
import krCatalog from "../../../data/apple/kr/catalog.json";
import krStores from "../../../data/apple/kr/stores.json";
import hkCatalog from "../../../data/apple/hk/catalog.json";
import hkStores from "../../../data/apple/hk/stores.json";
import sgCatalog from "../../../data/apple/sg/catalog.json";
import sgStores from "../../../data/apple/sg/stores.json";
import aeCatalog from "../../../data/apple/ae/catalog.json";
import aeStores from "../../../data/apple/ae/stores.json";
import chCatalog from "../../../data/apple/ch/catalog.json";
import chStores from "../../../data/apple/ch/stores.json";
import nlCatalog from "../../../data/apple/nl/catalog.json";
import nlStores from "../../../data/apple/nl/stores.json";
import seCatalog from "../../../data/apple/se/catalog.json";
import seStores from "../../../data/apple/se/stores.json";
import twCatalog from "../../../data/apple/tw/catalog.json";
import twStores from "../../../data/apple/tw/stores.json";
import atCatalog from "../../../data/apple/at/catalog.json";
import atStores from "../../../data/apple/at/stores.json";
import beCatalog from "../../../data/apple/be/catalog.json";
import beStores from "../../../data/apple/be/stores.json";
import type { CountryCode } from "./countries";
import type { RawCatalogItem, RawIntlStore } from "./catalog-core";

export type { RawCatalogItem, RawIntlStore, RawUsStore } from "./catalog-core";

export const RAW_INTL_STORES: Record<Exclude<CountryCode, "us">, RawIntlStore[]> = {
  ca: caStores, uk: ukStores, au: auStores, de: deStores, fr: frStores, it: itStores, es: esStores, jp: jpStores, kr: krStores,
  hk: hkStores, sg: sgStores, ae: aeStores, ch: chStores, nl: nlStores, se: seStores, tw: twStores, at: atStores, be: beStores,
};

export const RAW_INTL_CATALOG: Record<Exclude<CountryCode, "us">, RawCatalogItem[]> = {
  ca: caCatalog, uk: ukCatalog, au: auCatalog, de: deCatalog, fr: frCatalog, it: itCatalog, es: esCatalog, jp: jpCatalog, kr: krCatalog,
  hk: hkCatalog, sg: sgCatalog, ae: aeCatalog, ch: chCatalog, nl: nlCatalog, se: seCatalog, tw: twCatalog, at: atCatalog, be: beCatalog,
};
