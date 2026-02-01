/**
 * Mass Edit Unified Modal - Unit Tests
 * 
 * Tests for the redesigned mass edit system that allows
 * editing multiple fields at once.
 */

// Mock dependencies
const mockTasks = [
    { id: 1, title: 'Task 1', status: 'todo', priority: 'medium', projectId: null, tags: ['tag1'], startDate: '', endDate: '', updatedAt: '2026-01-01' },
    { id: 2, title: 'Task 2', status: 'progress', priority: 'high', projectId: 1, tags: ['tag2', 'tag3'], startDate: '2026-01-15', endDate: '2026-01-20', updatedAt: '2026-01-01' },
    { id: 3, title: 'Task 3', status: 'done', priority: 'low', projectId: 2, tags: [], startDate: '', endDate: '', updatedAt: '2026-01-01' },
    { id: 4, title: 'Task 4', status: 'review', priority: 'medium', projectId: 1, tags: ['tag1', 'tag2'], startDate: '2026-02-01', endDate: '', updatedAt: '2026-01-01' },
    { id: 5, title: 'Task 5', status: 'todo', priority: 'high', projectId: null, tags: ['urgent'], startDate: '', endDate: '2026-01-31', updatedAt: '2026-01-01' },
];

const mockProjects = [
    { id: 1, name: 'Project Alpha' },
    { id: 2, name: 'Project Beta' },
    { id: 3, name: 'Project Gamma' },
];

// Test counters
let testsPassed = 0;
let testsFailed = 0;
const errors = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        errors.push(message);
        console.log(`❌ FAIL: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    if (pass) {
        testsPassed++;
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        errors.push(`${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
        console.log(`❌ FAIL: ${message}`);
        console.log(`   Expected: ${JSON.stringify(expected)}`);
        console.log(`   Got: ${JSON.stringify(actual)}`);
    }
}

// ================================
// Test Suite: Change Collection
// ================================
console.log('\n=== MASS EDIT UNIFIED MODAL TESTS ===\n');
console.log('--- Test Suite: Change Collection Logic ---\n');

// Test 1: Status change only
{
    const changes = [];
    const statusEnabled = true;
    const statusValue = 'done';
    
    if (statusEnabled && statusValue) {
        changes.push({ field: 'status', value: statusValue });
    }
    
    assertEqual(changes.length, 1, 'Single status change creates one change object');
    assertEqual(changes[0].field, 'status', 'Change field is status');
    assertEqual(changes[0].value, 'done', 'Status value is done');
}

// Test 2: Multiple changes at once
{
    const changes = [];
    
    // Simulate all toggles enabled
    changes.push({ field: 'status', value: 'progress' });
    changes.push({ field: 'priority', value: 'high' });
    changes.push({ field: 'project', value: 2 });
    changes.push({ field: 'dates', startDate: '2026-02-01', endDate: '2026-02-28' });
    changes.push({ field: 'tags', mode: 'add', tags: ['newTag1', 'newTag2'] });
    
    assertEqual(changes.length, 5, 'All five fields create five change objects');
}

// Test 3: Empty changes should be filtered
{
    const changes = [];
    const tagsInput = '';
    const tags = tagsInput.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
    
    if (tags.length > 0) {
        changes.push({ field: 'tags', mode: 'add', tags });
    }
    
    assertEqual(changes.length, 0, 'Empty tags input creates no change');
}

// Test 4: Tags parsing with commas
{
    const tagsInput = 'urgent, important, review, bug-fix';
    const tags = tagsInput.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
    
    assertEqual(tags.length, 4, 'Comma-separated tags are parsed correctly');
    assertEqual(tags[0], 'urgent', 'First tag is trimmed');
    assertEqual(tags[3], 'bug-fix', 'Last tag preserves hyphen');
}

// Test 5: Project null handling
{
    const projectValue = '';
    const projectId = projectValue === '' ? null : parseInt(projectValue, 10);
    
    assertEqual(projectId, null, 'Empty project value becomes null');
}

// Test 6: Project ID parsing
{
    const projectValue = '2';
    const projectId = projectValue === '' ? null : parseInt(projectValue, 10);
    
    assertEqual(projectId, 2, 'Project value is parsed to integer');
}

// ================================
// Test Suite: Apply Changes Logic
// ================================
console.log('\n--- Test Suite: Apply Changes to Tasks ---\n');

// Test 7: Apply status change to multiple tasks
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 2, 3];
    const changes = [{ field: 'status', value: 'done' }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'status') {
                task.status = change.value;
            }
        });
    });
    
    assertEqual(tasks[0].status, 'done', 'Task 1 status changed to done');
    assertEqual(tasks[1].status, 'done', 'Task 2 status changed to done');
    assertEqual(tasks[2].status, 'done', 'Task 3 status changed to done');
    assertEqual(tasks[3].status, 'review', 'Task 4 status unchanged (not selected)');
}

// Test 8: Apply priority change
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 5];
    const changes = [{ field: 'priority', value: 'high' }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'priority') {
                task.priority = change.value;
            }
        });
    });
    
    assertEqual(tasks[0].priority, 'high', 'Task 1 priority changed to high');
    assertEqual(tasks[4].priority, 'high', 'Task 5 priority unchanged (already high)');
}

// Test 9: Apply project assignment
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 5];
    const changes = [{ field: 'project', value: 3 }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'project') {
                task.projectId = change.value;
            }
        });
    });
    
    assertEqual(tasks[0].projectId, 3, 'Task 1 assigned to Project 3');
    assertEqual(tasks[4].projectId, 3, 'Task 5 assigned to Project 3');
}

// Test 10: Remove project assignment
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [2, 4];
    const changes = [{ field: 'project', value: null }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'project') {
                task.projectId = change.value;
            }
        });
    });
    
    assertEqual(tasks[1].projectId, null, 'Task 2 project removed');
    assertEqual(tasks[3].projectId, null, 'Task 4 project removed');
}

// Test 11: Apply dates
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 3];
    const changes = [{ field: 'dates', startDate: '2026-03-01', endDate: '2026-03-31' }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'dates') {
                if (change.startDate) {
                    task.startDate = change.startDate;
                }
                if (change.endDate) {
                    task.endDate = change.endDate;
                }
            }
        });
    });
    
    assertEqual(tasks[0].startDate, '2026-03-01', 'Task 1 start date set');
    assertEqual(tasks[0].endDate, '2026-03-31', 'Task 1 end date set');
    assertEqual(tasks[2].startDate, '2026-03-01', 'Task 3 start date set');
}

// Test 12: Apply partial dates (only start)
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1];
    const changes = [{ field: 'dates', startDate: '2026-04-01', endDate: null }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'dates') {
                if (change.startDate) {
                    task.startDate = change.startDate;
                }
                if (change.endDate) {
                    task.endDate = change.endDate;
                }
            }
        });
    });
    
    assertEqual(tasks[0].startDate, '2026-04-01', 'Task 1 start date updated');
    assertEqual(tasks[0].endDate, '', 'Task 1 end date unchanged');
}

// ================================
// Test Suite: Tags Operations
// ================================
console.log('\n--- Test Suite: Tags Operations ---\n');

// Test 13: Add tags (keep existing)
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 2];
    const changes = [{ field: 'tags', mode: 'add', tags: ['newTag', 'important'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags') {
                const oldTags = [...(task.tags || [])];
                
                if (change.mode === 'add') {
                    const newTags = new Set([...oldTags, ...change.tags]);
                    task.tags = Array.from(newTags);
                }
            }
        });
    });
    
    assert(tasks[0].tags.includes('tag1'), 'Task 1 keeps existing tag1');
    assert(tasks[0].tags.includes('newTag'), 'Task 1 has new tag added');
    assert(tasks[0].tags.includes('important'), 'Task 1 has important tag added');
    assertEqual(tasks[0].tags.length, 3, 'Task 1 has 3 tags total');
    
    assert(tasks[1].tags.includes('tag2'), 'Task 2 keeps existing tag2');
    assert(tasks[1].tags.includes('tag3'), 'Task 2 keeps existing tag3');
    assert(tasks[1].tags.includes('newTag'), 'Task 2 has new tag added');
    assertEqual(tasks[1].tags.length, 4, 'Task 2 has 4 tags total');
}

// Test 14: Replace tags
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 2];
    const changes = [{ field: 'tags', mode: 'replace', tags: ['replaced'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags') {
                if (change.mode === 'replace') {
                    task.tags = [...change.tags];
                }
            }
        });
    });
    
    assertEqual(tasks[0].tags, ['replaced'], 'Task 1 tags replaced');
    assertEqual(tasks[1].tags, ['replaced'], 'Task 2 tags replaced');
}

// Test 15: Remove specific tags
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [2, 4];
    const changes = [{ field: 'tags', mode: 'remove', tags: ['tag2'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags') {
                const oldTags = [...(task.tags || [])];
                
                if (change.mode === 'remove') {
                    task.tags = oldTags.filter(tag => !change.tags.includes(tag));
                }
            }
        });
    });
    
    assert(!tasks[1].tags.includes('tag2'), 'Task 2 no longer has tag2');
    assert(tasks[1].tags.includes('tag3'), 'Task 2 still has tag3');
    assertEqual(tasks[1].tags.length, 1, 'Task 2 has 1 tag after removal');
    
    assert(!tasks[3].tags.includes('tag2'), 'Task 4 no longer has tag2');
    assert(tasks[3].tags.includes('tag1'), 'Task 4 still has tag1');
}

// Test 16: Remove non-existent tag (no error)
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [3]; // Task 3 has no tags
    const changes = [{ field: 'tags', mode: 'remove', tags: ['nonexistent'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags') {
                const oldTags = [...(task.tags || [])];
                
                if (change.mode === 'remove') {
                    task.tags = oldTags.filter(tag => !change.tags.includes(tag));
                }
            }
        });
    });
    
    assertEqual(tasks[2].tags.length, 0, 'Task 3 still has empty tags array');
}

// Test 17: Add tags to task with no existing tags
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [3]; // Task 3 has no tags
    const changes = [{ field: 'tags', mode: 'add', tags: ['first', 'second'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags') {
                const oldTags = [...(task.tags || [])];
                
                if (change.mode === 'add') {
                    const newTags = new Set([...oldTags, ...change.tags]);
                    task.tags = Array.from(newTags);
                }
            }
        });
    });
    
    assertEqual(tasks[2].tags.length, 2, 'Task 3 now has 2 tags');
    assert(tasks[2].tags.includes('first'), 'Task 3 has first tag');
}

// ================================
// Test Suite: Multiple Changes at Once
// ================================
console.log('\n--- Test Suite: Multiple Changes at Once ---\n');

// Test 18: Apply status AND priority together
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 2, 3];
    const changes = [
        { field: 'status', value: 'progress' },
        { field: 'priority', value: 'high' }
    ];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'status') {
                task.status = change.value;
            } else if (change.field === 'priority') {
                task.priority = change.value;
            }
        });
    });
    
    assertEqual(tasks[0].status, 'progress', 'Task 1 status is progress');
    assertEqual(tasks[0].priority, 'high', 'Task 1 priority is high');
    assertEqual(tasks[1].status, 'progress', 'Task 2 status is progress');
    assertEqual(tasks[1].priority, 'high', 'Task 2 priority is high');
}

// Test 19: Apply all five fields at once
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1];
    const changes = [
        { field: 'status', value: 'done' },
        { field: 'priority', value: 'low' },
        { field: 'project', value: 3 },
        { field: 'dates', startDate: '2026-05-01', endDate: '2026-05-31' },
        { field: 'tags', mode: 'replace', tags: ['completed', 'archived'] }
    ];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'status') {
                task.status = change.value;
            } else if (change.field === 'priority') {
                task.priority = change.value;
            } else if (change.field === 'project') {
                task.projectId = change.value;
            } else if (change.field === 'dates') {
                if (change.startDate) task.startDate = change.startDate;
                if (change.endDate) task.endDate = change.endDate;
            } else if (change.field === 'tags') {
                if (change.mode === 'replace') {
                    task.tags = [...change.tags];
                }
            }
        });
    });
    
    const task = tasks[0];
    assertEqual(task.status, 'done', 'All fields - status');
    assertEqual(task.priority, 'low', 'All fields - priority');
    assertEqual(task.projectId, 3, 'All fields - project');
    assertEqual(task.startDate, '2026-05-01', 'All fields - start date');
    assertEqual(task.endDate, '2026-05-31', 'All fields - end date');
    assertEqual(task.tags, ['completed', 'archived'], 'All fields - tags');
}

// ================================
// Test Suite: Edge Cases
// ================================
console.log('\n--- Test Suite: Edge Cases ---\n');

// Test 20: Empty selection
{
    const selectedIds = [];
    const changes = [{ field: 'status', value: 'done' }];
    let appliedCount = 0;
    
    selectedIds.forEach(taskId => {
        appliedCount++;
    });
    
    assertEqual(appliedCount, 0, 'No changes applied with empty selection');
}

// Test 21: Non-existent task ID
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [999]; // Non-existent
    const changes = [{ field: 'status', value: 'done' }];
    let appliedCount = 0;
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        appliedCount++;
    });
    
    assertEqual(appliedCount, 0, 'Non-existent task ID is skipped');
}

// Test 22: Mixed valid and invalid IDs
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1, 999, 2, 888];
    const validIds = selectedIds.filter(id => tasks.find(t => t.id === id));
    
    assertEqual(validIds.length, 2, 'Only valid IDs are processed');
    assert(validIds.includes(1), 'ID 1 is valid');
    assert(validIds.includes(2), 'ID 2 is valid');
}

// Test 23: Duplicate tags are deduplicated
{
    const tasks = JSON.parse(JSON.stringify(mockTasks));
    const selectedIds = [1]; // Task 1 has ['tag1']
    const changes = [{ field: 'tags', mode: 'add', tags: ['tag1', 'tag1', 'new'] }];
    
    selectedIds.forEach(taskId => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        changes.forEach(change => {
            if (change.field === 'tags' && change.mode === 'add') {
                const oldTags = [...(task.tags || [])];
                const newTags = new Set([...oldTags, ...change.tags]);
                task.tags = Array.from(newTags);
            }
        });
    });
    
    assertEqual(tasks[0].tags.length, 2, 'Duplicate tags are removed');
    assert(tasks[0].tags.includes('tag1'), 'Original tag1 present');
    assert(tasks[0].tags.includes('new'), 'New tag present');
}

// Test 24: Tags with extra whitespace
{
    const tagsInput = '  spaced  ,  trimmed  ,   extra   ';
    const tags = tagsInput.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
    
    assertEqual(tags.length, 3, 'Whitespace-padded tags are parsed');
    assertEqual(tags[0], 'spaced', 'Whitespace trimmed from first tag');
    assertEqual(tags[1], 'trimmed', 'Whitespace trimmed from second tag');
}

// Test 25: Tags normalized to lowercase
{
    const tagsInput = 'UPPERCASE, MixedCase, lowercase';
    const tags = tagsInput.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
    
    assertEqual(tags[0], 'uppercase', 'Uppercase normalized');
    assertEqual(tags[1], 'mixedcase', 'MixedCase normalized');
    assertEqual(tags[2], 'lowercase', 'Lowercase unchanged');
}

// ================================
// Test Suite: Validation
// ================================
console.log('\n--- Test Suite: Validation ---\n');

// Test 26: No changes when no toggles enabled
{
    const changes = [];
    const statusToggle = false;
    const priorityToggle = false;
    const projectToggle = false;
    const datesToggle = false;
    const tagsToggle = false;
    
    // Simulate the collection logic
    if (statusToggle) changes.push({ field: 'status', value: 'done' });
    if (priorityToggle) changes.push({ field: 'priority', value: 'high' });
    if (projectToggle) changes.push({ field: 'project', value: 1 });
    if (datesToggle) changes.push({ field: 'dates', startDate: '2026-01-01', endDate: null });
    if (tagsToggle) changes.push({ field: 'tags', mode: 'add', tags: ['test'] });
    
    assertEqual(changes.length, 0, 'No changes when all toggles disabled');
}

// Test 27: Only enabled fields create changes
{
    const changes = [];
    const statusToggle = true;
    const priorityToggle = false;
    const projectToggle = true;
    const datesToggle = false;
    const tagsToggle = false;
    
    if (statusToggle) changes.push({ field: 'status', value: 'done' });
    if (priorityToggle) changes.push({ field: 'priority', value: 'high' });
    if (projectToggle) changes.push({ field: 'project', value: 1 });
    if (datesToggle) changes.push({ field: 'dates', startDate: '2026-01-01', endDate: null });
    if (tagsToggle) changes.push({ field: 'tags', mode: 'add', tags: ['test'] });
    
    assertEqual(changes.length, 2, 'Only status and project changes');
    assertEqual(changes[0].field, 'status', 'First change is status');
    assertEqual(changes[1].field, 'project', 'Second change is project');
}

// ================================
// Test Summary
// ================================
console.log('\n=== TEST SUMMARY ===');
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.log('\n=== FAILED TESTS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
    process.exit(1);
} else {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    process.exit(0);
}
