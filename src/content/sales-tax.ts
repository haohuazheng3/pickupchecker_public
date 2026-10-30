/**
 * Sales tax by state, as of January 1, 2026 (Tax Foundation, "State and Local Sales Tax Rates, 2026",
 * https://taxfoundation.org/data/all/state/sales-tax-rates/). `avgLocal` is the population-weighted
 * average of local rates, so `combined` is what a typical buyer in the state pays; for in-store pickup
 * the tax is the rate where the store is. Percentages.
 */
export const SALES_TAX_SOURCE = { label: "Tax Foundation: State and local sales tax rates as of January 1, 2026", url: "https://taxfoundation.org/data/all/state/sales-tax-rates/" };

export const SALES_TAX: Record<string, { state: number; avgLocal: number; combined: number }> = {
  Alabama: { state: 4, avgLocal: 5.46, combined: 9.46 },
  Alaska: { state: 0, avgLocal: 1.82, combined: 1.82 },
  Arizona: { state: 5.6, avgLocal: 2.92, combined: 8.52 },
  Arkansas: { state: 6.5, avgLocal: 2.96, combined: 9.46 },
  California: { state: 7.25, avgLocal: 1.74, combined: 8.99 },
  Colorado: { state: 2.9, avgLocal: 4.99, combined: 7.89 },
  Connecticut: { state: 6.35, avgLocal: 0, combined: 6.35 },
  Delaware: { state: 0, avgLocal: 0, combined: 0 },
  Florida: { state: 6, avgLocal: 0.98, combined: 6.98 },
  Georgia: { state: 4, avgLocal: 3.49, combined: 7.49 },
  Hawaii: { state: 4, avgLocal: 0.5, combined: 4.5 },
  Idaho: { state: 6, avgLocal: 0.03, combined: 6.03 },
  Illinois: { state: 6.25, avgLocal: 2.71, combined: 8.96 },
  Indiana: { state: 7, avgLocal: 0, combined: 7 },
  Iowa: { state: 6, avgLocal: 0.94, combined: 6.94 },
  Kansas: { state: 6.5, avgLocal: 2.19, combined: 8.69 },
  Kentucky: { state: 6, avgLocal: 0, combined: 6 },
  Louisiana: { state: 5, avgLocal: 5.11, combined: 10.11 },
  Maine: { state: 5.5, avgLocal: 0, combined: 5.5 },
  Maryland: { state: 6, avgLocal: 0, combined: 6 },
  Massachusetts: { state: 6.25, avgLocal: 0, combined: 6.25 },
  Michigan: { state: 6, avgLocal: 0, combined: 6 },
  Minnesota: { state: 6.875, avgLocal: 1.26, combined: 8.14 },
  Mississippi: { state: 7, avgLocal: 0.06, combined: 7.06 },
  Missouri: { state: 4.225, avgLocal: 4.22, combined: 8.44 },
  Montana: { state: 0, avgLocal: 0, combined: 0 },
  Nebraska: { state: 5.5, avgLocal: 1.48, combined: 6.98 },
  Nevada: { state: 6.85, avgLocal: 1.39, combined: 8.24 },
  "New Hampshire": { state: 0, avgLocal: 0, combined: 0 },
  "New Jersey": { state: 6.625, avgLocal: -0.02, combined: 6.6 },
  "New Mexico": { state: 4.875, avgLocal: 2.79, combined: 7.67 },
  "New York": { state: 4, avgLocal: 4.54, combined: 8.54 },
  "North Carolina": { state: 4.75, avgLocal: 2.25, combined: 7 },
  "North Dakota": { state: 5, avgLocal: 2.09, combined: 7.09 },
  Ohio: { state: 5.75, avgLocal: 1.54, combined: 7.29 },
  Oklahoma: { state: 4.5, avgLocal: 4.56, combined: 9.06 },
  Oregon: { state: 0, avgLocal: 0, combined: 0 },
  Pennsylvania: { state: 6, avgLocal: 0.34, combined: 6.34 },
  "Rhode Island": { state: 7, avgLocal: 0, combined: 7 },
  "South Carolina": { state: 6, avgLocal: 1.49, combined: 7.49 },
  "South Dakota": { state: 4.2, avgLocal: 1.91, combined: 6.11 },
  Tennessee: { state: 7, avgLocal: 2.61, combined: 9.61 },
  Texas: { state: 6.25, avgLocal: 1.95, combined: 8.2 },
  Utah: { state: 6.1, avgLocal: 1.32, combined: 7.42 },
  Vermont: { state: 6, avgLocal: 0.39, combined: 6.39 },
  Virginia: { state: 5.3, avgLocal: 0.47, combined: 5.77 },
  Washington: { state: 6.5, avgLocal: 3.01, combined: 9.51 },
  "West Virginia": { state: 6, avgLocal: 0.59, combined: 6.59 },
  Wisconsin: { state: 5, avgLocal: 0.72, combined: 5.72 },
  Wyoming: { state: 4, avgLocal: 1.56, combined: 5.56 },
  "District of Columbia": { state: 6, avgLocal: 0, combined: 6 },
};

/** "$2,131" — price with the state's average combined rate, rounded to the dollar. */
export function withTax(price: number, state: string): { total: number; rate: number } | null {
  const t = SALES_TAX[state];
  if (!t) return null;
  return { total: Math.round(price * (1 + t.combined / 100)), rate: t.combined };
}
