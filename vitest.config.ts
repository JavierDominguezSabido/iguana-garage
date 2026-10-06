import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/features/**/*.ts", "src/lib/supabase/{browser,config,server,session}.ts"],
      // DAL/Route Handlers/Auth Actions se verifican contra Supabase con integración/E2E.
      exclude: ["**/*.test.ts", "src/features/jobs/{data,http,page-data}.ts", "src/features/auth/actions.ts", "src/features/portfolio/data.ts"],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    },
  },
});
