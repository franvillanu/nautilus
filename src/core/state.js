/**
 * Core application state container.
 * Transitional module to centralize mutable globals while refactoring.
 */

export const appState = {
    projectsSortedView: null,
    selectedCards: new Set(),
    lastSelectedCardId: null
};
