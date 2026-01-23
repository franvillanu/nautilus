/**
 * Notification UI Module
 * 
 * Provides toast-style notifications for user feedback.
 * 
 * @module src/ui/notification
 */

/**
 * Display a notification toast message
 * 
 * @param {string} message - The message to display
 * @param {'info'|'error'|'success'} [type='info'] - The notification type
 */
export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 16px 24px;
        background: ${type === 'error' ? 'var(--accent-red)' : type === 'success' ? 'var(--accent-green)' : 'var(--accent-blue)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

/**
 * Display an error notification
 * 
 * @param {string} message - The error message to display
 */
export function showErrorNotification(message) {
    showNotification(message, 'error');
}

/**
 * Display a success notification
 * 
 * @param {string} message - The success message to display
 */
export function showSuccessNotification(message) {
    showNotification(message, 'success');
}
