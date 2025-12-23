/**
 * Data Migration Endpoint
 * Migrates old unscoped data to new user-scoped format
 *
 * POST /api/migrate-data
 * Body: { userId: number, adminToken: string }
 *
 * CRITICAL: Only run this ONCE per user after backing up data
 */

import { verifyRequest } from '../../utils/jwt.js';
import { getJwtSecretsForVerify } from '../../utils/secrets.js';

export async function onRequest(context) {
    const { request, env } = context;

    // Only allow POST
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const JWT_SECRETS_FOR_VERIFY = getJwtSecretsForVerify(env);

        const body = await request.json();
        const { userId, dryRun = false } = body;

        // Verify admin authentication
        const payload = await verifyRequest(request, JWT_SECRETS_FOR_VERIFY);
        if (!payload || !payload.isAdmin) {
            return new Response('Unauthorized - Admin access required', { status: 401 });
        }

        if (!userId) {
            return new Response('Missing userId parameter', { status: 400 });
        }

        console.log(`🔄 Starting migration for userId: ${userId} (dry run: ${dryRun})`);

        const migrationReport = {
            userId,
            dryRun,
            timestamp: new Date().toISOString(),
            oldKeys: [],
            newKeys: [],
            errors: []
        };

        // Keys to migrate
        const keysToMigrate = [
            'tasks',
            'projects',
            'feedbackItems',
            'projectColors',
            'sortMode',
            'manualTaskOrder'
        ];

        // Step 1: Read all old data
        for (const oldKey of keysToMigrate) {
            try {
                const oldValue = await env.NAUTILUS_DATA.get(oldKey);

                if (oldValue) {
                    const newKey = `user:${userId}:${oldKey}`;

                    migrationReport.oldKeys.push({
                        key: oldKey,
                        size: oldValue.length,
                        preview: oldValue.substring(0, 100) + '...'
                    });

                    // Step 2: Write to new scoped key
                    if (!dryRun) {
                        await env.NAUTILUS_DATA.put(newKey, oldValue);
                        console.log(`✅ Migrated: ${oldKey} → ${newKey}`);
                    } else {
                        console.log(`🔍 Would migrate: ${oldKey} → ${newKey}`);
                    }

                    migrationReport.newKeys.push({
                        key: newKey,
                        migrated: !dryRun
                    });
                } else {
                    console.log(`⚠️  No data for: ${oldKey}`);
                    migrationReport.oldKeys.push({
                        key: oldKey,
                        size: 0,
                        preview: 'null'
                    });
                }
            } catch (error) {
                console.error(`❌ Error migrating ${oldKey}:`, error);
                migrationReport.errors.push({
                    key: oldKey,
                    error: error.message
                });
            }
        }

        // Step 3: Verify migration (if not dry run)
        if (!dryRun) {
            console.log('🔍 Verifying migration...');
            for (const oldKey of keysToMigrate) {
                const newKey = `user:${userId}:${oldKey}`;
                const newValue = await env.NAUTILUS_DATA.get(newKey);
                const oldValue = await env.NAUTILUS_DATA.get(oldKey);

                if (oldValue && !newValue) {
                    migrationReport.errors.push({
                        key: oldKey,
                        error: 'Migration failed - new key is empty but old key has data'
                    });
                }
            }
        }

        migrationReport.success = migrationReport.errors.length === 0;
        migrationReport.message = dryRun
            ? 'Dry run complete - no data was modified'
            : migrationReport.success
                ? 'Migration complete - all data migrated successfully'
                : 'Migration completed with errors - check errors array';

        return new Response(JSON.stringify(migrationReport, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Migration error:', error);
        return new Response(JSON.stringify({
            error: 'Migration failed',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
