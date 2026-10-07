import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Sin .env ni URL remota: PostgreSQL efímero dentro del proceso de pruebas.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["tests/isolated/**/*.test.ts"], fileParallelism: false, testTimeout: 30000, hookTimeout: 60000 },
});
