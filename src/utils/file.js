/**
 * File utility functions
 * Functions for file conversion and API operations
 * No dependencies on app state
 */

/**
 * Convert a File object to base64 data URL
 * @param {File} file - File object to convert
 * @returns {Promise<string>} Base64 data URL
 *
 * @example
 * const base64 = await convertFileToBase64(fileInput.files[0]);
 * // Returns: 'data:image/png;base64,iVBORw0KGgo...'
 */
export function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Upload a file to the server
 * @param {string} fileKey - Unique key for the file
 * @param {string} base64Data - Base64 encoded file data
 * @throws {Error} If upload fails
 *
 * @example
 * await uploadFile('task_123_attachment_1', base64Data);
 */
export async function uploadFile(fileKey, base64Data) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: base64Data
    });

    if (!response.ok) {
        // Try to parse JSON error response for better error messages
        let errorMessage = `Failed to upload file: ${response.status} ${response.statusText}`;
        try {
            const errorData = await response.json();
            if (errorData.message) {
                errorMessage = errorData.message;
            }
            if (errorData.troubleshooting) {
                errorMessage += '\n\nTroubleshooting: ' + errorData.troubleshooting;
            }
        } catch (e) {
            // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
    }
}

/**
 * Download a file from the server
 * @param {string} fileKey - Unique key for the file
 * @returns {Promise<string>} File content as text
 * @throws {Error} If download fails
 *
 * @example
 * const content = await downloadFile('task_123_attachment_1');
 */
export async function downloadFile(fileKey) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`);

    if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    return await response.text();
}

/**
 * Delete a file from the server
 * @param {string} fileKey - Unique key for the file
 * @throws {Error} If deletion fails
 *
 * @example
 * await deleteFile('task_123_attachment_1');
 */
export async function deleteFile(fileKey) {
    const response = await fetch(`/api/files?key=${encodeURIComponent(fileKey)}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.status} ${response.statusText}`);
    }
}
