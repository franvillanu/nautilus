# Cloudflare Dashboard Setup for D1

## Step-by-Step Instructions (No Code Required)

### Prerequisites
- ✅ Backup completed (see BACKUP_CURRENT_DATA.md)
- ✅ Cloudflare account access
- ✅ Access to your Nautilus project

---

## Step 1: Create D1 Database (5 minutes)

### Via Cloudflare Dashboard:

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Login with your account

2. **Navigate to D1**
   - Click on "Workers & Pages" in left sidebar
   - Click on "D1 SQL Database" tab
   - Click "Create database" button

3. **Create Database**
   - Database name: `nautilus-feedback`
   - Click "Create"
   - ✅ Database created!

4. **Get Database ID**
   - You'll see your new database listed
   - Click on `nautilus-feedback`
   - Copy the "Database ID" (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - **Save this ID** - you'll need it next

---

## Step 2: Create Database Table (5 minutes)

### Via Cloudflare Dashboard Console:

1. **Open Database Console**
   - Still on your `nautilus-feedback` database page
   - Click "Console" tab at the top
   - You'll see a SQL query editor

2. **Run Table Creation SQL**
   - Copy this entire SQL script:

```sql
CREATE TABLE IF NOT EXISTS feedback_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('bug', 'improvement', 'feature', 'idea')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
    screenshot_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    created_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_items(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback_items(status, created_at DESC);

CREATE TRIGGER IF NOT EXISTS update_feedback_timestamp 
AFTER UPDATE ON feedback_items
BEGIN
    UPDATE feedback_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
```

3. **Execute SQL**
   - Paste the SQL into the console
   - Click "Execute" button
   - You should see: "Success" message
   - ✅ Table created!

4. **Verify Table**
   - Run this query to verify:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table';
   ```
   - You should see `feedback_items` in the results

---

## Step 3: Connect D1 to Your Pages Project (5 minutes)

### Via Cloudflare Dashboard:

1. **Navigate to Your Pages Project**
   - Go to: Workers & Pages
   - Click on your `nautilus` project
   - Click "Settings" tab

2. **Add D1 Binding**
   - Scroll down to "Bindings" section
   - Click "Add" button next to "D1 database bindings"
   
3. **Configure Binding**
   - Variable name: `FEEDBACK_DB`
   - D1 database: Select `nautilus-feedback` from dropdown
   - Click "Save"
   - ✅ Binding created!

4. **Verify Binding**
   - You should see `FEEDBACK_DB` listed under D1 database bindings
   - Shows: `nautilus-feedback` database

---

## Step 4: Update wrangler.toml (2 minutes)

### In Your Code Editor:

1. **Open wrangler.toml**
   - Located in project root

2. **Add D1 Configuration**
   - Add this at the end of the file:

```toml
# D1 Database for Feedback
[[d1_databases]]
binding = "FEEDBACK_DB"
database_name = "nautilus-feedback"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

3. **Replace Database ID**
   - Replace `PASTE_YOUR_DATABASE_ID_HERE` with the ID from Step 1
   - Save file

4. **Commit and Push**
   ```bash
   git add wrangler.toml
   git commit -m "feat: add D1 database configuration"
   git push
   ```

---

## Step 5: Deploy Code Changes (10 minutes)

### Via GitHub:

1. **Create Pull Request**
   - Go to: https://github.com/franvillanu/nautilus
   - You should see a banner to create PR for `feat/migrate-feedback-to-d1`
   - Click "Compare & pull request"
   - Review changes
   - Click "Create pull request"

2. **Merge Pull Request**
   - Review the PR
   - Click "Merge pull request"
   - Click "Confirm merge"
   - ✅ Code merged!

3. **Wait for Deployment**
   - Go to Cloudflare Dashboard → Workers & Pages → nautilus
   - Click "Deployments" tab
   - Wait for latest deployment to show "Success" (usually 2-3 minutes)
   - ✅ Deployed!

---

## Step 6: Migrate Your Data (2 minutes)

### Via Browser Console:

1. **Open Your App**
   - Go to: https://nautilusapp.science
   - Make sure you're logged in

2. **Open Browser Console**
   - Press F12 (or right-click → Inspect)
   - Click "Console" tab

3. **Run Migration Script**
   - Paste this script:

```javascript
fetch('/api/migrate-feedback-to-d1', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
        'Content-Type': 'application/json'
    }
})
.then(r => r.json())
.then(result => {
    console.log('Migration result:', result);
    if (result.success) {
        alert('✅ Successfully migrated ' + result.stats.migrated + ' items to D1!');
        location.reload();
    } else {
        alert('❌ Migration failed: ' + result.error);
    }
})
.catch(err => {
    console.error('Migration error:', err);
    alert('❌ Migration failed. Check console for details.');
});
```

4. **Verify Migration**
   - You should see success message
   - Page will reload
   - Go to Feedback section
   - Should load instantly!
   - ✅ Migration complete!

---

## Step 7: Verify Everything Works (2 minutes)

### Test Feedback Section:

1. **Load Speed**
   - Go to Feedback section
   - Should load in < 100ms (instant)
   - ✅ Fast loading!

2. **Add New Item**
   - Add a test feedback item
   - Should save instantly
   - ✅ Fast saving!

3. **Check Data**
   - Verify all your old items are visible
   - Check pagination works
   - ✅ Data intact!

4. **Verify in D1 Console**
   - Go to Cloudflare Dashboard → D1 → nautilus-feedback → Console
   - Run: `SELECT COUNT(*) FROM feedback_items;`
   - Should show your item count
   - ✅ Data in D1!

---

## Troubleshooting

### "Database not found"
- Check Step 3: Make sure binding is created in Cloudflare Dashboard
- Variable name must be exactly: `FEEDBACK_DB`

### "Migration endpoint 404"
- Check Step 5: Make sure deployment is complete
- Check Cloudflare Pages deployment status

### "No items after migration"
- Check browser console for errors
- Verify D1 has data: Run `SELECT * FROM feedback_items LIMIT 5;` in D1 Console
- Check your backup file - you can restore if needed

### "Unauthorized" error
- Make sure you're logged in to the app
- Try logging out and back in

---

## Rollback (If Needed)

If something goes wrong:

1. **Restore from Backup**
   - See BACKUP_CURRENT_DATA.md for restore instructions

2. **Revert Code**
   - Go to GitHub → Pull Requests
   - Find the merged PR
   - Click "Revert" button

3. **Your data is safe**
   - Original KV data is NOT deleted
   - Backup file has everything
   - Can try migration again anytime

---

## Summary

✅ Step 1: Create D1 database in Cloudflare Dashboard
✅ Step 2: Create table via SQL Console
✅ Step 3: Add D1 binding to Pages project
✅ Step 4: Update wrangler.toml with database ID
✅ Step 5: Merge PR and wait for deployment
✅ Step 6: Run migration script in browser console
✅ Step 7: Verify everything works

**Total time: ~30 minutes**
**Result: 40-60x faster feedback section!**

---

## Need Help?

- Check Cloudflare D1 docs: https://developers.cloudflare.com/d1/
- Check browser console for errors
- Check Cloudflare Workers logs in dashboard
- Your backup file has all data - nothing is lost!
