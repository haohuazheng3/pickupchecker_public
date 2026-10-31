import { consentRequiredFor } from "@/lib/consent";

export const dynamic = "force-dynamic";

/** Region-aware analytics consent for src/components/site/Consent.tsx. Vercel's edge sets the country header. */
export function GET(req: Request) {
  const country = req.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  // The browser keeps the answer for a day (the loader also remembers the region in a cookie), so a
  // visitor costs one call, not one per page.
  return Response.json(
    { consentRequired: consentRequiredFor(country), country: country || null },
    { headers: { "Cache-Control": "private, max-age=86400" } },
  );
}
