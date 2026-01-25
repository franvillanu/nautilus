import { expect } from "@playwright/test";

export async function assertAppShellLoaded(page) {
    await page.goto("/");
    await expect(page.locator("#boot-splash")).toHaveCount(1);
    await expect(page.locator("#login-page")).toHaveCount(1);
    await expect(page.locator(".app")).toHaveCount(1);
}

