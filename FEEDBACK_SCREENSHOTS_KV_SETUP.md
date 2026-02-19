# Feedback Screenshots KV Setup

## Why a Separate KV Namespace?

Feedback screenshots are stored in a dedicated KV namespace (`FEEDBACK_SCREENSHOTS`) to:
- Keep feedback completely isolated from main app data (tasks, projects)
- Avoid affecting the main application
- Allow independent management and monitoring
- Enable separate retention policies if needed

## Setup Instructions

### 1. Create the KV Namespace

Run this command to create the KV namespace:

```bash
wrangler kv:namespace create "FEEDBACK_SCREENSHOTS"
```

This will output something like:
```
🌀 Creating namespace with title "nautilus-FEEDBACK_SCREENSHOTS"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "FEEDBACK_SCREENSHOTS", id = "abc123..." }
```

### 2. Create Preview Namespace (for local dev)

```bash
wrangler kv:namespace create "FEEDBACK_SCREENSHOTS" --preview
```

This will output:
```
🌀 Creating namespace with title "nautilus-FEEDBACK_SCREENSHOTS_preview"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "FEEDBACK_SCREENSHOTS", preview_id = "xyz789..." }
```

### 3. Update wrangler.toml

Replace the `PLACEHOLDER_ID` values in `wrangler.toml` with the actual IDs from the commands above:

```toml
kv_namespaces = [
  { binding = "NAUTILUS_DATA", id = "f273064ffa244b1c9bd696e915ed9197", preview_id = "f273064ffa244b1c9bd696e915ed9197" },
  { binding = "NAUTILUS_FILES", id = "9564a9073c8c482c82b60aece721ba79", preview_id = "c85af804006e4b9e8c9b60d5d31a5af2" },
  { binding = "FEEDBACK_SCREENSHOTS", id = "YOUR_PRODUCTION_ID", preview_id = "YOUR_PREVIEW_ID" }
]
```

### 4. Deploy

After updating the IDs, commit and push:

```bash
git add wrangler.toml
git commit -m "chore: add FEEDBACK_SCREENSHOTS KV namespace IDs"
git push
```

## How It Works

1. **Upload**: When a user adds a screenshot to feedback, it's uploaded to `/api/feedback-screenshot` which stores it in the `FEEDBACK_SCREENSHOTS` KV namespace
2. **Reference**: Only the screenshot ID (e.g., `screenshot:userId:feedbackId:timestamp`) is stored in the D1 database
3. **Retrieve**: When viewing a screenshot, the app fetches it from KV using the ID

## Benefits

- ✅ No D1 size limits (SQLite TOOBIG error fixed)
- ✅ Supports screenshots up to 25MB each
- ✅ Completely isolated from main app data
- ✅ Easy to monitor and manage separately
- ✅ Can be purged independently if needed

## Monitoring

Check KV usage:
```bash
wrangler kv:key list --binding=FEEDBACK_SCREENSHOTS
```

Get a specific screenshot:
```bash
wrangler kv:key get "screenshot:userId:feedbackId:timestamp" --binding=FEEDBACK_SCREENSHOTS
```

Delete old screenshots:
```bash
wrangler kv:key delete "screenshot:userId:feedbackId:timestamp" --binding=FEEDBACK_SCREENSHOTS
```
