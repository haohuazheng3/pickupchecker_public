/** The live map of a country (/map, /{cc}/map): ?store=R095 · ?stores=R095,R032 · ?state=NY · ?model=duo|18-pro|18-pro-max|all — all optional. */
import type { Metadata } from "next";
import { storesOf, storeInCountry, stateCodeOf, storePath, cityPath, statePath, modelByKey, modelKeyFor, catalogOf, DEFAULT_MODEL, mapPath, type ModelKey } from "@/lib/apple/catalog";
import type { Country } from "@/lib/apple/countries";
import { mapSnapshot } from "@/lib/stock/queries";
import { StockMap, type MapStore, type MapFocus, type MapCountry } from "@/components/map/StockMap";
import { LinkRow, RelatedBlock } from "@/components/seo/Related";
import { BrowseCountryModels } from "@/components/seo/CountryBrowse";
import { englishLocale, pathInLocale, type Locale } from "@/lib/i18n/locales";
import { dict } from "@/lib/i18n/dict";
import { pageLocale, t } from "@/lib/i18n/server";
import { cityLabel, regionLabel, storeLabel } from "@/lib/i18n/places";

export function mapMetadata(c: Country, loc: Locale = englishLocale(c.cc)): Metadata {
  if (c.cc === "us") {
    return {
      title: "iPhone Duo pickup stock map — every US Apple Store, live",
      description: "Live map of all 269 US Apple Stores with iPhone Duo, 18 Pro and Pro Max in-store pickup stock right now, by storage and color.",
      alternates: { canonical: "/map" },
    };
  }
  const V = dict(loc.lang).views.map;
  const n = storesOf(c.cc).length;
  return {
    title: V.metaTitle(c, n),
    description: V.metaDescription(c, n),
    alternates: { canonical: loc.native ? pathInLocale(mapPath(c.cc), loc) : mapPath(c.cc) },
  };
}

export async function MapPage({ country: c, searchParams: sp }: { country: Country; searchParams: Record<string, string | string[] | undefined> }) {
  const cc = c.cc;
  const lang = pageLocale().lang;
  const D = t().views;
  const V = D.map;
  const all = storesOf(cc);
  // Names in the page's language (English: as they are); paths stay English, links move them to the reader's language.
  const stores: MapStore[] = all.map((s) => ({ n: s.storeNumber, name: storeLabel(s, lang), city: cityLabel(cc, s.city, lang), state: regionLabel(cc, s.state, lang), code: stateCodeOf(s), path: storePath(s), cityHref: cityPath(s.state, s.city, cc), stateHref: statePath(s.state, cc), lat: s.lat, lng: s.lng }));
  const modelParam = typeof sp.model === "string" ? sp.model : "";
  const codes = new Set(stores.map((s) => s.code));
  const st = typeof sp.state === "string" ? sp.state : undefined;
  const focus: MapFocus = {
    model: modelParam === "all" ? "all" : modelByKey(modelParam) ? (modelParam as ModelKey) : DEFAULT_MODEL,
    store: typeof sp.store === "string" && storeInCountry(sp.store, cc) ? sp.store : undefined,
    stores: typeof sp.stores === "string" ? sp.stores.split(",").filter((n) => storeInCountry(n, cc)) : undefined,
    // US state codes upper-case; another country's region code or name as its pages link it.
    stateCode: st && codes.has(cc === "us" ? st.toUpperCase() : st) ? (cc === "us" ? st.toUpperCase() : st) : undefined,
  };
  const initial = await mapSnapshot(cc);
  const country: MapCountry | undefined = cc === "us" ? undefined : {
    cc, ...V.country(c),
    parts: Object.fromEntries(catalogOf(cc).map((i) => [i.partNumber, { model: modelKeyFor(i.model), storage: i.storage, color: i.color }])),
  };
  if (!country) return <StockMap stores={stores} initial={initial} focus={focus} />;
  // Another country's map also lists its store pages in plain links (the map itself is drawn in the browser).
  return (
    <>
      <StockMap stores={stores} initial={initial} focus={focus} country={country} />
      <div className="mx-auto max-w-[1400px] px-4">
        <RelatedBlock title={D.common.appleStoresIn(c)}>
          <LinkRow title={V.everyStore} links={[...all].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name)).map((s) => ({ href: storePath(s), label: V.storeCity(storeLabel(s, lang), cityLabel(cc, s.city, lang)) }))} />
          <BrowseCountryModels country={c} />
        </RelatedBlock>
      </div>
    </>
  );
}
