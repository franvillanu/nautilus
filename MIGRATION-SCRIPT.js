/**
 * PRODUCTION DATA MIGRATION SCRIPT
 *
 * Instructions:
 * 1. Open production site: https://nautilus-dky.pages.dev
 * 2. Log in as ADMIN (click logo → enter PIN 0330)
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this ENTIRE script
 * 5. Press Enter
 * 6. Script will run dry-run first, then ask for confirmation
 *
 * This migrates old unscoped data → new user-scoped format.
 */

(async function() {
    console.log('🔄 Starting production data migration...\n');

    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        console.error('❌ ERROR: Not logged in as admin!');
        console.log('\nPlease:');
        console.log('1. Click the Nautilus logo');
        console.log('2. Enter admin PIN: 0330');
        console.log('3. Run this script again');
        return;
    }

    // Ask for userId (Moony's user ID)
    const userId = prompt('Enter Moony\'s userId (check admin dashboard, likely "1"):');
    if (!userId) {
        console.log('❌ Migration cancelled - no userId provided');
        return;
    }

    console.log(`\n📋 Migration Plan:`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Target: user:${userId}:*`);
    console.log('\n⚠️  Running DRY RUN first (no changes will be made)...\n');

    // Step 1: DRY RUN
    try {
        const dryRunResponse = await fetch('/api/migrate-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                userId: parseInt(userId),
                dryRun: true
            })
        });

        const dryRunResult = await dryRunResponse.json();

        console.log('📊 DRY RUN RESULTS:\n');
        console.log(JSON.stringify(dryRunResult, null, 2));

        if (!dryRunResult.success) {
            console.error('\n❌ DRY RUN FAILED!');
            console.log('Errors:', dryRunResult.errors);
            console.log('\n⚠️  DO NOT PROCEED - Fix errors first!');
            return;
        }

        if (dryRunResult.errors && dryRunResult.errors.length > 0) {
            console.warn('\n⚠️  DRY RUN HAD ERRORS:');
            dryRunResult.errors.forEach(err => console.log(`  - ${err.key}: ${err.error}`));
            console.log('\n⚠️  DO NOT PROCEED - Fix errors first!');
            return;
        }

        console.log('\n✅ DRY RUN SUCCESSFUL!');
        console.log('\nData to be migrated:');
        dryRunResult.oldKeys.forEach(item => {
            console.log(`  ✅ ${item.key}: ${(item.size / 1024).toFixed(2)} KB`);
        });

    } catch (error) {
        console.error('❌ DRY RUN ERROR:', error);
        return;
    }

    // Step 2: Ask for confirmation
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  READY TO RUN ACTUAL MIGRATION');
    console.log('='.repeat(60));

    const confirm = window.confirm(
        `Ready to migrate data to user:${userId}:*\n\n` +
        `This will:\n` +
        `• Copy old data (tasks, projects, etc.) to new user-scoped keys\n` +
        `• Old data stays as backup (not deleted)\n` +
        `• Moony will be able to log in and see all her data\n\n` +
        `Proceed with REAL migration?`
    );

    if (!confirm) {
        console.log('\n❌ Migration cancelled by user');
        return;
    }

    // Step 3: REAL MIGRATION
    console.log('\n🚀 Running REAL migration...\n');

    try {
        const migrationResponse = await fetch('/api/migrate-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                userId: parseInt(userId)
            })
        });

        const migrationResult = await migrationResponse.json();

        console.log('📊 MIGRATION RESULTS:\n');
        console.log(JSON.stringify(migrationResult, null, 2));

        if (!migrationResult.success) {
            console.error('\n❌ MIGRATION FAILED!');
            console.log('Errors:', migrationResult.errors);
            console.log('\n⚠️  Restore from backup if needed!');
            return;
        }

        if (migrationResult.errors && migrationResult.errors.length > 0) {
            console.warn('\n⚠️  MIGRATION HAD ERRORS:');
            migrationResult.errors.forEach(err => console.log(`  - ${err.key}: ${err.error}`));
        }

        console.log('\n✅ MIGRATION COMPLETE!');
        console.log('\nMigrated data:');
        migrationResult.newKeys.forEach(item => {
            console.log(`  ✅ ${item.key}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('🎉 SUCCESS! Next steps:');
        console.log('='.repeat(60));
        console.log('1. Log out of admin');
        console.log('2. Log in as Moony (username + PIN)');
        console.log('3. Verify all data is present:');
        console.log('   - Tasks');
        console.log('   - Projects');
        console.log('   - Project colors');
        console.log('   - Feedback items');
        console.log('4. Test creating/editing a task');
        console.log('5. If everything works, migration is complete! 🎉');
        console.log('\nOld data (tasks, projects, etc.) is still in KV as backup.');
        console.log('You can delete it after confirming everything works.');

    } catch (error) {
        console.error('❌ MIGRATION ERROR:', error);
        console.log('\n⚠️  Restore from backup if needed!');
    }

})();
