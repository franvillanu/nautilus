/**
 * Core application state container.
 * Transitional module to centralize mutable globals while refactoring.
 */

export const appState = {
    projects: null,
    tasks: null,
    feedbackItems: null,
    feedbackIndex: null,
    projectCounter: null,
    taskCounter: null,
    feedbackCounter: null,
    projectsSortedView: null,
    selectedCards: null,
    lastSelectedCardId: null,
    projectToDelete: null,
    tempAttachments: null,
    projectNavigationReferrer: null,
    calendarNavigationState: null,
    previousPage: null,
    currentFeedbackScreenshotData: null,
    feedbackPendingPage: null,
    feedbackDonePage: null,
    settings: null
};

// For now appState is a shared container; accessors are defined in app.js
