import { test } from "@playwright/test";
import { assertAppShellLoaded } from "./helpers.js";

test.describe("perf-smoke", () => {
    test("basic perf marks are present (TODO: instrumentation checks)", async ({ page }) => {
        await assertAppShellLoaded(page);
        const hasPerf = await page.evaluate(() => typeof performance !== "undefined");
        if (!hasPerf) return;
        // TODO: validate performance marks once Phase 0 is wired.
    });
});

