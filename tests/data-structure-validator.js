/**
 * Data Structure Validator
 *
 * Validates tasks and projects data integrity.
 *
 * Usage:
 *   1. Load app in browser
 *   2. Open DevTools console
 *   3. Run: await import('./tests/data-structure-validator.js')
 *
 * Or add to index.html during development:
 *   <script type="module" src="./tests/data-structure-validator.js"></script>
 */

// Expected data structures
const TASK_REQUIRED_FIELDS = ['id', 'title', 'status', 'priority', 'createdAt'];
const TASK_OPTIONAL_FIELDS = ['description', 'projectId', 'category', 'startDate', 'endDate', 'tags', 'attachments'];
const VALID_STATUSES = ['todo', 'progress', 'review', 'done'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const PROJECT_REQUIRED_FIELDS = ['id', 'name', 'startDate', 'createdAt'];
const PROJECT_OPTIONAL_FIELDS = ['description', 'endDate'];

function validateDataStructures() {
    console.log('🧪 Data Structure Validation Starting...\n');

    // Access global data (assumes app.js has loaded)
    const tasks = window.tasks || [];
    const projects = window.projects || [];

    console.log(`📊 Found ${tasks.length} tasks, ${projects.length} projects\n`);

    const errors = [];
    const warnings = [];

    // Validate Tasks
    console.log('🔍 Validating Tasks...\n');

    tasks.forEach((task, index) => {
        const taskLabel = `Task #${index} (id: ${task.id || 'undefined'})`;

        // Check required fields
        TASK_REQUIRED_FIELDS.forEach(field => {
            if (task[field] === undefined || task[field] === null) {
                errors.push(`${taskLabel}: Missing required field "${field}"`);
            }
        });

        // Validate status
        if (task.status && !VALID_STATUSES.includes(task.status)) {
            errors.push(`${taskLabel}: Invalid status "${task.status}". Expected: ${VALID_STATUSES.join(', ')}`);
        }

        // Validate priority
        if (task.priority && !VALID_PRIORITIES.includes(task.priority)) {
            errors.push(`${taskLabel}: Invalid priority "${task.priority}". Expected: ${VALID_PRIORITIES.join(', ')}`);
        }

        // Validate projectId (if present, must be null or valid project ID)
        if (task.projectId !== null && task.projectId !== undefined) {
            const projectExists = projects.some(p => p.id === task.projectId);
            if (!projectExists) {
                errors.push(`${taskLabel}: References non-existent projectId ${task.projectId} (orphaned task)`);
            }
        }

        // Validate date formats
        if (task.startDate && task.startDate !== '' && !isValidDate(task.startDate)) {
            errors.push(`${taskLabel}: Invalid startDate format "${task.startDate}". Expected ISO (YYYY-MM-DD)`);
        }

        if (task.endDate && task.endDate !== '' && !isValidDate(task.endDate)) {
            errors.push(`${taskLabel}: Invalid endDate format "${task.endDate}". Expected ISO (YYYY-MM-DD)`);
        }

        if (task.createdAt && !isValidISO(task.createdAt)) {
            errors.push(`${taskLabel}: Invalid createdAt format "${task.createdAt}". Expected ISO timestamp`);
        }

        // Validate arrays
        if (task.tags && !Array.isArray(task.tags)) {
            errors.push(`${taskLabel}: tags field must be an array`);
        }

        if (task.attachments && !Array.isArray(task.attachments)) {
            errors.push(`${taskLabel}: attachments field must be an array`);
        }

        // Warnings for empty title
        if (task.title && task.title.trim() === '') {
            warnings.push(`${taskLabel}: Title is empty or whitespace only`);
        }
    });

    // Validate Projects
    console.log('🔍 Validating Projects...\n');

    projects.forEach((project, index) => {
        const projectLabel = `Project #${index} (id: ${project.id || 'undefined'})`;

        // Check required fields
        PROJECT_REQUIRED_FIELDS.forEach(field => {
            if (project[field] === undefined || project[field] === null) {
                errors.push(`${projectLabel}: Missing required field "${field}"`);
            }
        });

        // Validate date formats
        if (project.startDate && !isValidDate(project.startDate)) {
            errors.push(`${projectLabel}: Invalid startDate format "${project.startDate}". Expected ISO (YYYY-MM-DD)`);
        }

        if (project.endDate && project.endDate !== '' && !isValidDate(project.endDate)) {
            errors.push(`${projectLabel}: Invalid endDate format "${project.endDate}". Expected ISO (YYYY-MM-DD)`);
        }

        if (project.createdAt && !isValidISO(project.createdAt)) {
            errors.push(`${projectLabel}: Invalid createdAt format "${project.createdAt}". Expected ISO timestamp`);
        }

        // Warnings for empty name
        if (project.name && project.name.trim() === '') {
            warnings.push(`${projectLabel}: Name is empty or whitespace only`);
        }

        // Check for date logic (startDate before endDate)
        if (project.startDate && project.endDate && project.startDate > project.endDate) {
            warnings.push(`${projectLabel}: startDate (${project.startDate}) is after endDate (${project.endDate})`);
        }
    });

    // Report Results
    console.log('📋 Validation Results:\n');

    if (errors.length > 0) {
        console.error('❌ Errors Found:\n');
        errors.forEach(err => console.error(`  • ${err}`));
        console.error('');
    }

    if (warnings.length > 0) {
        console.warn('⚠️  Warnings:\n');
        warnings.forEach(warn => console.warn(`  • ${warn}`));
        console.warn('');
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All Data Valid!\n');
        console.log(`  • Tasks: ${tasks.length} valid`);
        console.log(`  • Projects: ${projects.length} valid`);
        console.log('  • No orphaned tasks');
        console.log('  • All dates in valid format\n');
    } else if (errors.length === 0) {
        console.log('✅ Validation Passed (with warnings)\n');
        console.log(`  • Tasks: ${tasks.length} valid`);
        console.log(`  • Projects: ${projects.length} valid`);
        console.log(`  • ${warnings.length} warnings (see above)\n`);
    } else {
        console.error('❌ Validation Failed\n');
        console.error(`  • ${errors.length} errors found`);
        console.error(`  • ${warnings.length} warnings found`);
        console.error('  • Fix errors before committing\n');
    }

    // Statistics
    const orphanedTasks = tasks.filter(t =>
        t.projectId !== null &&
        t.projectId !== undefined &&
        !projects.some(p => p.id === t.projectId)
    ).length;

    const unassignedTasks = tasks.filter(t => t.projectId === null || t.projectId === undefined).length;

    console.log('📊 Statistics:\n');
    console.log(`  Total tasks: ${tasks.length}`);
    console.log(`  Assigned to projects: ${tasks.length - unassignedTasks}`);
    console.log(`  Unassigned: ${unassignedTasks}`);
    console.log(`  Orphaned (invalid projectId): ${orphanedTasks}`);
    console.log(`  Total projects: ${projects.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    console.log(`  Status: ${errors.length === 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    return {
        success: errors.length === 0,
        errors: errors.length,
        warnings: warnings.length,
        stats: {
            tasks: tasks.length,
            projects: projects.length,
            orphanedTasks,
            unassignedTasks
        },
        details: {
            errors,
            warnings
        }
    };
}

// Helper functions
function isValidDate(dateStr) {
    // Check YYYY-MM-DD format
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

function isValidISO(isoStr) {
    // Check ISO timestamp format
    const date = new Date(isoStr);
    return date instanceof Date && !isNaN(date) && date.toISOString() === isoStr;
}

// Auto-run when imported
const result = validateDataStructures();

// Export for programmatic use
export default validateDataStructures;
export { result };
