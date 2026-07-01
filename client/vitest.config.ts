import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

// Dedicated Vitest config (no PWA plugin, so no service-worker generation during
// unit runs). See TESTING_STRATEGY.md §1b.
export default defineConfig({
  plugins: [react(), svgr()],
  define: {
    // A couple of modules read import.meta.env.VITE_APIURL at import time.
    "import.meta.env.VITE_APIURL": JSON.stringify("/api/v1"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**", "src/**/*.d.ts", "src/vite-env.d.ts"],
    },
  },
});
