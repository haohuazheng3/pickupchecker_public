import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pickupchecker.com";
  const indexable = process.env.NEXT_PUBLIC_INDEXABLE === "1";
  return indexable
    ? { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api/", "/checkout/"] }], sitemap: `${base}/sitemap.xml` }
    : { rules: [{ userAgent: "*", disallow: "/" }] };
}
