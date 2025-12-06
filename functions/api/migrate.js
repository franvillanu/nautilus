// functions/api/migrate.js - One-time data migration to user-scoped storage
import { createPinHash } from '../../utils/pin.js';

const TEMP_PIN = '1234'; // Temporary PIN for migrated user

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Check if migration already happened
        const migrationFlag = await env.NAUTILUS_DATA.get('migration:completed');
        if (migrationFlag) {
            return jsonResponse({
                message: 'Migration already completed',
                user: JSON.parse(migrationFlag)
            });
        }

        // Check for existing data in old format
        const oldTasks = await env.NAUTILUS_DATA.get('tasks');
        const oldProjects = await env.NAUTILUS_DATA.get('projects');

        if (!oldTasks && !oldProjects) {
            return jsonResponse({
                message: 'No data to migrate'
            });
        }

        // Create default user "moony" (based on the hardcoded user in index.html)
        const userId = `user-${Date.now()}-moony`;
        const pinHash = await createPinHash(TEMP_PIN);

        const user = {
            id: userId,
            username: 'moony',
            name: 'Moony Lambre',
            email: 'malambre@ull.edu.es',
            pinHash,
            needsSetup: false, // Already set up with existing data
            createdAt: new Date().toISOString(),
            migratedFromOldSystem: true
        };

        // Save user
        await env.NAUTILUS_DATA.put(`user:${userId}`, JSON.stringify(user));

        // Create lookups
        await env.NAUTILUS_DATA.put('user:username:moony', userId);
        await env.NAUTILUS_DATA.put('user:email:malambre@ull.edu.es', userId);

        // Migrate tasks
        if (oldTasks) {
            await env.NAUTILUS_DATA.put(`user:${userId}:tasks`, oldTasks);
        }

        // Migrate projects
        if (oldProjects) {
            await env.NAUTILUS_DATA.put(`user:${userId}:projects`, oldProjects);
        }

        // Add to user list
        const userList = [''];
        userList.push(userId);
        await env.NAUTILUS_DATA.put('admin:userlist', JSON.stringify(userList));

        // Mark migration as complete
        await env.NAUTILUS_DATA.put('migration:completed', JSON.stringify({
            userId,
            username: 'moony',
            migratedAt: new Date().toISOString()
        }));

        return jsonResponse({
            success: true,
            message: 'Migration completed successfully',
            user: {
                username: 'moony',
                email: 'malambre@ull.edu.es',
                tempPin: TEMP_PIN
            },
            migrated: {
                tasks: oldTasks ? JSON.parse(oldTasks).length : 0,
                projects: oldProjects ? JSON.parse(oldProjects).length : 0
            }
        });
    } catch (error) {
        console.error('Migration error:', error);
        return jsonResponse({
            error: 'Migration failed',
            details: error.message
        }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
