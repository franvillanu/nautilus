import { test } from "@playwright/test";
import { assertAppShellLoaded } from "./helpers.js";

test.describe("mobile", () => {
    test("app shell renders on mobile viewport", async ({ page }) => {
        await assertAppShellLoaded(page);
    });

    test.skip("kanban scroll is smooth (TODO: auth/session setup)", async ({ page }) => {
        await assertAppShellLoaded(page);
        // TODO: authenticate and navigate to kanban.
        // TODO: measure scroll jank/long tasks.
    });
});

