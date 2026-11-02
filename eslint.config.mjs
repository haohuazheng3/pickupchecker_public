import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The /[cc] country segment (src/app/[cc]) matches every one-segment path, so this rule now reads each
      // deliberate full-page <a href="/account"> or "/install" as a client route. In-site navigation uses
      // PendingLink; a plain <a> here is a chosen full load.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".claude/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "infra/**",
    "public-out/**",
    "public/vendor/**",
  ]),
]);

export default eslintConfig;
