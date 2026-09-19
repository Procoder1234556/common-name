import { defineConfig, devices } from "playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Phase 5.2 smoke — fixtures → home submit → signal + MCA link.
 * Dedicated port (3100) avoids clashing with a local `pnpm dev` on 3000.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    // next start allows a dedicated port; next dev locks to one instance per project.
    command: `pnpm db:fixture && pnpm build && pnpm exec next start -H 127.0.0.1 -p ${PORT}`,
    url: baseURL,
    // Only reuse when explicitly allowed — otherwise stale sql.js memory / wrong app.
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 300_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
