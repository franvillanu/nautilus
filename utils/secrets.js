export function requireEnvString(env, key) {
    const value = env && env[key];
    if (!value || typeof value !== "string" || !value.trim()) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value.trim();
}

export function requireJwtSecret(env) {
    return requireEnvString(env, "JWT_SECRET");
}

export function getJwtSecretsForVerify(env) {
    const current = requireJwtSecret(env);
    const previous = env && typeof env.JWT_SECRET_PREVIOUS === "string" ? env.JWT_SECRET_PREVIOUS.trim() : "";
    return previous ? [current, previous] : current;
}

export function requireAdminPin(env) {
    const pin = requireEnvString(env, "ADMIN_PIN");
    if (!/^\d{4,12}$/.test(pin)) {
        throw new Error("ADMIN_PIN must be 4-12 digits");
    }
    return pin;
}
