/**
 * Dashboard View Module
 * 
 * Pure computation functions for dashboard statistics and insights.
 * These functions take data as parameters and return computed results,
 * making them testable and reusable.
 * 
 * @module views/dashboard
 */

/**
 * Calculate dashboard statistics from tasks and projects
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Object} Dashboard statistics
 */
export function calculateDashboardStats(tasks, projects) {
    const today = new Date().toISOString().split('T')[0];
    
    // Exclude backlog from statistics
    const activeTasks = tasks.filter(t => t.status !== 'backlog');
    const totalTasks = activeTasks.length;
    const completedTasks = activeTasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const inProgressTasks = activeTasks.filter(t => t.status === 'progress').length;
    const pendingTasks = activeTasks.filter(t => t.status === 'todo').length;
    const reviewTasks = activeTasks.filter(t => t.status === 'review').length;
    const overdueTasks = activeTasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
    const highPriorityTasks = activeTasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
    const milestones = projects.filter(p => p.endDate).length;
    
    return {
        activeProjects: projects.length,
        totalTasks,
        completedTasks,
        completionRate,
        inProgressTasks,
        pendingTasks,
        reviewTasks,
        overdueTasks,
        highPriorityTasks,
        milestones
    };
}

/**
 * Calculate trend indicators for dashboard
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Object} Trend indicator data
 */
export function calculateTrendIndicators(tasks, projects) {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date();

    // Exclude backlog from all trend calculations (match calculateDashboardStats)
    const activeTasks = tasks.filter(t => t.status !== 'backlog');

    // Tasks completed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekCompleted = activeTasks.filter(t => {
        if (t.status !== 'done' || !t.completedDate) return false;
        return new Date(t.completedDate) > weekAgo;
    }).length;

    // Tasks due today
    const dueTodayCount = activeTasks.filter(t => {
        if (!t.endDate || t.status === 'done') return false;
        return new Date(t.endDate).toDateString() === todayDate.toDateString();
    }).length;

    // Overdue count
    const overdueCount = activeTasks.filter(t =>
        t.status !== 'done' &&
        t.endDate &&
        t.endDate < today
    ).length;

    // Critical high-priority tasks (due within 7 days)
    const criticalHighPriority = activeTasks.filter(t => {
        if (t.status === 'done') return false;
        if (t.priority !== 'high') return false;
        if (!t.endDate) return false;
        const todayMidnight = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
        const end = new Date(t.endDate);
        const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        const diffDays = Math.round((endMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    }).length;

    // Completed projects
    const completedProjects = projects.filter(p => {
        const projectTasks = tasks.filter(t => t.projectId === p.id);
        const completedProjectTasks = projectTasks.filter(t => t.status === 'done');
        return projectTasks.length > 0 && completedProjectTasks.length === projectTasks.length;
    }).length;

    return {
        thisWeekCompleted,
        dueTodayCount,
        overdueCount,
        criticalHighPriority,
        completedProjects,
        progressChange: Math.max(1, Math.floor(activeTasks.length * 0.1))
    };
}

/**
 * Calculate project progress data for progress bars
 * @param {Array} projects - Array of project objects
 * @param {Array} tasks - Array of task objects
 * @param {number} [limit=5] - Maximum number of projects to return
 * @returns {Array} Array of project progress objects
 */
export function calculateProjectProgress(projects, tasks, limit = 5) {
    return projects.slice(0, limit).map(project => {
        const projectId = Number(project?.id);
        // Exclude backlog from project progress
        const projectTasks = tasks.filter(t => Number(t?.projectId) === projectId && t.status !== 'backlog');
        const completed = projectTasks.filter(t => t.status === 'done').length;
        const inProgress = projectTasks.filter(t => t.status === 'progress').length;
        const review = projectTasks.filter(t => t.status === 'review').length;
        const todo = projectTasks.filter(t => t.status === 'todo').length;
        const total = projectTasks.length;
        
        return {
            id: project.id,
            name: project.name,
            completed,
            inProgress,
            review,
            todo,
            total,
            completedPercent: total > 0 ? (completed / total) * 100 : 0,
            inProgressPercent: total > 0 ? (inProgress / total) * 100 : 0,
            reviewPercent: total > 0 ? (review / total) * 100 : 0,
            todoPercent: total > 0 ? (todo / total) * 100 : 0
        };
    });
}

/**
 * Generate activity feed data
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @param {number} [completedLimit=3] - Max completed tasks to show
 * @param {number} [projectLimit=2] - Max projects to show
 * @param {number} [taskLimit=2] - Max new tasks to show
 * @returns {Array} Array of activity objects sorted by date
 */
export function generateActivityFeed(tasks, projects, completedLimit = 3, projectLimit = 2, taskLimit = 2) {
    const activities = [];
    
    // Recent completed tasks
    const recentCompleted = tasks
        .filter(t => t.status === 'done')
        .sort((a, b) => new Date(b.completedDate || b.createdAt || b.createdDate) - new Date(a.completedDate || a.createdAt || a.createdDate))
        .slice(0, completedLimit);
    
    recentCompleted.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        const activityDate = task.completedDate || task.createdAt || task.createdDate;
        activities.push({
            type: 'completed',
            taskTitle: task.title,
            projectName: project ? project.name : null,
            date: activityDate,
            icon: '\u{2705}'
        });
    });
    
    // Recent new projects
    const recentProjects = projects
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .slice(0, projectLimit);
    
    recentProjects.forEach(project => {
        activities.push({
            type: 'created',
            projectName: project.name,
            date: project.createdAt || project.createdDate,
            icon: '🚀'
        });
    });
    
    // Recent new tasks
    const recentTasks = tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => new Date(b.createdAt || b.createdDate) - new Date(a.createdAt || a.createdDate))
        .slice(0, taskLimit);
    
    recentTasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        activities.push({
            type: 'created',
            taskTitle: task.title,
            projectName: project ? project.name : null,
            date: task.createdAt || task.createdDate,
            icon: '📝'
        });
    });
    
    // Sort by most recent first
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return activities;
}

/**
 * Generate all activity data (for "View All" page)
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Array} Array of all activity objects sorted by date
 */
export function generateAllActivity(tasks, projects) {
    const activities = [];
    
    // All completed tasks
    tasks
        .filter(t => t.status === 'done')
        .forEach(task => {
            const project = projects.find(p => p.id === task.projectId);
            activities.push({
                type: 'completed',
                taskTitle: task.title,
                projectName: project ? project.name : null,
                date: task.completedDate || task.createdAt || task.createdDate,
                icon: '\u{2705}'
            });
        });
    
    // All projects
    projects.forEach(project => {
        activities.push({
            type: 'created',
            projectName: project.name,
            date: project.createdAt || project.createdDate,
            icon: '🚀'
        });
    });
    
    // All tasks
    tasks.forEach(task => {
        const project = projects.find(p => p.id === task.projectId);
        activities.push({
            type: 'created',
            taskTitle: task.title,
            projectName: project ? project.name : null,
            date: task.createdAt || task.createdDate,
            icon: '📝'
        });
    });
    
    // Sort by most recent
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return activities;
}

/**
 * Generate insights based on task and project data
 * @param {Array} tasks - Array of task objects
 * @param {Array} projects - Array of project objects
 * @returns {Array} Array of insight objects
 */
export function generateInsightsData(tasks, projects) {
    const insights = [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => t.endDate && t.endDate < today && t.status !== 'done').length;
    const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
    const todayTasks = tasks.filter(t => {
        if (!t.endDate) return false;
        const todayStr = new Date().toDateString();
        return new Date(t.endDate).toDateString() === todayStr && t.status !== 'done';
    }).length;
    
    // Completion rate insight
    if (totalTasks > 0) {
        const completionRate = (completedTasks / totalTasks) * 100;
        if (completionRate >= 80) {
            insights.push({
                type: 'success',
                icon: '🎯',
                insightKey: 'excellent',
                percent: completionRate.toFixed(0)
            });
        } else if (completionRate >= 60) {
            insights.push({
                type: 'success',
                icon: '📈',
                insightKey: 'good',
                percent: completionRate.toFixed(0)
            });
        } else if (completionRate >= 30) {
            insights.push({
                type: 'warning',
                icon: '⚡',
                insightKey: 'opportunity',
                percent: completionRate.toFixed(0)
            });
        } else {
            insights.push({
                type: 'priority',
                icon: '🚨',
                insightKey: 'action',
                percent: completionRate.toFixed(0)
            });
        }
    }
    
    // Due today tasks
    if (todayTasks > 0) {
        insights.push({
            type: 'priority',
            icon: '📅',
            insightKey: 'today',
            count: todayTasks
        });
    }
    
    // Overdue tasks
    if (overdueTasks > 0 && todayTasks === 0) {
        insights.push({
            type: 'warning',
            icon: '⏰',
            insightKey: 'overdue',
            count: overdueTasks
        });
    }
    
    // High priority tasks
    if (highPriorityTasks > 0) {
        const urgentCount = tasks.filter(t => t.priority === 'high' && t.status !== 'done').length;
        if (urgentCount > 0) {
            insights.push({
                type: 'priority',
                icon: '🔥',
                insightKey: 'highPriority',
                count: urgentCount
            });
        }
    }
    
    // Project insights
    if (projects.length > 1) {
        const projectsWithTasks = projects.filter(p => tasks.some(t => t.projectId === p.id)).length;
        const projectsWithoutTasks = projects.length - projectsWithTasks;
        
        if (projectsWithoutTasks > 0) {
            insights.push({
                type: 'warning',
                icon: '📁',
                insightKey: 'emptyProjects',
                count: projectsWithoutTasks
            });
        }
    }
    
    // Productivity pattern insights
    if (totalTasks >= 5) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentlyCompleted = tasks.filter(t => {
            if (t.status !== 'done' || !t.completedDate) return false;
            return new Date(t.completedDate) > weekAgo;
        }).length;
        
        if (recentlyCompleted >= 3) {
            insights.push({
                type: 'success',
                icon: '🚀',
                insightKey: 'momentum',
                count: recentlyCompleted
            });
        }
    }
    
    // Default insights for empty state
    if (insights.length === 0) {
        if (totalTasks === 0) {
            insights.push({
                type: 'priority',
                icon: '🌊',
                insightKey: 'ready'
            });
        } else {
            insights.push({
                type: 'success',
                icon: '✨',
                insightKey: 'balanced'
            });
        }
    }
    
    return insights;
}

/**
 * Format relative time for activity feed
 * @param {string|Date} dateInput - Date to format
 * @returns {Object} Object with relative time info
 */
export function getRelativeTimeInfo(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return { key: 'justNow', value: null };
    } else if (diffMins < 60) {
        return { key: 'minutesAgo', value: diffMins };
    } else if (diffHours < 24) {
        return { key: 'hoursAgo', value: diffHours };
    } else if (diffDays < 7) {
        return { key: 'daysAgo', value: diffDays };
    } else {
        return { key: 'date', value: date };
    }
}

/**
 * Generate HTML for project progress bars
 * @param {Array} progressData - Array of project progress data from calculateProjectProgress
 * @param {Object} helpers - Helper translations
 * @param {string} helpers.tasksLabel - Label for "tasks"
 * @returns {string} HTML string for progress bars
 */
export function generateProgressBarsHTML(progressData, helpers) {
    const { tasksLabel } = helpers;

    return progressData.map(p => `
        <div class="progress-bar-item clickable-project" data-action="showProjectDetails" data-param="${p.id}" style="cursor: pointer; transition: all 0.2s ease;">
            <div class="project-progress-header">
                <span class="project-name">${p.name}</span>
                <span class="task-count">${p.completed}/${p.total} ${tasksLabel}</span>
            </div>
            <div style="height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; display: flex;">
                <div style="background: var(--accent-green); width: ${p.completedPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--accent-blue); width: ${p.inProgressPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--accent-amber); width: ${p.reviewPercent}%; transition: width 0.5s ease;"></div>
                <div style="background: var(--text-muted); width: ${p.todoPercent}%; transition: width 0.5s ease;"></div>
            </div>
        </div>
    `).join('');
}

/**
 * Generate HTML for activity feed items
 * @param {Array} activities - Array of activity objects
 * @param {Function} formatDate - Function to format activity date
 * @returns {string} HTML string for activity feed
 */
export function generateActivityFeedHTML(activities, formatDate) {
    return activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">${activity.icon}</div>
            <div class="activity-content">
                <div class="activity-text">${activity.text}</div>
            </div>
            <div class="activity-date">${formatDate(activity.date)}</div>
        </div>
    `).join('');
}
