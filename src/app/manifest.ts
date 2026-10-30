import type { MetadataRoute } from "next";

/** Installable web app: Safari needs `display: standalone` here before it allows Web Push. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PickupChecker",
    short_name: "PickupChecker",
    description: "iPhone 18 Pro, Pro Max and Duo in-store pickup alerts for every Apple Store in the US.",
    id: "/",
    start_url: "/account?from=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f7f5",
    theme_color: "#ffffff",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My alerts", url: "/account?from=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Stock map", url: "/map?from=app", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
