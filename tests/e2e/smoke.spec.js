import { test } from "@playwright/test";
import { assertAppShellLoaded } from "./helpers.js";

test.describe("smoke", () => {
    test("app shell renders", async ({ page }) => {
        await assertAppShellLoaded(page);
    });
});

