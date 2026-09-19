import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      ".next",
      "e2e/**",
      "awesome-cursorrules",
      "context7",
      "prompts-directory",
      "ui-ux-pro-max-skill",
    ],
    coverage: {
      provider: "v8",
      include: ["lib/normalize.ts", "lib/match.ts"],
      thresholds: {
        // Phase 5: ≥80% on match+normalize (lines/statements/functions).
        lines: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
