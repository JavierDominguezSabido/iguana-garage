import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
for (const file of [".env.local", ".env.integration.local"]) if (existsSync(file)) process.loadEnvFile(file);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    // Auth real: no guardar contraseñas, cookies ni tokens en traces/HAR.
    trace: "off",
    channel: "chrome",
  },
  projects: [
    { name: "mobile-390", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
