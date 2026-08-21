import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next app lives in web/, not at the repo root — without this the
  // next plugin can't locate the app and warns about a missing pages dir.
  { settings: { next: { rootDir: "web/" } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next (the Next app lives in web/).
    ".next/**",
    "web/.next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "web/next-env.d.ts",
    // Agent/plugin sources are development tooling, not application code.
    ".agents/**",
    ".codex/**",
    // Generated Expo type output (regenerated on every mobile build).
    "mobile/.expo/**",
  ]),
]);

export default eslintConfig;
