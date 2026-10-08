import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/features/jobs/data.ts", "src/features/jobs/server/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        group: ["@/features/jobs/server/**", "**/jobs/server/**", "./server/**", "../server/**"],
        message: "Usa la entrada jobs/data protegida con server-only; server/ es interno de Node.",
      }] }],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "blob-report/**",
    ".npm/**",
    "next-env.d.ts",
  ]),
]);
