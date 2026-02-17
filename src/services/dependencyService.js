/**
 * Dependency Service
 * Handles task dependency relationships and validation
 * Pure data operations - UI updates handled by caller
 */

/**
 * Add a dependency relationship
 * @param {number} dependentTaskId - Task that depends on another
 * @param {number} prerequisiteTaskId - Task that must be completed first
 * @param {Object} dependencies - Current dependencies object
 * @param {Array} tasks - Current tasks array (for validation)
 * @returns {{dependencies: Object, error: string|null}}
 */
export function addDependency(dependentTaskId, prerequisiteTaskId, dependencies, tasks) {
    // Validate task IDs exist
    const dependentExists = tasks.some(t => t.id === dependentTaskId);
    const prerequisiteExists = tasks.some(t => t.id === prerequisiteTaskId);

    if (!dependentExists) {
        return {
            dependencies,
            error: `Task ${dependentTaskId} does not exist`
        };
    }

    if (!prerequisiteExists) {
        return {
            dependencies,
            error: `Task ${prerequisiteTaskId} does not exist`
        };
    }

    // Prevent self-dependency
    if (dependentTaskId === prerequisiteTaskId) {
        return {
            dependencies,
            error: "A task cannot depend on itself"
        };
    }

    // Check for circular dependency
    const cycleCheck = validateNoCycle(dependentTaskId, prerequisiteTaskId, dependencies);
    if (!cycleCheck.valid) {
        return {
            dependencies,
            error: cycleCheck.error
        };
    }

    // Create new dependencies object (immutable)
    const newDependencies = { ...dependencies };
    const key = String(dependentTaskId);
    
    // Get existing prerequisites or create new array
    const existingPrereqs = newDependencies[key] || [];
    
    // Check for duplicate
    if (existingPrereqs.includes(prerequisiteTaskId)) {
        // Idempotent - no error, just return unchanged
        return {
            dependencies: newDependencies,
            error: null
        };
    }

    // Add the new prerequisite
    newDependencies[key] = [...existingPrereqs, prerequisiteTaskId];

    return {
        dependencies: newDependencies,
        error: null
    };
}

/**
 * Remove a dependency relationship
 * @param {number} dependentTaskId - Task that depends on another
 * @param {number} prerequisiteTaskId - Task to remove as prerequisite
 * @param {Object} dependencies - Current dependencies object
 * @returns {{dependencies: Object}}
 */
export function removeDependency(dependentTaskId, prerequisiteTaskId, dependencies) {
    const newDependencies = { ...dependencies };
    const key = String(dependentTaskId);
    
    if (!newDependencies[key]) {
        return { dependencies: newDependencies };
    }

    // Filter out the prerequisite
    const updatedPrereqs = newDependencies[key].filter(id => id !== prerequisiteTaskId);
    
    if (updatedPrereqs.length === 0) {
        // Remove the key if no prerequisites remain
        delete newDependencies[key];
    } else {
        newDependencies[key] = updatedPrereqs;
    }

    return { dependencies: newDependencies };
}

/**
 * Get all prerequisite tasks for a given task
 * @param {number} taskId - Task to query
 * @param {Object} dependencies - Current dependencies object
 * @returns {Array<number>} Array of prerequisite task IDs
 */
export function getPrerequisites(taskId, dependencies) {
    const key = String(taskId);
    return dependencies[key] ? [...dependencies[key]] : [];
}

/**
 * Get all dependent tasks (tasks that depend on this task)
 * @param {number} taskId - Task to query
 * @param {Object} dependencies - Current dependencies object
 * @returns {Array<number>} Array of dependent task IDs
 */
export function getDependents(taskId, dependencies) {
    const reverseIndex = buildReverseIndex(dependencies);
    const key = String(taskId);
    return reverseIndex[key] ? [...reverseIndex[key]] : [];
}

/**
 * Check if a task is blocked (has incomplete prerequisites)
 * @param {number} taskId - Task to check
 * @param {Object} dependencies - Current dependencies object
 * @param {Array} tasks - Current tasks array
 * @returns {{blocked: boolean, blockingTasks: Array<Object>}}
 */
export function isTaskBlocked(taskId, dependencies, tasks) {
    const prerequisites = getPrerequisites(taskId, dependencies);
    
    if (prerequisites.length === 0) {
        return { blocked: false, blockingTasks: [] };
    }
    
    const blockingTasks = prerequisites
        .map(prereqId => tasks.find(t => t.id === prereqId))
        .filter(task => task && task.status !== 'done');
    
    return {
        blocked: blockingTasks.length > 0,
        blockingTasks
    };
}

/**
 * Remove all dependencies involving a task (when task is deleted)
 * @param {number} taskId - Task being deleted
 * @param {Object} dependencies - Current dependencies object
 * @returns {{dependencies: Object}}
 */
export function removeDependenciesForTask(taskId, dependencies) {
    let newDependencies = { ...dependencies };
    const key = String(taskId);
    
    // Remove task as a dependent (remove its prerequisites)
    delete newDependencies[key];
    
    // Remove task as a prerequisite from all other tasks
    for (const [depKey, prereqs] of Object.entries(newDependencies)) {
        const updatedPrereqs = prereqs.filter(id => id !== taskId);
        if (updatedPrereqs.length === 0) {
            delete newDependencies[depKey];
        } else {
            newDependencies[depKey] = updatedPrereqs;
        }
    }
    
    return { dependencies: newDependencies };
}

/**
 * Validate that adding a dependency won't create a cycle
 * @param {number} dependentTaskId - Task that would depend on another
 * @param {number} prerequisiteTaskId - Task that would be prerequisite
 * @param {Object} dependencies - Current dependencies object
 * @returns {{valid: boolean, error: string|null, cycle: Array<number>|null}}
 */
export function validateNoCycle(dependentTaskId, prerequisiteTaskId, dependencies) {
    // Use DFS to detect if adding this edge would create a cycle
    // We need to check if there's a path from prerequisiteTaskId to dependentTaskId
    
    const visited = new Set();
    const path = [];
    
    function dfs(currentId) {
        if (currentId === dependentTaskId) {
            // Found a path back to the dependent - would create a cycle
            return true;
        }
        
        if (visited.has(currentId)) {
            return false;
        }
        
        visited.add(currentId);
        path.push(currentId);
        
        const prereqs = dependencies[String(currentId)] || [];
        for (const prereqId of prereqs) {
            if (dfs(prereqId)) {
                return true;
            }
        }
        
        path.pop();
        return false;
    }
    
    if (dfs(prerequisiteTaskId)) {
        const cyclePath = [dependentTaskId, ...path, dependentTaskId];
        return {
            valid: false,
            error: `Adding this dependency would create a cycle: ${cyclePath.join(' → ')}`,
            cycle: cyclePath
        };
    }
    
    return {
        valid: true,
        error: null,
        cycle: null
    };
}

/**
 * Build reverse index for computing dependents
 * @param {Object} dependencies - Current dependencies object
 * @returns {Object} Reverse index mapping prerequisite IDs to dependent IDs
 */
export function buildReverseIndex(dependencies) {
    const reverse = {};
    
    for (const [dependentId, prerequisites] of Object.entries(dependencies)) {
        prerequisites.forEach(prereqId => {
            const key = String(prereqId);
            if (!reverse[key]) {
                reverse[key] = [];
            }
            reverse[key].push(parseInt(dependentId, 10));
        });
    }
    
    return reverse;
}

/**
 * Serialize dependencies to JSON-compatible format
 * @param {Object} dependencies - Dependencies object
 * @returns {Object} JSON-serializable object
 */
export function serializeDependencies(dependencies) {
    // Dependencies are already in JSON-compatible format
    // Just ensure we return a clean copy
    return JSON.parse(JSON.stringify(dependencies));
}

/**
 * Deserialize dependencies from storage format
 * @param {Object} data - Stored dependency data
 * @returns {Object} Dependencies object
 */
export function deserializeDependencies(data) {
    if (!data || typeof data !== 'object') {
        return {};
    }
    
    // Reconstruct the dependencies object
    // Ensure all keys are strings and values are arrays of numbers
    const dependencies = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            dependencies[key] = value.map(id => parseInt(id, 10));
        }
    }
    
    return dependencies;
}
