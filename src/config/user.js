/**
 * Shared user profile configuration
 * Used for UI header and notification routing defaults
 */

export const USER_PROFILE = {
    name: "Moony Lambre",
    email: "malambre@ull.edu.es",
    organization: "Universidad de La Laguna"
};

/**
 * Helper to derive avatar initials from the name
 * @returns {string}
 */
export function getUserInitials() {
    if (!USER_PROFILE.name) return "NL";
    const parts = USER_PROFILE.name.split(" ").filter(Boolean);
    if (parts.length === 0) return "NL";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
