/**
 * Task Service
 * Handles task CRUD operations and business logic
 * Pure data operations - UI updates handled by caller
 */

import { looksLikeDMY, looksLikeISO, toISOFromDMY } from "../utils/date.js";

/**
 * Create a new task
 * @param {Object} taskData - Task data from form
 * @param {Array} tasks - Current tasks array
 * @param {number} taskCounter - Current task counter
 * @param {Array} tempAttachments - Temporary attachments array
 * @returns {{task: Object, tasks: Array, taskCounter: number}} Created task and updated arrays
 */
export function createTask(taskData, tasks, taskCounter, tempAttachments = []) {
    const now = new Date().toISOString();
    const startDate = taskData.startDate || "";
    const endDate = taskData.endDate || "";
    const newTask = {
        id: taskCounter,
        title: taskData.title || "",
        description: taskData.description || "",
        projectId: taskData.projectId ? parseInt(taskData.projectId, 10) : null,
        startDate,
        endDate,
        startDateWasEverSet: typeof startDate === 'string' && startDate.trim() !== "",
        endDateWasEverSet: typeof endDate === 'string' && endDate.trim() !== "",
        priority: taskData.priority || "medium",
        status: taskData.status || "todo",
        tags: taskData.tags || [],
        attachments: tempAttachments.length > 0 ? [...tempAttachments] : [],
        createdAt: now,
        updatedAt: now,
    };

    const updatedTasks = [...tasks, newTask];
    const updatedCounter = taskCounter + 1;

    return {
        task: newTask,
        tasks: updatedTasks,
        taskCounter: updatedCounter
    };
}

/**
 * Update an existing task
 * @param {number} taskId - ID of task to update
 * @param {Object} taskData - Updated task data
 * @param {Array} tasks - Current tasks array
 * @returns {{task: Object|null, tasks: Array, oldProjectId: number|null}} Updated task and arrays
 */
export function updateTask(taskId, taskData, tasks) {
    const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId, 10));

    if (taskIndex === -1) {
        return { task: null, tasks, oldProjectId: null };
    }

    const oldTask = tasks[taskIndex];
    const oldProjectId = oldTask.projectId;

    const nextProjectId = taskData.projectId !== undefined
        ? (taskData.projectId ? parseInt(taskData.projectId, 10) : null)
        : oldTask.projectId;

    const updatedTask = {
        ...oldTask,
        title: taskData.title !== undefined ? taskData.title : oldTask.title,
        description: taskData.description !== undefined ? taskData.description : oldTask.description,
        projectId: nextProjectId,
        startDate: taskData.startDate !== undefined ? taskData.startDate : oldTask.startDate,
        endDate: taskData.endDate !== undefined ? taskData.endDate : oldTask.endDate,
        priority: taskData.priority !== undefined ? taskData.priority : oldTask.priority,
        status: taskData.status !== undefined ? taskData.status : oldTask.status,
    };

    if (taskData.startDate !== undefined && typeof updatedTask.startDate === 'string' && updatedTask.startDate.trim() !== "") {
        updatedTask.startDateWasEverSet = true;
    }
    if (taskData.endDate !== undefined && typeof updatedTask.endDate === 'string' && updatedTask.endDate.trim() !== "") {
        updatedTask.endDateWasEverSet = true;
    }

    const changed =
        updatedTask.title !== oldTask.title ||
        updatedTask.description !== oldTask.description ||
        updatedTask.projectId !== oldTask.projectId ||
        updatedTask.startDate !== oldTask.startDate ||
        updatedTask.endDate !== oldTask.endDate ||
        updatedTask.priority !== oldTask.priority ||
        updatedTask.status !== oldTask.status;

    if (!changed) {
        return {
            task: oldTask,
            tasks,
            oldProjectId
        };
    }

    updatedTask.updatedAt = new Date().toISOString();

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    return {
        task: updatedTask,
        tasks: updatedTasks,
        oldProjectId
    };
}

/**
 * Update a single field of a task
 * @param {number} taskId - ID of task to update
 * @param {string} field - Field name to update
 * @param {any} value - New value for the field
 * @param {Array} tasks - Current tasks array
 * @returns {{task: Object|null, tasks: Array, oldProjectId: number|null}} Updated task and arrays
 */
export function updateTaskField(taskId, field, value, tasks, settings = {
    autoSetStartDateOnStatusChange: false,
    autoSetEndDateOnStatusChange: false
}) {
    const taskIndex = tasks.findIndex(t => t.id === parseInt(taskId, 10));

    if (taskIndex === -1) {
        return { task: null, tasks, oldProjectId: null };
    }

    const oldTask = tasks[taskIndex];
    const oldProjectId = oldTask.projectId;
    const updatedTask = { ...oldTask };

    const prevStartDate = oldTask.startDate;
    const prevEndDate = oldTask.endDate;
    const prevCompletedDate = oldTask.completedDate;

    // Handle date fields with conversion
    if (field === 'startDate' || field === 'endDate') {
        const iso = looksLikeDMY(value) ? toISOFromDMY(value)
            : looksLikeISO(value) ? value
            : "";
        updatedTask[field] = iso;
        if (iso) {
            if (field === 'startDate') updatedTask.startDateWasEverSet = true;
            if (field === 'endDate') updatedTask.endDateWasEverSet = true;
        }
    } else if (field === 'projectId') {
        updatedTask.projectId = value ? parseInt(value, 10) : null;
    } else {
        updatedTask[field] = value;
    }

    // Auto-set dates when status changes (if setting is enabled)
    if (field === 'status' && (settings.autoSetStartDateOnStatusChange || settings.autoSetEndDateOnStatusChange)) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Auto-set startDate when moving to "In Progress" (if empty)
        if (settings.autoSetStartDateOnStatusChange && value === 'progress' && !updatedTask.startDate) {
            updatedTask.startDate = today;
            updatedTask.startDateWasEverSet = true;
        }

        // Auto-set endDate when moving to "Done" (if empty)
        if (settings.autoSetEndDateOnStatusChange && value === 'done' && !updatedTask.endDate) {
            updatedTask.endDate = today;
            updatedTask.endDateWasEverSet = true;
        }
    }

    // Set completedDate when task is marked as done
    if (field === 'status' && value === 'done' && !updatedTask.completedDate) {
        updatedTask.completedDate = new Date().toISOString();
    }

    let changed;
    if (field === 'projectId') {
        changed = updatedTask.projectId !== oldTask.projectId;
    } else {
        changed = updatedTask[field] !== oldTask[field];
    }

    // Status changes can also auto-set date fields / completedDate
    if (field === 'status') {
        if (updatedTask.startDate !== prevStartDate) changed = true;
        if (updatedTask.endDate !== prevEndDate) changed = true;
        if (updatedTask.completedDate !== prevCompletedDate) changed = true;
    }

    if (!changed) {
        return {
            task: oldTask,
            tasks,
            oldProjectId
        };
    }

    updatedTask.updatedAt = new Date().toISOString();

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    return {
        task: updatedTask,
        tasks: updatedTasks,
        oldProjectId
    };
}

/**
 * Delete a task
 * @param {number} taskId - ID of task to delete
 * @param {Array} tasks - Current tasks array
 * @returns {{task: Object|null, tasks: Array, projectId: number|null}} Deleted task info and updated array
 */
export function deleteTask(taskId, tasks) {
    const task = tasks.find(t => t.id === parseInt(taskId, 10));

    if (!task) {
        return { task: null, tasks, projectId: null };
    }

    const projectId = task.projectId;
    const updatedTasks = tasks.filter(t => t.id !== parseInt(taskId, 10));

    return {
        task,
        tasks: updatedTasks,
        projectId
    };
}

/**
 * Duplicate a task
 * @param {number} taskId - ID of task to duplicate
 * @param {Array} tasks - Current tasks array
 * @param {number} taskCounter - Current task counter
 * @returns {{task: Object|null, tasks: Array, taskCounter: number}} Duplicated task and updated arrays
 */
export function duplicateTask(taskId, tasks, taskCounter) {
    const original = tasks.find(t => t.id === parseInt(taskId, 10));

    if (!original) {
        return { task: null, tasks, taskCounter };
    }

    // Build a new title with "Copy " prefix if not already
    const baseTitle = original.title || "Untitled";
    const newTitle = baseTitle.startsWith("Copy ") ? baseTitle : `Copy ${baseTitle}`;

    const now = new Date().toISOString();
    const cloned = {
        id: taskCounter,
        title: newTitle,
        description: original.description || "",
        projectId: original.projectId ?? null,
        startDate: original.startDate || "",
        endDate: original.endDate || "",
        startDateWasEverSet: !!original.startDateWasEverSet || (!!original.startDate && String(original.startDate).trim() !== ""),
        endDateWasEverSet: !!original.endDateWasEverSet || (!!original.endDate && String(original.endDate).trim() !== ""),
        priority: original.priority || "medium",
        status: original.status || "todo",
        tags: Array.isArray(original.tags) ? [...original.tags] : [],
        attachments: Array.isArray(original.attachments)
            ? original.attachments.map(a => ({...a}))
            : [],
        createdAt: now,
        updatedAt: now,
    };

    const updatedTasks = [...tasks, cloned];
    const updatedCounter = taskCounter + 1;

    return {
        task: cloned,
        tasks: updatedTasks,
        taskCounter: updatedCounter
    };
}

/**
 * Validate task data
 * @param {Object} taskData - Task data to validate
 * @returns {{valid: boolean, errors: Array<string>}} Validation result
 */
export function validateTask(taskData) {
    const errors = [];

    if (!taskData.title || taskData.title.trim() === "") {
        errors.push("Title is required");
    }

    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
        errors.push("Invalid priority value");
    }

    if (taskData.status && !['todo', 'progress', 'review', 'done'].includes(taskData.status)) {
        errors.push("Invalid status value");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
