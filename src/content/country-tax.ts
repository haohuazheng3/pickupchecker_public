/**
 * What tax an apple.com price carries outside the US, and where that is published.
 *
 * Canada is the one country besides the US whose Apple prices exclude tax: the buyer pays GST, HST or GST +
 * PST/QST on top, by province (Canada Revenue Agency, "GST/HST calculator (and rates)", page modified
 * 2025-04-01, Nova Scotia's HST 14% since April 1, 2025; checked 2026-11-02). Everywhere else Apple's price
 * already includes VAT/GST at the rate in countries.ts `taxNote` (EU rates checked against Your Europe,
 * Swiss rate against the ESTV, 2026-11-02); Hong Kong has no sales tax at all.
 */
import { COUNTRIES, type Country, type CountryCode } from "@/lib/apple/countries";
import type { Source } from "@/lib/content/types";

export interface ProvinceTax {
  /** "HST" or "GST + PST" / "GST + QST". */
  label: string;
  gst: number;
  /** Provincial part: PST, RST or QST; 0 where HST replaces both. */
  pst: number;
  /** Harmonized rate where one applies. */
  hst?: number;
  total: number;
}

/** The six provinces with an Apple Store (rates in %). */
export const CA_PROVINCE_TAX: Record<string, ProvinceTax> = {
  Alberta: { label: "GST", gst: 5, pst: 0, total: 5 },
  "British Columbia": { label: "GST + PST", gst: 5, pst: 7, total: 12 },
  Manitoba: { label: "GST + RST", gst: 5, pst: 7, total: 12 },
  "Nova Scotia": { label: "HST", gst: 0, pst: 0, hst: 14, total: 14 },
  Ontario: { label: "HST", gst: 0, pst: 0, hst: 13, total: 13 },
  Quebec: { label: "GST + QST", gst: 5, pst: 9.975, total: 14.975 },
};

export const CA_TAX_SOURCE: Source = { label: "Canada Revenue Agency: GST/HST and PST rates by province", url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html" };

const EU: Source = { label: "Your Europe (European Union): VAT rates applied in EU member countries", url: "https://europa.eu/youreurope/business/taxation/vat/vat-rules-rates/index_en.htm" };

/** The official page behind each country's tax line. */
export const TAX_SOURCES: Record<Exclude<CountryCode, "us">, Source> = {
  ca: CA_TAX_SOURCE,
  uk: { label: "GOV.UK: VAT rates", url: "https://www.gov.uk/vat-rates" },
  au: { label: "Australian Taxation Office: Goods and services tax (GST)", url: "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst" },
  de: EU, fr: EU, it: EU, es: EU, nl: EU, se: EU, at: EU, be: EU,
  jp: { label: "National Tax Agency Japan: Consumption tax", url: "https://www.nta.go.jp/english/taxes/consumption_tax/index.htm" },
  kr: { label: "National Tax Service (Korea)", url: "https://www.nts.go.kr/english/main.do" },
  hk: { label: "Inland Revenue Department (Hong Kong): the taxes Hong Kong levies", url: "https://www.ird.gov.hk/eng/tax/index.htm" },
  sg: { label: "Inland Revenue Authority of Singapore: Goods & Services Tax (GST)", url: "https://www.iras.gov.sg/taxes/goods-services-tax-(gst)" },
  ae: { label: "UAE Federal Tax Authority: Value Added Tax", url: "https://tax.gov.ae/en/taxes/vat.aspx" },
  ch: { label: "Swiss Federal Tax Administration: Swiss VAT rates", url: "https://www.estv.admin.ch/estv/en/home/value-added-tax/vat-rates-switzerland.html" },
  tw: { label: "Taxation Administration, Ministry of Finance (Taiwan)", url: "https://www.dot.gov.tw/en/" },
};

/** The VAT/GST/consumption-tax rate inside Apple's price (20 for "VAT (20%) included"); null where none (Hong Kong) or added on top (Canada). */
export function includedRate(c: Country): number | null {
  if (!c.pricesIncludeTax) return null;
  const m = c.taxNote.match(/\((\d+(?:\.\d+)?)%\)/);
  return m ? Number(m[1]) : null;
}

/** "VAT", "GST", "consumption tax": the name of the tax inside the price. */
export function taxName(c: Country): string {
  const m = c.taxNote.match(/^(.+?) \(/);
  return m ? m[1] : "sales tax";
}

/** Price before the included tax, rounded to the currency's whole unit. */
export function beforeTax(c: Country, price: number): number {
  const r = includedRate(c);
  return r == null ? price : Math.round(price / (1 + r / 100));
}

/** Price with a Canadian province's tax added. */
export function withProvinceTax(price: number, province: string): { total: number; rate: number } | null {
  const t = CA_PROVINCE_TAX[province];
  return t ? { total: Math.round(price * (1 + t.total / 100)), rate: t.total } : null;
}

/** Apple's pickup help page in a country's own store. */
export function pickupHelp(cc: CountryCode): Source {
  const c = COUNTRIES[cc];
  const p = c.buyPath ?? c.shopPath;
  return { label: `Apple: Shipping & Pickup help${cc === "us" ? "" : ` (${c.short})`} (what to bring to a pickup)`, url: p ? `https://www.apple.com/${p}/shop/help/shipping_delivery` : "https://www.apple.com/shop/help/shipping_delivery" };
}

/** Apple's list of every store in a country. */
export function storeListSource(cc: CountryCode): Source {
  const c = COUNTRIES[cc];
  return { label: `Apple: Retail store list${cc === "us" ? "" : ` (${c.short})`}`, url: c.retailPath ? `https://www.apple.com/${c.retailPath}/retail/storelist/` : "https://www.apple.com/retail/storelist/" };
}
