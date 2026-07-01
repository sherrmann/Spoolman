import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { ROOT_BASE_URL, SUBPATH, SUBPATH_BASE_URL } from "./e2e/constants";

// The e2e harness serves the *built* client through the real backend
// SinglePageApplication (client/e2e/serve.py), so `npm run build` must have run.
// Two independent servers cover both deploy shapes:
//   root   → http://127.0.0.1:30011/            (SPOOLMAN_BASE_PATH unset)
//   subpath→ http://127.0.0.1:30012/spoolman/   (SPOOLMAN_BASE_PATH=spoolman)

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, "..");

// In this sandbox Chromium is pre-installed and cannot be re-downloaded, so point
// Playwright at it. In CI the path is absent and Playwright uses the browser that
// `playwright install chromium` fetched (kept in lockstep with the pinned version).
const preinstalledChromium = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(preinstalledChromium) ? { executablePath: preinstalledChromium } : {};

const serverCommand = "uv run python client/e2e/serve.py";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    trace: "on-first-retry",
    launchOptions,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: serverCommand,
      cwd: repoRoot,
      env: { SPOOLMAN_BASE_PATH: "", PORT: "30011" },
      url: `${ROOT_BASE_URL}/config.js`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: serverCommand,
      cwd: repoRoot,
      env: { SPOOLMAN_BASE_PATH: "spoolman", PORT: "30012" },
      url: `${SUBPATH_BASE_URL}${SUBPATH}/config.js`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
