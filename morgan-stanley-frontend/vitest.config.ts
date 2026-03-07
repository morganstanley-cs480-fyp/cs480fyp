import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "html", "json", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "src/hooks/**",
        "src/lib/**",
        "src/components/trades/**",
        "src/utils/**",
      ],
      exclude: [
        "node_modules/",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/dist/**",
        // UI components (mostly presentational)
        "src/components/ui/**",
        // Route components (integration-level, not unit testable)
        "src/routes/**",
        // Main app files
        "src/main.tsx",
        "src/App.tsx",
        // Types and interfaces
        "src/lib/api/types.ts",
        // Test utilities
        "src/test/**",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
});
