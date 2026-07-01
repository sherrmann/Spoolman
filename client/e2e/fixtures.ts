import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test as base } from "@playwright/test";
import { COVERAGE_ENABLED, RAW_COVERAGE_DIR } from "./coverage-options";

// All e2e specs import { test, expect } from this module instead of @playwright/test
// so that, when E2E_COVERAGE=1, every test's Chromium V8 JS coverage is captured and
// dropped as raw JSON for the global teardown to aggregate. When coverage is off the
// fixture is a no-op, so normal runs are unaffected.
export const test = base.extend<{ autoCoverage: void }>({
  autoCoverage: [
    async ({ page }, use, testInfo) => {
      if (COVERAGE_ENABLED) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
      }

      await use();

      if (COVERAGE_ENABLED) {
        const coverage = await page.coverage.stopJSCoverage();
        // Skip tests that never loaded app JS (e.g. request-only manifest checks) —
        // an empty entry list makes monocart warn about the shape.
        const appEntries = coverage.filter((e) => e.url.includes("/assets/"));
        if (appEntries.length > 0) {
          if (!existsSync(RAW_COVERAGE_DIR)) {
            mkdirSync(RAW_COVERAGE_DIR, { recursive: true });
          }
          const safe = `${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`.replace(/[^a-z0-9-]/gi, "_");
          writeFileSync(path.join(RAW_COVERAGE_DIR, `${safe}.json`), JSON.stringify(appEntries));
        }
      }
    },
    { auto: true },
  ],
});

export const expect = test.expect;
