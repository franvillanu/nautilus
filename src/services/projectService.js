/**
 * Project Service
 *
 * Handles all project CRUD operations.
 * Returns immutable updates (new arrays) rather than mutating state.
 */

import { looksLikeDMY, looksLikeISO, toISOFromDMY } from "../utils/date.js";

/**
 * Create a new project
 * @param {Object} projectData - Project data { name, description, startDate, endDate }
 * @param {Array} projects - Current projects array
 * @param {number} projectCounter - Current project counter
 * @returns {Object} { project, projects, projectCounter }
 */
export function createProject(projectData, projects, projectCounter) {
    const newProject = {
        id: projectCounter,
        name: projectData.name || "",
        description: projectData.description || "",
        startDate: projectData.startDate || "",
        endDate: projectData.endDate || "",
        tags: projectData.tags || [],
        createdAt: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProject];
    const updatedCounter = projectCounter + 1;

    return {
        project: newProject,
        projects: updatedProjects,
        projectCounter: updatedCounter
    };
}

/**
 * Update an existing project
 * @param {number} projectId - Project ID to update
 * @param {Object} projectData - Updated project data
 * @param {Array} projects - Current projects array
 * @returns {Object} { project, projects } - Updated project and array (or null if not found)
 */
export function updateProject(projectId, projectData, projects) {
    const projectIndex = projects.findIndex(p => p.id === parseInt(projectId, 10));
    if (projectIndex === -1) {
        return { project: null, projects };
    }

    const oldProject = projects[projectIndex];
    const updatedProject = {
        ...oldProject,
        name: projectData.name !== undefined ? projectData.name : oldProject.name,
        description: projectData.description !== undefined ? projectData.description : oldProject.description,
        startDate: projectData.startDate !== undefined ? projectData.startDate : oldProject.startDate,
        endDate: projectData.endDate !== undefined ? projectData.endDate : oldProject.endDate,
        tags: projectData.tags !== undefined ? projectData.tags : oldProject.tags,
    };

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = updatedProject;

    return {
        project: updatedProject,
        projects: updatedProjects
    };
}

/**
 * Update a single field of a project
 * @param {number} projectId - Project ID to update
 * @param {string} field - Field name to update
 * @param {any} value - New value for the field
 * @param {Array} projects - Current projects array
 * @returns {Object} { project, projects } - Updated project and array (or null if not found)
 */
export function updateProjectField(projectId, field, value, projects) {
    const projectIndex = projects.findIndex(p => p.id === parseInt(projectId, 10));
    if (projectIndex === -1) {
        return { project: null, projects };
    }

    const oldProject = projects[projectIndex];
    const updatedProject = { ...oldProject };

    // Handle date fields with conversion
    if (field === 'startDate' || field === 'endDate') {
        const iso = looksLikeDMY(value) ? toISOFromDMY(value)
            : looksLikeISO(value) ? value
            : "";
        updatedProject[field] = iso;
    } else {
        updatedProject[field] = value;
    }

    const updatedProjects = [...projects];
    updatedProjects[projectIndex] = updatedProject;

    return {
        project: updatedProject,
        projects: updatedProjects
    };
}

/**
 * Delete a project (optionally clearing task associations)
 * @param {number} projectId - Project ID to delete
 * @param {Array} projects - Current projects array
 * @param {Array} tasks - Current tasks array (optional)
 * @param {boolean} clearTaskAssociations - If true, set tasks' projectId to null
 * @returns {Object} { project, projects, tasks } - Deleted project and updated arrays
 */
export function deleteProject(projectId, projects, tasks = null, clearTaskAssociations = false) {
    const project = projects.find(p => p.id === parseInt(projectId, 10));
    if (!project) {
        return { project: null, projects, tasks };
    }

    const updatedProjects = projects.filter(p => p.id !== parseInt(projectId, 10));

    // Handle task associations if tasks array provided
    let updatedTasks = tasks;
    if (tasks && clearTaskAssociations) {
        updatedTasks = tasks.map(t => {
            if (t.projectId === parseInt(projectId, 10)) {
                return { ...t, projectId: null };
            }
            return t;
        });
    }

    return {
        project,
        projects: updatedProjects,
        tasks: updatedTasks
    };
}

/**
 * Get tasks associated with a project
 * @param {number} projectId - Project ID
 * @param {Array} tasks - Tasks array
 * @returns {Array} Tasks belonging to the project
 */
export function getProjectTasks(projectId, tasks) {
    return tasks.filter(t => t.projectId === parseInt(projectId, 10));
}

/**
 * Validate project data
 * @param {Object} projectData - Project data to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateProject(projectData) {
    const errors = [];

    if (!projectData.name || projectData.name.trim() === "") {
        errors.push("Project name is required");
    }

    // Validate date format if provided
    if (projectData.startDate && !looksLikeISO(projectData.startDate)) {
        errors.push("Invalid start date format (expected YYYY-MM-DD)");
    }

    if (projectData.endDate && !looksLikeISO(projectData.endDate)) {
        errors.push("Invalid end date format (expected YYYY-MM-DD)");
    }

    // Validate date logic if both provided
    if (projectData.startDate && projectData.endDate) {
        const start = new Date(projectData.startDate);
        const end = new Date(projectData.endDate);
        if (end < start) {
            errors.push("End date cannot be before start date");
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}
