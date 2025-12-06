# Data Migration Guide: Single-User → Multi-User

**CRITICAL:** Follow these steps exactly to avoid data loss.

---

## Pre-Migration Checklist

- [ ] **DO NOT** deploy new code to production yet
- [ ] You have admin access to production environment
- [ ] You have Wrangler CLI access to production KV
- [ ] You have 30 minutes of uninterrupted time

---

## Step 1: Backup Production Data (CRITICAL - DO THIS FIRST)

### Option A: Using Wrangler CLI (Recommended)

```bash
# List all keys in production KV
wrangler kv:key list --binding=NAUTILUS_DATA --env=production

# Backup each key to local files
wrangler kv:key get "tasks" --binding=NAUTILUS_DATA --env=production > backup-tasks.json
wrangler kv:key get "projects" --binding=NAUTILUS_DATA --env=production > backup-projects.json
wrangler kv:key get "feedbackItems" --binding=NAUTILUS_DATA --env=production > backup-feedbackItems.json
wrangler kv:key get "projectColors" --binding=NAUTILUS_DATA --env=production > backup-projectColors.json
wrangler kv:key get "sortMode" --binding=NAUTILUS_DATA --env=production > backup-sortMode.json
wrangler kv:key get "manualTaskOrder" --binding=NAUTILUS_DATA --env=production > backup-manualTaskOrder.json
```

### Option B: Using Browser Console

1. Open production site in browser
2. Log in as admin
3. Open DevTools Console (F12)
4. Run this code:

```javascript
const backup = {};
const keys = ['tasks', 'projects', 'feedbackItems', 'projectColors', 'sortMode', 'manualTaskOrder'];

async function backupNow() {
    const token = localStorage.getItem('adminToken');
    for (const key of keys) {
        try {
            const response = await fetch(`/api/storage?key=${key}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const text = await response.text();
                backup[key] = JSON.parse(text);
                console.log('✅ Backed up:', key);
            }
        } catch (err) {
            console.error('❌ Error backing up', key, err);
        }
    }
    const backupJson = JSON.stringify({timestamp: new Date().toISOString(), data: backup}, null, 2);
    console.log('📦 BACKUP COMPLETE - Copy and save this:');
    console.log(backupJson);

    // Auto-download as file
    const blob = new Blob([backupJson], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nautilus-backup-${new Date().toISOString()}.json`;
    a.click();
}

backupNow();
```

5. **SAVE THE DOWNLOADED FILE** in a safe location
6. Verify the file contains all data by opening it

---

## Step 2: Deploy New Multi-User Code

```bash
# Push the feature branch to production
git checkout feature/multi-user-pin-auth
git push origin feature/multi-user-pin-auth

# Deploy to Cloudflare Pages
# (or merge to main and let auto-deploy handle it)
```

**IMPORTANT:** After deployment, the site will have the new auth system but Moony's data won't be accessible yet (it's still in old unscoped keys).

---

## Step 3: Create Moony's User Account

1. Open production site
2. Click logo to access admin login
3. Log in with admin PIN: `0330`
4. Go to "Create User" section
5. Create Moony's account:
   - **Name:** Moony Lambre
   - **Email/Username:** moony (or malambre@ull.edu.es)
   - **PIN:** (set her preferred 4-digit PIN)
6. Note the **userId** assigned (likely `1` if she's first user)

---

## Step 4: Run Migration (Dry Run First)

### Test Migration First (No Changes)

```bash
# Using curl (replace ADMIN_TOKEN and userId)
curl -X POST https://your-production-site.pages.dev/api/migrate-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": 1,
    "dryRun": true
  }'
```

**Expected Response:**
```json
{
  "userId": 1,
  "dryRun": true,
  "success": true,
  "message": "Dry run complete - no data was modified",
  "oldKeys": [
    {"key": "tasks", "size": 12345, "preview": "[{..."}
  ],
  "newKeys": [
    {"key": "user:1:tasks", "migrated": false}
  ],
  "errors": []
}
```

**Check:** `errors` array should be empty. If not, **STOP** and debug.

---

## Step 5: Run Actual Migration

```bash
# Run migration for real (removes dryRun: true)
curl -X POST https://your-production-site.pages.dev/api/migrate-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "userId": 1
  }'
```

**Expected Response:**
```json
{
  "userId": 1,
  "dryRun": false,
  "success": true,
  "message": "Migration complete - all data migrated successfully",
  "oldKeys": [...],
  "newKeys": [
    {"key": "user:1:tasks", "migrated": true},
    {"key": "user:1:projects", "migrated": true},
    ...
  ],
  "errors": []
}
```

---

## Step 6: Verify Migration

1. Log out of admin
2. Log in as Moony (username + PIN)
3. **Verify all data is present:**
   - [ ] All tasks are visible
   - [ ] All projects are visible
   - [ ] Project colors are correct
   - [ ] Feedback items present
   - [ ] Sort preferences preserved
4. **Test functionality:**
   - [ ] Create a new task
   - [ ] Edit a task
   - [ ] Delete a task (one you just created)
   - [ ] Create a project
   - [ ] Change project color
   - [ ] Log out and log back in → data still there

---

## Step 7: Clean Up Old Keys (Optional)

**ONLY do this after confirming Moony's data is 100% accessible.**

```bash
# Delete old unscoped keys
wrangler kv:key delete "tasks" --binding=NAUTILUS_DATA --env=production
wrangler kv:key delete "projects" --binding=NAUTILUS_DATA --env=production
wrangler kv:key delete "feedbackItems" --binding=NAUTILUS_DATA --env=production
wrangler kv:key delete "projectColors" --binding=NAUTILUS_DATA --env=production
wrangler kv:key delete "sortMode" --binding=NAUTILUS_DATA --env=production
wrangler kv:key delete "manualTaskOrder" --binding=NAUTILUS_DATA --env=production
```

**OR** keep them as backup for 30 days, then delete.

---

## Rollback Plan (If Something Goes Wrong)

If migration fails or data is lost:

### Option 1: Restore from Backup (Immediate)

```bash
# Restore each key from backup files
wrangler kv:key put "tasks" --binding=NAUTILUS_DATA --env=production --path=backup-tasks.json
wrangler kv:key put "projects" --binding=NAUTILUS_DATA --env=production --path=backup-projects.json
wrangler kv:key put "feedbackItems" --binding=NAUTILUS_DATA --env=production --path=backup-feedbackItems.json
wrangler kv:key put "projectColors" --binding=NAUTILUS_DATA --env=production --path=backup-projectColors.json
wrangler kv:key put "sortMode" --binding=NAUTILUS_DATA --env=production --path=backup-sortMode.json
wrangler kv:key put "manualTaskOrder" --binding=NAUTILUS_DATA --env=production --path=backup-manualTaskOrder.json
```

### Option 2: Rollback Code

```bash
# Revert to old single-user code (main branch before multi-user)
git checkout main  # or specific commit hash before multi-user
git push -f origin main  # force push old version

# Redeploy old version to Cloudflare Pages
```

---

## Migration Timeline

**Estimated total time:** 20-30 minutes

1. **Backup (5 min):** Save all production data
2. **Deploy (5 min):** Push new code to production
3. **Create User (2 min):** Set up Moony's account
4. **Dry Run (3 min):** Test migration without changes
5. **Real Migration (3 min):** Execute actual migration
6. **Verification (10 min):** Thoroughly test all features
7. **Cleanup (2 min):** Remove old keys (optional)

---

## Emergency Contacts

If anything goes wrong:
- You have backup files locally ✅
- You can restore via Wrangler CLI ✅
- You can rollback code deployment ✅
- **NO DATA WILL BE PERMANENTLY LOST** as long as you completed Step 1

---

## Post-Migration Checklist

- [ ] Moony can log in with her username and PIN
- [ ] All her tasks are visible and editable
- [ ] All her projects are visible and editable
- [ ] Project colors persist after refresh
- [ ] New data (tasks/projects) saves correctly
- [ ] Logout and login works smoothly
- [ ] No white flash on page load (recent fix)
- [ ] Backup files are safely stored
- [ ] Old unscoped keys deleted (or kept as backup)

---

**You're ready to migrate!** Start with Step 1 (backup) and proceed carefully through each step.
