#!/usr/bin/env node

/**
 * Trigger Nautilus deadline notifications manually.
 * Usage:
 *   node scripts/trigger-notifications.js --dry-run
 * Environment variables:
 *   NOTIFICATIONS_ENDPOINT - Defaults to http://localhost:8787/api/notifications
 *   NOTIFICATION_TOKEN     - Optional shared secret header (x-notification-token)
 */

const { argv, env, exit } = require("node:process");
const { URL } = require("node:url");

const args = parseArgs(argv.slice(2));
const endpoint = env.NOTIFICATIONS_ENDPOINT || "http://localhost:8787/api/notifications";
const target = new URL(endpoint);

if (args.dryRun) target.searchParams.set("dryRun", "1");
if (args.force) target.searchParams.set("force", "1");
if (args.now) target.searchParams.set("now", args.now);

const headers = { "Content-Type": "application/json" };
if (env.NOTIFICATION_TOKEN) headers["x-notification-token"] = env.NOTIFICATION_TOKEN;

(async () => {
    try {
        const response = await fetch(target, { method: "POST", headers });
        const text = await response.text();

        if (!response.ok) {
            console.error(`Request failed (${response.status}): ${text}`);
            exit(1);
        }

        console.log(text);
    } catch (error) {
        console.error("Failed to trigger notifications:", error);
        exit(1);
    }
})();

function parseArgs(params) {
    return params.reduce((acc, current) => {
        if (current === "--dry-run") acc.dryRun = true;
        else if (current === "--force") acc.force = true;
        else if (current.startsWith("--now=")) acc.now = current.split("=")[1];
        return acc;
    }, { dryRun: false, force: false, now: undefined });
}
