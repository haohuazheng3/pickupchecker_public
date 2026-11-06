import { ALL_CODES, COUNTRIES } from "@/lib/apple/countries";
import { MODELS } from "@/lib/apple/catalog";
import { ATTRIBUTION, CACHE_SEC, DOCS, RATE_PER_MIN, SITE, json, options } from "@/lib/api/v1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1 — what is here. */
export async function GET() {
  return json({
    name: "PickupChecker public API",
    version: 1,
    docs: DOCS,
    endpoints: {
      stock: { url: `${SITE}/api/v1/{country}/stock?model=duo&storage=512GB&color=night-sky`, what: "Every Apple Store of the country with the configurations it lists for pickup right now, when each was last checked and when it last had stock." },
      restocks: { url: `${SITE}/api/v1/{country}/restocks?model=duo&hours=24&limit=100`, what: "Confirmed restocks (sold out → available) in the window, newest first, with whether each is still listed." },
      duo: { url: `${SITE}/api/v1/{country}/iphone-duo`, what: "Shortcut for stock?model=duo." },
    },
    countries: ALL_CODES.map((cc) => ({ code: cc, name: COUNTRIES[cc].name })),
    models: MODELS.map((m) => ({ key: m.key, name: m.name })),
    limits: { cache_seconds: CACHE_SEC, requests_per_minute_per_ip: RATE_PER_MIN, auth: "none" },
    attribution: ATTRIBUTION,
  });
}
export const OPTIONS = options;
