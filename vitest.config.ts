import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    // /api/job-intel calls out to the live npm/GitHub market feed on a cold cache;
    // the 5s default was tight enough to flake on a slow first connection.
    testTimeout: 15000
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
