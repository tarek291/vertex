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
    // Standalone Studio lints itself (studio/eslint.config.mjs).
    "studio/**",
    // Vendored skill references, not app code.
    "agent/**",
    ".agents/**",
    "sanity.types.ts",
  ]),
]);

export default eslintConfig;
