import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "tests/security/**/*.rls.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "features/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/loading.tsx",
        "**/error.tsx",
        "**/not-found.tsx",
        "**/global-error.tsx",
      ],
      reportOnFailure: true,
    },
  },
});
