import type { NextConfig } from "next";
import { pollerCodeHash } from "./poller/codeHash.mjs";

/** What the poller should be running, fingerprinted from this checkout (see poller/codeHash.mjs). */
function pollerCode(): string {
  try { return pollerCodeHash(process.cwd()); } catch { return ""; }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // BUILD_AT: the admin board gives the poller host's auto-update a few minutes after a deploy before warning.
  env: { POLLER_CODE_HASH: pollerCode(), BUILD_AT: new Date().toISOString() },
  poweredByHeader: false,
  // Loaded from node_modules at run time instead of bundled: Node 24 warns about url.parse() (DEP0169) only
  // for callers outside node_modules, and web-push calls it on every send — the bundled copy logged the
  // deprecation as a function error on each cold start.
  serverExternalPackages: ["web-push"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "rtlimages.apple.com", pathname: "/cmc/dieter/store/**" }],
  },
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" }, // the store step asks for the location; everything else stays off
        ],
      },
    ];
  },
};

export default nextConfig;
