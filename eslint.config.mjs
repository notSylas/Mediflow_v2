import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent/plugin sources are development tooling, not application code.
    ".agents/**",
    ".codex/**",
    // Generated Expo type output (regenerated on every mobile build).
    "mobile/.expo/**",
  ]),
]);

export default eslintConfig;
