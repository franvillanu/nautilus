/**
 * Event Delegation Validator
 *
 * Validates that all data-action attributes have corresponding handlers
 * in the event delegation system.
 *
 * Usage:
 *   1. Load app in browser
 *   2. Open DevTools console
 *   3. Run: await import('./tests/event-delegation-validator.js')
 *
 * Or add to index.html during development:
 *   <script type="module" src="./tests/event-delegation-validator.js"></script>
 */

// Action handlers map (copy from app.js for reference)
const EXPECTED_ACTIONS = [
    // Theme & UI
    'toggleTheme',
    'showCalendarView',
    'toggleKanbanSettings',

    // Modals
    'openProjectModal',
    'openTaskModal',
    'openTaskModalForProject',
    'closeModal',
    'closeTaskModal',
    'closeConfirmModal',
    'closeFeedbackDeleteModal',
    'closeProjectConfirmModal',
    'closeUnsavedChangesModal',
    'closeDayItemsModal',
    'closeDayItemsModalOnBackdrop',

    // Task operations
    'openTaskDetails',
    'deleteTask',
    'duplicateTask',
    'confirmDelete',

    // Project operations
    'showProjectDetails',
    'toggleProjectExpand',
    'toggleProjectMenu',
    'editProjectTitle',
    'saveProjectTitle',
    'cancelProjectTitle',
    'handleDeleteProject',
    'toggleProjectColorPicker',
    'updateProjectColor',
    'navigateToProjectStatus',
    'deleteProject',
    'confirmProjectDelete',

    // Feedback operations
    'addFeedbackItem',
    'deleteFeedbackItem',
    'confirmFeedbackDelete',

    // Formatting
    'formatTaskText',
    'insertTaskHeading',
    'insertTaskDivider',

    // Sorting & filtering
    'sortTable',
    'toggleSortMode',

    // Calendar
    'changeMonth',
    'goToToday',
    'showDayTasks',

    // Attachments & tags
    'addAttachment',
    'addFileAttachment',
    'addTag',
    'removeTag',
    'removeAttachment',
    'downloadFileAttachment',
    'viewFile',
    'viewImageLegacy',

    // Navigation
    'backToProjects',
    'showAllActivity',
    'backToDashboard',

    // Other
    'dismissKanbanTip',
    'confirmDiscardChanges',
    'signOut',
    'exportDashboardData',
    'generateReport',
    'showStatusInfoModal',

    // Special cases
    'stopPropagation',
    'closeModalOnBackdrop',

    // Combined actions
    'closeDayItemsAndOpenTask',
    'closeDayItemsAndShowProject',
    'deleteFeedbackItemWithStop',
];

function validateEventDelegation() {
    console.log('🧪 Event Delegation Validation Starting...\n');

    // Find all elements with data-action
    const actionElements = document.querySelectorAll('[data-action]');
    console.log(`📊 Found ${actionElements.length} elements with data-action\n`);

    // Collect unique actions used in HTML
    const usedActions = new Set();
    const actionUsage = {};

    actionElements.forEach(el => {
        const action = el.dataset.action;
        usedActions.add(action);

        if (!actionUsage[action]) {
            actionUsage[action] = [];
        }

        // Store element info for debugging
        const info = {
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            class: el.className || '',
            text: (el.textContent || '').substring(0, 30).trim()
        };
        actionUsage[action].push(info);
    });

    console.log(`📋 Unique actions used: ${usedActions.size}\n`);

    // Check for missing handlers
    const missingHandlers = [];
    usedActions.forEach(action => {
        if (!EXPECTED_ACTIONS.includes(action)) {
            missingHandlers.push({
                action,
                count: actionUsage[action].length,
                examples: actionUsage[action].slice(0, 3)
            });
        }
    });

    // Check for unused handlers
    const unusedHandlers = EXPECTED_ACTIONS.filter(action => !usedActions.has(action));

    // Report results
    let hasErrors = false;

    if (missingHandlers.length > 0) {
        hasErrors = true;
        console.error('❌ Missing Handlers Detected!\n');
        console.error('The following actions are used in HTML but not registered:\n');

        missingHandlers.forEach(({action, count, examples}) => {
            console.error(`  • ${action} (found in ${count} element${count > 1 ? 's' : ''})`);
            examples.forEach(ex => {
                console.error(`    - <${ex.tag}${ex.id ? ' id="' + ex.id + '"' : ''}> "${ex.text}"`);
            });
            console.error('');
        });

        console.error('Fix: Add these actions to the actions map in app.js\n');
    }

    if (unusedHandlers.length > 0) {
        console.warn('⚠️  Unused Handlers (registered but not used in HTML):\n');
        unusedHandlers.forEach(action => {
            console.warn(`  • ${action}`);
        });
        console.warn('\nThese might be:');
        console.warn('  - Dynamically generated (rendered by JavaScript)');
        console.warn('  - Planned for future use');
        console.warn('  - Dead code that can be removed\n');
    }

    if (!hasErrors && unusedHandlers.length === 0) {
        console.log('✅ All Good!\n');
        console.log('  • All data-action elements have registered handlers');
        console.log('  • All registered handlers are used');
        console.log('  • No missing or unused handlers\n');
    } else if (!hasErrors) {
        console.log('✅ Validation Passed (with warnings)\n');
        console.log('  • All data-action elements have registered handlers');
        console.log(`  • ${unusedHandlers.length} unused handlers (see warnings above)\n`);
    }

    // Detailed usage report
    console.log('📊 Action Usage Report:\n');
    const sortedActions = Array.from(usedActions).sort();
    sortedActions.forEach(action => {
        const count = actionUsage[action].length;
        console.log(`  ${action}: ${count} usage${count > 1 ? 's' : ''}`);
    });

    console.log('\n🎯 Summary:');
    console.log(`  Total elements: ${actionElements.length}`);
    console.log(`  Unique actions: ${usedActions.size}`);
    console.log(`  Missing handlers: ${missingHandlers.length}`);
    console.log(`  Unused handlers: ${unusedHandlers.length}`);
    console.log(`  Status: ${hasErrors ? '❌ FAIL' : '✅ PASS'}\n`);

    return {
        success: !hasErrors,
        totalElements: actionElements.length,
        uniqueActions: usedActions.size,
        missingHandlers: missingHandlers.length,
        unusedHandlers: unusedHandlers.length,
        details: {
            missing: missingHandlers,
            unused: unusedHandlers,
            usage: actionUsage
        }
    };
}

// Auto-run when imported
const result = validateEventDelegation();

// Export for programmatic use
export default validateEventDelegation;
export { result };
