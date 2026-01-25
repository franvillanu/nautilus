import { test } from "@playwright/test";
import { assertAppShellLoaded } from "./helpers.js";

test.describe("offline", () => {
    test("app shell loads with offline toggle (TODO: enable SW + auth)", async ({ page }) => {
        await assertAppShellLoaded(page);
    });

    test.skip("offline queue flushes on reconnect (TODO: auth/session setup)", async ({ page, context }) => {
        await assertAppShellLoaded(page);
        await context.setOffline(true);
        // TODO: create/move tasks offline, then reconnect and verify sync.
    });
});

