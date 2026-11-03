import type { MetadataRoute } from "next";
import { cookies } from "next/headers";
import { LANG_COOKIE, nativeLocale } from "@/lib/i18n/locales";

// Read per request: the app remembers the language it was installed in (below).
export const dynamic = "force-dynamic";

/**
 * Installable web app: Safari needs `display: standalone` here before it allows Web Push. The Home Screen app has
 * its own cookie jar (iOS), so the language the person was reading in when they installed it rides in start_url
 * (?lang=ja-jp); the proxy makes it their language on the app's first launch (docs/i18n.md §6).
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const loc = nativeLocale((await cookies()).get(LANG_COOKIE)?.value);
  const lang = loc ? `&lang=${loc.id}` : "";
  return {
    name: "PickupChecker",
    short_name: "PickupChecker",
    description: "iPhone 18 Pro, Pro Max and Duo in-store pickup alerts for every Apple Store in the US.",
    id: "/",
    start_url: `/account?from=app${lang}`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#e8f0eb",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My alerts", url: `/account?from=app${lang}`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Stock map", url: "/map?from=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
