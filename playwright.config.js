import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
    testDir: "tests/e2e",
    timeout: 30_000,
    expect: {
        timeout: 7_000
    },
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: BASE_URL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure"
    },
    webServer: {
        command: "npm run dev:fast",
        port: PORT,
        reuseExistingServer: !process.env.CI
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] }
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] }
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] }
        },
        {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] }
        },
        {
            name: "mobile-safari",
            use: { ...devices["iPhone 13"] }
        }
    ]
});

