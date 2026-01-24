/**
 * Dropzone Utilities
 * Shared functions for file upload dropzones
 */

/**
 * Set text content in a dropzone element
 * @param {HTMLElement} dropzone - The dropzone element
 * @param {string} text - Text to display
 * @param {string} className - CSS class for the text element
 */
export function setDropzoneText(dropzone, text, className = 'dropzone-text') {
    dropzone.innerHTML = '';
    const textEl = document.createElement('span');
    textEl.className = className;
    textEl.textContent = text;
    dropzone.appendChild(textEl);
}

/**
 * Apply base styles to a dropzone element
 * @param {HTMLElement} el - The dropzone element
 * @param {Object} options - Style options
 */
export function applyDropzoneBaseStyles(el, options = {}) {
    const minHeight = options.minHeight || '48px';

    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.gap = '10px';
    el.style.padding = '12px 16px';
    el.style.textAlign = 'center';
    el.style.cursor = 'pointer';
    el.style.userSelect = 'none';
    el.style.minHeight = minHeight;
    el.style.border = '2px dashed var(--border)';
    el.style.borderRadius = '10px';
    el.style.background = 'var(--bg-tertiary)';
    el.style.boxShadow = 'none';
    el.style.color = 'var(--text-muted)';
    el.style.fontWeight = '500';
    el.style.transition = 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease';
}

/**
 * Set dragover state styles on a dropzone
 * @param {HTMLElement} el - The dropzone element
 * @param {boolean} isActive - Whether dragover is active
 */
export function setDropzoneDragoverStyles(el, isActive) {
    if (isActive) {
        el.style.borderColor = 'var(--accent-blue)';
        el.style.background = 'rgba(59, 130, 246, 0.08)';
        el.style.boxShadow = '0 0 0 1px var(--accent-blue)';
    } else {
        el.style.border = '2px dashed var(--border)';
        el.style.background = 'var(--bg-tertiary)';
        el.style.boxShadow = 'none';
    }
}

/**
 * Handle file drop or paste events
 * @param {FileList} files - Files from drop/paste event
 * @param {Object} options - Handler options
 * @param {Function} options.onFile - Callback for valid file
 * @param {Function} options.onError - Callback for errors
 * @param {string[]} options.acceptedTypes - Accepted MIME type prefixes
 * @param {number} options.maxSize - Max file size in bytes
 */
export function handleDropOrPasteFileList(files, options = {}) {
    const {
        onFile,
        onError,
        acceptedTypes = ['image/'],
        maxSize = 5 * 1024 * 1024 // 5MB default
    } = options;

    if (!files || files.length === 0) {
        return;
    }

    const file = files[0];

    // Check type
    const isValidType = acceptedTypes.some(type => file.type.startsWith(type));
    if (!isValidType) {
        if (onError) onError('invalid_type', file);
        return;
    }

    // Check size
    if (file.size > maxSize) {
        if (onError) onError('too_large', file);
        return;
    }

    if (onFile) onFile(file);
}
