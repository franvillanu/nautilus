# Implementation Plan: Task Dependencies and Relationships

## Overview

This implementation plan breaks down the task dependencies feature into incremental coding steps. Each task builds on previous work, with property-based tests integrated throughout to validate correctness early. The implementation follows Nautilus's existing patterns: pure functional services, module-scope state management in app.js, and persistence via storage-client.js.

## Tasks

- [x] 1. Create dependency service with core data structures
  - Create `src/services/dependencyService.js`
  - Implement basic dependency graph structure (adjacency list)
  - Implement `serializeDependencies` and `deserializeDependencies` functions
  - Add helper function `buildReverseIndex` for computing dependents
  - _Requirements: 10.1, 10.2_

- [x] 1.1 Write property test for serialization round-trip
  - **Property 16: Serialization round-trip preserves graph**
  - **Validates: Requirements 10.2, 10.4**

- [x] 2. Implement dependency addition with validation
  - [x] 2.1 Implement `addDependency` function with task existence validation
    - Validate both task IDs exist in tasks array
    - Return error object for invalid task IDs
    - Create or update dependency relationship in graph
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.2 Write property test for adding dependencies
    - **Property 1: Adding dependency creates the relationship**
    - **Validates: Requirements 1.1**
  
  - [x] 2.3 Write property test for invalid task rejection
    - **Property 2: Invalid task IDs are rejected**
    - **Validates: Requirements 1.2**
  
  - [x] 2.4 Implement `validateNoCycle` function for circular dependency detection
    - Use depth-first search to detect cycles
    - Return cycle path when detected
    - Prevent self-dependencies
    - Prevent duplicate dependencies
    - _Requirements: 1.3, 4.1, 4.2, 4.4, 4.5_
  
  - [x] 2.5 Write property test for circular dependency prevention
    - **Property 3: Circular dependencies are prevented**
    - **Validates: Requirements 1.3, 4.1, 4.2**
  
  - [x] 2.6 Write property test for duplicate dependency idempotence
    - **Property 6: Adding duplicate dependencies is idempotent**
    - **Validates: Requirements 4.5**

- [x] 3. Implement dependency removal and cleanup
  - [x] 3.1 Implement `removeDependency` function
    - Remove single dependency relationship
    - Return updated dependencies object
    - _Requirements: 2.1_
  
  - [x] 3.2 Write property test for dependency removal
    - **Property 7: Removing dependency deletes the relationship**
    - **Validates: Requirements 2.1**
  
  - [x] 3.3 Write property test for removal preserving other dependencies
    - **Property 8: Removing one dependency preserves others**
    - **Validates: Requirements 2.3**
  
  - [x] 3.4 Implement `removeDependenciesForTask` function
    - Remove all dependencies where task is prerequisite
    - Remove all dependencies where task is dependent
    - _Requirements: 2.4, 8.1_
  
  - [x] 3.5 Write property test for task deletion cleanup
    - **Property 9: Task deletion removes all related dependencies**
    - **Validates: Requirements 2.4, 8.1, 8.3**

- [ ] 4. Implement dependency queries
  - [x] 4.1 Implement `getPrerequisites` function
    - Return array of prerequisite task IDs for a given task
    - Handle tasks with no prerequisites (return empty array)
    - _Requirements: 3.1, 3.3_
  
  - [x] 4.2 Implement `getDependents` function
    - Build reverse index using `buildReverseIndex`
    - Return array of dependent task IDs
    - Handle tasks with no dependents (return empty array)
    - _Requirements: 3.2, 3.3_
  
  - [x] 4.3 Write property test for prerequisite queries
    - **Property 10: Query returns correct prerequisites**
    - **Validates: Requirements 3.1**
  
  - [x] 4.4 Write property test for dependent queries
    - **Property 11: Query returns correct dependents**
    - **Validates: Requirements 3.2**
  
  - [x] 4.5 Write property test for multiple prerequisites
    - **Property 4: Multiple prerequisites allowed**
    - **Validates: Requirements 1.6**
  
  - [~] 4.6 Write property test for one-to-many prerequisite relationships
    - **Property 5: One task can be prerequisite for many**
    - **Validates: Requirements 1.7**

- [ ] 5. Implement blocked status computation
  - [~] 5.1 Implement `isTaskBlocked` function
    - Get prerequisites for task
    - Check if any prerequisite has status !== 'done'
    - Return blocked status and array of blocking tasks
    - _Requirements: 6.1, 6.2, 6.4_
  
  - [~] 5.2 Write property test for blocked status computation
    - **Property 12: Blocked status computed correctly**
    - **Validates: Requirements 6.1, 6.2**
  
  - [~] 5.3 Write property test for prerequisite deletion unblocking
    - **Property 13: Deleting prerequisite unblocks dependents**
    - **Validates: Requirements 8.2**

- [~] 6. Checkpoint - Ensure dependency service tests pass
  - Run all property tests for dependencyService.js
  - Verify all core functions work correctly
  - Ask the user if questions arise

- [ ] 7. Integrate dependency service with app.js state management
  - [~] 7.1 Add dependencies state to app.js
    - Add `let dependencies = {}` to module scope
    - Add `dependencies: () => dependencies` to appState bindings
    - Initialize dependencies from storage on app load
    - _Requirements: 7.1, 7.2_
  
  - [~] 7.2 Create event handlers for adding dependencies
    - Add handler function for adding dependency from UI
    - Call `addDependency` from dependencyService
    - Update dependencies state
    - Persist to storage using `saveData("dependencies", dependencies)`
    - Show error message if validation fails
    - _Requirements: 1.1, 1.5_
  
  - [~] 7.3 Create event handlers for removing dependencies
    - Add handler function for removing dependency from UI
    - Call `removeDependency` from dependencyService
    - Update dependencies state
    - Persist to storage
    - _Requirements: 2.1, 2.2_
  
  - [~] 7.4 Integrate dependency cleanup with task deletion
    - Modify task deletion handler to call `removeDependenciesForTask`
    - Update dependencies state
    - Persist to storage
    - _Requirements: 2.4, 8.1, 8.2, 8.3_
  
  - [~] 7.5 Integrate dependency cleanup with bulk operations
    - Modify bulk delete handler to remove dependencies for all deleted tasks
    - Preserve dependencies when moving tasks between projects
    - _Requirements: 9.1, 9.2_
  
  - [~] 7.6 Write property test for bulk deletion
    - **Property 14: Bulk deletion removes all related dependencies**
    - **Validates: Requirements 9.1**
  
  - [~] 7.7 Write property test for project independence
    - **Property 15: Dependencies independent of project membership**
    - **Validates: Requirements 9.2**

- [ ] 8. Create UI components for dependency management
  - [~] 8.1 Create dependency section in task detail view
    - Add HTML structure for prerequisites list
    - Add HTML structure for dependents list
    - Add "Add Dependency" button/interface
    - Add remove buttons for each dependency
    - _Requirements: 5.1, 5.2, 5.6, 5.7_
  
  - [~] 8.2 Implement dependency display rendering
    - Create function to render prerequisite tasks with titles and status
    - Create function to render dependent tasks with titles and status
    - Show "No dependencies" message when appropriate
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [~] 8.3 Implement blocked status indicator
    - Add visual indicator (icon/badge) for blocked tasks
    - Display which incomplete prerequisites are causing the block
    - Update indicator when prerequisites are completed
    - _Requirements: 6.3, 6.4, 6.5_

- [ ] 9. Add dark mode and light mode support
  - [~] 9.1 Create CSS variables for dependency theming
    - Add CSS variables to style.css for light mode
    - Add CSS variables for dark mode under `[data-theme="dark"]`
    - Include colors for: indicators, blocked status, prerequisite/dependent backgrounds, links
    - _Requirements: 11.1, 11.2, 11.4_
  
  - [~] 9.2 Apply theme-aware styling to dependency UI components
    - Style dependency indicators using CSS variables
    - Style blocked status indicators using CSS variables
    - Style prerequisite and dependent lists using CSS variables
    - Ensure sufficient contrast in both themes (WCAG AA)
    - _Requirements: 11.5, 11.6_
  
  - [~] 9.3 Write unit test for theme application
    - Test that CSS variables are defined for both themes
    - Test that theme changes update dependency UI elements
    - _Requirements: 11.3_

- [ ] 10. Add dependency management UI interactions
  - [~] 10.1 Implement "Add Dependency" modal or dropdown
    - Show list of available tasks to add as prerequisites
    - Filter out tasks that would create circular dependencies
    - Call add dependency handler on selection
    - Show error messages for validation failures
    - _Requirements: 1.1, 1.3_
  
  - [~] 10.2 Implement dependency removal interaction
    - Add remove button/icon for each dependency
    - Call remove dependency handler on click
    - Update UI immediately after removal
    - _Requirements: 2.1_
  
  - [~] 10.3 Add dependency indicators to task cards/list view
    - Show small indicator on tasks that have dependencies
    - Show blocked indicator on tasks with incomplete prerequisites
    - Make indicators clickable to view task details
    - _Requirements: 6.3_

- [ ] 11. Final checkpoint - Integration testing
  - [~] 11.1 Test complete add dependency flow
    - Add dependencies through UI
    - Verify persistence across page reload
    - Verify blocked status updates correctly
    - _Requirements: 1.1, 1.5, 6.1, 7.1_
  
  - [~] 11.2 Test complete remove dependency flow
    - Remove dependencies through UI
    - Verify persistence across page reload
    - Verify blocked status updates correctly
    - _Requirements: 2.1, 2.2, 6.2_
  
  - [~] 11.3 Test task deletion with dependencies
    - Delete tasks that have dependencies
    - Verify dependencies are cleaned up
    - Verify dependent tasks are unblocked
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [~] 11.4 Test circular dependency prevention
    - Attempt to create circular dependencies through UI
    - Verify error messages are shown
    - Verify graph remains valid
    - _Requirements: 1.3, 4.1, 4.2, 4.3_
  
  - [~] 11.5 Test theme switching
    - Switch between dark and light modes
    - Verify all dependency UI elements update correctly
    - Verify contrast and readability in both themes
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [~] 11.6 Run all property-based tests
    - Execute all 17 property tests with 100+ iterations each
    - Verify all properties pass
    - Fix any failures discovered

- [~] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests are integrated throughout to catch errors early
- The implementation follows Nautilus's existing architectural patterns
- All dependency data persists to local storage immediately on changes
- Theme support uses CSS variables for automatic theme switching
