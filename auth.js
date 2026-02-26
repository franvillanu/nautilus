// auth.js - Authentication system
// console.log('[PERF] auth.js script started executing at', performance.now());

// Global auth state
let currentUser = null;
let authToken = null;
let isAdmin = false;
let currentProgress = 0;
const BOOT_REVEAL_START_PERCENT = 52;

const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

/**
 * Wraps a password input with a reveal/hide toggle button.
 * Works on both static DOM elements and dynamically created inputs.
 * @param {HTMLInputElement} input - The password input element
 */
window.addPasswordToggle = function(input) {
    if (!input || input.getAttribute('inputmode') === 'numeric') return; // Skip PIN inputs
    if (input.parentElement?.classList.contains('password-toggle-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-toggle-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-toggle-btn';
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', 'Toggle password visibility');
    btn.innerHTML = EYE_CLOSED;
    wrap.appendChild(btn);

    btn.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.innerHTML = isHidden ? EYE_OPEN : EYE_CLOSED;
        input.focus();
    });
};

/** Apply password toggle to all password inputs inside a container */
window.applyPasswordToggles = function(container) {
    (container || document).querySelectorAll('input[type="password"]').forEach(window.addPasswordToggle);
};

function tAuth(key, vars, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
        return window.i18n.t(key, vars);
    }
    return fallback || key;
}

function showBootSplash({ restart = false } = {}) {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;

    splash.style.display = 'flex';
    splash.style.opacity = '1';
    splash.style.pointerEvents = 'auto';
    splash.dataset.hiding = '';
    currentProgress = 0;

    const logo = splash.querySelector('.boot-logo');
    if (logo) {
        logo.style.setProperty('--progress', '0');
        logo.style.setProperty('--p', '0');
        logo.style.setProperty('--reveal-top', `${BOOT_REVEAL_START_PERCENT}%`);
        logo.dataset.progress = '0';
    }

    // Back-compat if the old progress bar exists
    const progressBar = document.getElementById('boot-progress-bar');
    if (progressBar) progressBar.style.width = '0%';
}

// Update progress bar based on REAL loading progress
function updateBootSplashProgress(percentage) {
    // console.log(`[SPLASH] Real loading progress: ${percentage}%`);

    // Only move forward
    const newProgress = Math.max(currentProgress, Math.min(100, percentage));
    if (newProgress === currentProgress) return;

    currentProgress = newProgress;

    const splash = document.getElementById('boot-splash');
    const logo = splash && splash.querySelector ? splash.querySelector('.boot-logo') : null;
    if (logo) {
        const p = currentProgress / 100;
        logo.style.setProperty('--progress', String(currentProgress));
        logo.style.setProperty('--p', p.toFixed(4));
        logo.style.setProperty('--reveal-top', `${(BOOT_REVEAL_START_PERCENT * (1 - p)).toFixed(4)}%`);
        logo.dataset.progress = String(currentProgress);
    }

    // Back-compat if the old progress bar exists
    const progressBar = document.getElementById('boot-progress-bar');
    if (progressBar) progressBar.style.width = `${currentProgress}%`;
}

function hideBootSplash() {
    const splash = document.getElementById('boot-splash');
    if (!splash) return;

    if (splash.dataset.hiding === '1') return;
    splash.dataset.hiding = '1';

    // console.log('[SPLASH] Hiding splash screen');

    // Ensure the final 100% state is painted before fading out
    if (currentProgress < 100) {
        updateBootSplashProgress(100);
    }

    requestAnimationFrame(() => {
        // Start fade-out
        splash.style.transition = 'opacity 0.3s ease-out';
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';

        let cleanedUp = false;
        const cleanup = () => {
            if (cleanedUp) return;
            cleanedUp = true;
            splash.style.display = 'none';
            splash.dataset.hiding = '';
            currentProgress = 0;
        };

        splash.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 350);
    });
}

// PIN pad handler class
class PinPad {
    constructor(inputId, dotsContainer, onComplete) {
        this.inputId = inputId;
        this.dotsContainer = dotsContainer;
        this.onComplete = onComplete;
        this.pin = '';
        this.maxLength = 4;
        this.enabled = false;
        this.keyboardHandler = this.handleKeyboard.bind(this);
    }

    addDigit(digit) {
        if (this.pin.length < this.maxLength) {
            this.pin += digit;
            this.updateDots();

            if (this.pin.length === this.maxLength && this.onComplete) {
                this.onComplete(this.pin);
            }
        }
    }

    clear() {
        if (this.pin.length > 0) {
            this.pin = this.pin.slice(0, -1);
            this.updateDots();
        }
    }

    reset() {
        this.pin = '';
        this.updateDots();
    }

    updateDots() {
        const dots = this.dotsContainer.querySelectorAll('.dot');
        dots.forEach((dot, index) => {
            if (index < this.pin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });

        // Update hidden input
        document.getElementById(this.inputId).value = this.pin;
    }

    getValue() {
        return this.pin;
    }

    handleKeyboard(e) {
        if (!this.enabled) return;

        // Don't capture keyboard if user is typing in an input/textarea
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            // Allow typing in text fields
            return;
        }

        // Handle number keys (0-9) from both main keyboard and numpad
        if ((e.key >= '0' && e.key <= '9') || (e.keyCode >= 96 && e.keyCode <= 105)) {
            e.preventDefault();
            const digit = e.key >= '0' && e.key <= '9' ? e.key : String(e.keyCode - 96);
            this.addDigit(digit);
        }
        // Handle backspace
        else if (e.key === 'Backspace' || e.keyCode === 8) {
            e.preventDefault();
            this.clear();
        }
    }

    enableKeyboard() {
        this.enabled = true;
        document.addEventListener('keydown', this.keyboardHandler);
    }

    disableKeyboard() {
        this.enabled = false;
        document.removeEventListener('keydown', this.keyboardHandler);
    }
}

// Initialize PIN pads
let loginPinPad;
let adminLoginPinPad;
let setupNewPinPad;
let setupConfirmPinPad;
let createUserPinPad;
let resetNewPinPad;
let resetConfirmPinPad;
let currentSetupPinPad; // Track which setup PIN pad is active
let currentResetPinPad; // Track which reset PIN pad is active

// Track login auth method
let currentLoginAuthMethod = 'pin';

// Client-side password validation
function isValidPasswordClient(password) {
    return password && password.length >= 8 &&
        /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);
}

function getPasswordStrengthClient(password) {
    if (!password) return '';
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 3) return 'weak';
    if (score <= 4) return 'fair';
    return 'strong';
}

function updatePasswordStrength(inputId, strengthId) {
    const input = document.getElementById(inputId);
    const strengthEl = document.getElementById(strengthId);
    if (!input || !strengthEl) return;

    input.addEventListener('input', () => {
        const strength = getPasswordStrengthClient(input.value);
        strengthEl.className = 'password-strength';
        if (strength) strengthEl.classList.add(strength);
    });
}

// Toggle login UI between PIN pad and password input
function toggleLoginCredentialUI(method) {
    const pinSection = document.getElementById('login-pin-section');
    const passwordSection = document.getElementById('login-password-section');

    if (method === 'password') {
        if (pinSection) pinSection.style.display = 'none';
        if (passwordSection) passwordSection.style.display = 'block';
        const pwInput = document.getElementById('login-password');
        if (pwInput) pwInput.focus();
        if (loginPinPad) loginPinPad.disableKeyboard();
    } else {
        if (pinSection) pinSection.style.display = 'block';
        if (passwordSection) passwordSection.style.display = 'none';
        if (loginPinPad) loginPinPad.enableKeyboard();
    }
}

// Show/hide auth pages
function showAuthPage(pageId) {
    // Disable all PIN pad keyboards first
    if (loginPinPad) loginPinPad.disableKeyboard();
    if (adminLoginPinPad) adminLoginPinPad.disableKeyboard();
    if (setupNewPinPad) setupNewPinPad.disableKeyboard();
    if (setupConfirmPinPad) setupConfirmPinPad.disableKeyboard();
    if (createUserPinPad) createUserPinPad.disableKeyboard();
    if (resetNewPinPad) resetNewPinPad.disableKeyboard();
    if (resetConfirmPinPad) resetConfirmPinPad.disableKeyboard();

    // When showing a specific auth page (e.g. login), hide the app so we never show
    // previous user's data underneath the overlay (e.g. "Switch user" → #login).
    if (pageId) {
        const appRoot = document.querySelector('.app');
        if (appRoot) appRoot.style.display = 'none';
    }

    // Hide all auth pages
    document.querySelectorAll('.auth-overlay').forEach(page => {
        page.style.display = 'none';
    });

    // Reset forgot-password form when navigating to it (or away from it)
    const forgotForm = document.getElementById('forgot-password-form');
    if (forgotForm) {
        forgotForm.reset();
        forgotForm.style.display = '';
        const forgotSubtitle = document.querySelector('#forgot-password-page .muted');
        if (forgotSubtitle) forgotSubtitle.style.display = '';
        const forgotStatus = document.getElementById('forgot-status');
        if (forgotStatus) { forgotStatus.innerHTML = ''; forgotStatus.className = 'status'; }
        const forgotBtn = document.getElementById('forgot-submit-btn');
        if (forgotBtn) { forgotBtn.disabled = false; forgotBtn.style.display = ''; forgotBtn.textContent = tAuth('auth.forgot.submit', {}, 'Send Reset Link'); }
    }

    // Show requested page and enable its keyboard
    const page = document.getElementById(pageId);
    if (page) {
        // Once an auth overlay is visible, the boot splash should get out of the way.
        hideBootSplash();
        page.style.display = 'flex';

        // Enable keyboard for the active PIN pad
        if (pageId === 'login-page' && loginPinPad && currentLoginAuthMethod === 'pin') {
            loginPinPad.enableKeyboard();
        } else if (pageId === 'admin-login-page' && adminLoginPinPad) {
            adminLoginPinPad.enableKeyboard();
        } else if (pageId === 'setup-page' && setupNewPinPad) {
            setupNewPinPad.enableKeyboard();
        } else if (pageId === 'admin-page' && createUserPinPad) {
            createUserPinPad.enableKeyboard();
        }
    }
}

// Initialize login page
function initLoginPage() {
    const form = document.getElementById('login-form');
    const pinSection = document.getElementById('login-pin-section');
    const dotsContainer = pinSection ? pinSection.querySelector('.pin-dots') : form.querySelector('.pin-dots');
    const statusEl = document.getElementById('login-status');

    // Pre-fill username from last login and auto-detect auth method
    const identifierInput = document.getElementById('login-identifier');
    const lastUsername = localStorage.getItem('lastUsername');
    if (lastUsername) {
        identifierInput.value = lastUsername;
        // Auto-detect auth method for pre-filled username
        (async () => {
            try {
                const resp = await fetch(`/api/auth/auth-method?identifier=${encodeURIComponent(lastUsername)}`);
                const data = await resp.json();
                currentLoginAuthMethod = data.authMethod || 'pin';
                toggleLoginCredentialUI(currentLoginAuthMethod);
            } catch (e) {
                // Silently fall back to PIN
            }
        })();
    }

    // Secret door: clicking logo goes to admin login
    const loginLogo = document.getElementById('login-logo');
    if (loginLogo) {
        loginLogo.addEventListener('click', () => {
            window.location.hash = 'admin-login';
            showAuthPage('admin-login-page');
        });
    }

    // Auto-submit when 4 digits entered
    loginPinPad = new PinPad('login-pin', dotsContainer, () => {
        form.dispatchEvent(new Event('submit'));
    });

    // PIN pad buttons
    pinSection.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value;

            if (value === 'clear') {
                loginPinPad.clear();
            } else if (value >= '0' && value <= '9') {
                loginPinPad.addDigit(value);
            }
        });
    });

    // Detect auth method as user types (debounced)
    let lastCheckedIdentifier = '';
    let authMethodDebounceTimer = null;

    async function checkAuthMethod() {
        const identifier = identifierInput.value.trim();
        if (!identifier || identifier === lastCheckedIdentifier) return;
        lastCheckedIdentifier = identifier;

        try {
            const resp = await fetch(`/api/auth/auth-method?identifier=${encodeURIComponent(identifier)}`);
            const data = await resp.json();
            currentLoginAuthMethod = data.authMethod || 'pin';
            toggleLoginCredentialUI(currentLoginAuthMethod);
        } catch (e) {
            currentLoginAuthMethod = 'pin';
            toggleLoginCredentialUI('pin');
        }
    }

    identifierInput.addEventListener('input', () => {
        clearTimeout(authMethodDebounceTimer);
        authMethodDebounceTimer = setTimeout(checkAuthMethod, 400);
    });

    // Also check on blur for paste/autofill scenarios
    identifierInput.addEventListener('blur', () => {
        clearTimeout(authMethodDebounceTimer);
        checkAuthMethod();
    });

    // Also check on Enter key in identifier field
    identifierInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            clearTimeout(authMethodDebounceTimer);
            checkAuthMethod();
        }
    });

    // Forgot password link
    const forgotLink = document.getElementById('forgot-password-link');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('forgot-password-page');
            window.location.hash = 'forgot-password';
        });
    }

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const identifier = document.getElementById('login-identifier').value.trim();

        if (!identifier) {
            statusEl.textContent = 'Please enter username or email';
            statusEl.classList.add('error');
            return;
        }

        let body;
        if (currentLoginAuthMethod === 'password') {
            const password = document.getElementById('login-password').value;
            if (!password) {
                statusEl.textContent = 'Please enter your password';
                statusEl.classList.add('error');
                return;
            }
            body = { identifier, password };
        } else {
            const pin = loginPinPad.getValue();
            if (pin.length !== 4) {
                statusEl.textContent = 'Please enter your 4-digit PIN';
                statusEl.classList.add('error');
                return;
            }
            body = { identifier, pin };
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Login failed';
                statusEl.classList.add('error');
                if (loginPinPad) loginPinPad.reset();
                const pwInput = document.getElementById('login-password');
                if (pwInput) pwInput.value = '';
                return;
            }

            // Login successful
            authToken = data.token;
            currentUser = data.user;

            // Prompt browser to save password credentials
            if (currentLoginAuthMethod === 'password' && window.PasswordCredential) {
                try {
                    const cred = new PasswordCredential({
                        id: identifier,
                        password: document.getElementById('login-password').value,
                        name: data.user.displayName || identifier
                    });
                    navigator.credentials.store(cred);
                } catch (e) {
                    // Credential storage not supported or failed - not critical
                }
            }

            // Clear previous user's localStorage data to prevent data leakage
            localStorage.removeItem('userName');
            localStorage.removeItem('settings');
            // Also clear the shared (non-token-scoped) feedback cache so the
            // new user never sees the previous user's feedback items.
            localStorage.removeItem('feedbackItemsCache:v1');

            // Always save auth token with 24-hour expiration
            localStorage.setItem('authToken', authToken);
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 24);
            localStorage.setItem('authTokenExpiration', expirationDate.toISOString());

            // Save username/email for pre-filling next time
            localStorage.setItem('lastUsername', identifier);

            // Check if needs setup
            if (data.user.needsSetup) {
                showSetupPage(data.user);
            } else {
                // Go to app (from login form, don't show splash again)
                completeLogin({ fromLoginForm: true });
            }
        } catch (error) {
            console.error('Login error:', error);
            statusEl.textContent = 'Login failed. Please try again.';
            statusEl.classList.add('error');
            if (loginPinPad) loginPinPad.reset();
        }
    });
}

// Initialize admin login page
function initAdminLoginPage() {
    const form = document.getElementById('admin-login-form');
    const dotsContainer = form.querySelector('.pin-dots');
    const statusEl = document.getElementById('admin-login-status');

    // Add click handler for "Back to User Login" link
    const backLink = document.querySelector('#admin-login-page .auth-link[href="#login"]');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('login-page');
            window.location.hash = 'login';
        });
    }

    // Auto-submit when 4 digits entered
    adminLoginPinPad = new PinPad('admin-login-pin', dotsContainer, () => {
        form.dispatchEvent(new Event('submit'));
    });

    // PIN pad buttons
    form.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value;

            if (value === 'clear') {
                adminLoginPinPad.clear();
            } else if (value >= '0' && value <= '9') {
                adminLoginPinPad.addDigit(value);
            }
        });
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const pin = adminLoginPinPad.getValue();

        if (pin.length !== 4) {
            statusEl.textContent = 'Please enter the 4-digit master PIN';
            statusEl.classList.add('error');
            return;
        }

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Invalid PIN';
                statusEl.classList.add('error');
                adminLoginPinPad.reset();
                return;
            }

            // Admin login successful
            authToken = data.token;
            isAdmin = true;
            localStorage.setItem('adminToken', authToken);

            showAdminDashboard();
        } catch (error) {
            console.error('Admin login error:', error);
            statusEl.textContent = 'Login failed. Please try again.';
            statusEl.classList.add('error');
            adminLoginPinPad.reset();
        }
    });
}

// Show setup page
function showSetupPage(user) {
    const welcomeEl = document.getElementById('setup-welcome');
    welcomeEl.textContent = `Welcome, ${user.name}!`;

    document.getElementById('setup-username').value = user.username;
    document.getElementById('setup-name').value = user.name;
    document.getElementById('setup-email').value = user.email || '';

    showAuthPage('setup-page');
}

// Initialize setup page
function initSetupPage() {
    const form = document.getElementById('setup-form');
    const pinSection = document.getElementById('setup-pin-section');
    const passwordSection = document.getElementById('setup-password-section');
    const newPinDots = pinSection.querySelectorAll('.pin-dots')[0];
    const confirmPinDots = pinSection.querySelectorAll('.pin-dots')[1];
    const statusEl = document.getElementById('setup-status');

    let setupAuthMethod = 'pin';

    setupNewPinPad = new PinPad('setup-new-pin', newPinDots);
    setupConfirmPinPad = new PinPad('setup-confirm-pin', confirmPinDots);
    currentSetupPinPad = setupNewPinPad; // Start with new PIN

    // Auth method selector
    const methodBtns = document.querySelectorAll('#setup-auth-method .method-btn');
    methodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setupAuthMethod = btn.dataset.method;

            if (setupAuthMethod === 'password') {
                pinSection.style.display = 'none';
                passwordSection.style.display = 'block';
                if (setupNewPinPad) setupNewPinPad.disableKeyboard();
                if (setupConfirmPinPad) setupConfirmPinPad.disableKeyboard();
                const pwInput = document.getElementById('setup-password');
                if (pwInput) pwInput.focus();
            } else {
                pinSection.style.display = 'block';
                passwordSection.style.display = 'none';
                if (setupNewPinPad) setupNewPinPad.enableKeyboard();
            }
            statusEl.textContent = '';
            statusEl.className = 'status';
        });
    });

    // Password strength indicator
    updatePasswordStrength('setup-password', 'setup-password-strength');

    // PIN pad buttons
    pinSection.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value;

            if (value === 'clear') {
                currentSetupPinPad.clear();
            } else if (value >= '0' && value <= '9') {
                currentSetupPinPad.addDigit(value);
            }
        });
    });

    // Next button (switch to confirm PIN)
    const nextBtn = pinSection.querySelector('.pin-btn-next');
    nextBtn.addEventListener('click', (e) => {
        e.preventDefault();

        if (currentSetupPinPad === setupNewPinPad) {
            if (setupNewPinPad.getValue().length === 4) {
                currentSetupPinPad = setupConfirmPinPad;
                // Switch keyboard to confirm PIN pad
                setupNewPinPad.disableKeyboard();
                setupConfirmPinPad.enableKeyboard();
                statusEl.textContent = 'Now confirm your PIN';
                statusEl.classList.add('success');
            } else {
                statusEl.textContent = 'Please enter a 4-digit PIN first';
                statusEl.classList.add('error');
            }
        } else {
            currentSetupPinPad = setupNewPinPad;
            // Switch keyboard back to new PIN pad
            setupConfirmPinPad.disableKeyboard();
            setupNewPinPad.enableKeyboard();
            statusEl.textContent = '';
            statusEl.className = 'status';
        }
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const username = document.getElementById('setup-username').value.trim();
        const name = document.getElementById('setup-name').value.trim();
        const email = document.getElementById('setup-email').value.trim();

        // Validation
        if (!username || !name || !email) {
            statusEl.textContent = 'All fields are required';
            statusEl.classList.add('error');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            statusEl.textContent = 'Please enter a valid email address';
            statusEl.classList.add('error');
            return;
        }

        let body;
        if (setupAuthMethod === 'password') {
            const password = document.getElementById('setup-password').value;
            const confirmPassword = document.getElementById('setup-password-confirm').value;

            if (!isValidPasswordClient(password)) {
                statusEl.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and digit';
                statusEl.classList.add('error');
                return;
            }

            if (password !== confirmPassword) {
                statusEl.textContent = 'Passwords do not match';
                statusEl.classList.add('error');
                return;
            }

            body = { username, name, email, authMethod: 'password', newPassword: password };
        } else {
            const newPin = setupNewPinPad.getValue();
            const confirmPin = setupConfirmPinPad.getValue();

            if (newPin.length !== 4 || confirmPin.length !== 4) {
                statusEl.textContent = 'Please enter and confirm your 4-digit PIN';
                statusEl.classList.add('error');
                return;
            }

            if (newPin !== confirmPin) {
                statusEl.textContent = 'PINs do not match';
                statusEl.classList.add('error');
                setupConfirmPinPad.reset();
                currentSetupPinPad = setupConfirmPinPad;
                return;
            }

            body = { username, name, email, authMethod: 'pin', newPin };
        }

        try {
            const response = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Setup failed';
                statusEl.classList.add('error');
                return;
            }

            // Setup successful
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);

            statusEl.textContent = 'Setup complete! Redirecting...';
            statusEl.classList.add('success');

            setTimeout(() => {
                completeLogin({ fromLoginForm: true });
            }, 1000);
        } catch (error) {
            console.error('Setup error:', error);
            statusEl.textContent = 'Setup failed. Please try again.';
            statusEl.classList.add('error');
        }
    });
}

// Initialize forgot password page
function initForgotPasswordPage() {
    const form = document.getElementById('forgot-password-form');
    if (!form) return;
    const statusEl = document.getElementById('forgot-status');
    const submitBtn = document.getElementById('forgot-submit-btn');

    // Back to login link
    const backLink = document.querySelector('#forgot-password-page .auth-back-link');
    if (backLink) {
        backLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAuthPage('login-page');
            window.location.hash = 'login';
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const email = document.getElementById('forgot-email').value.trim();

        if (!email) {
            statusEl.textContent = tAuth('auth.forgot.errorEmpty', {}, 'Please enter your email address');
            statusEl.classList.add('error');
            return;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            statusEl.textContent = tAuth('auth.forgot.errorInvalidEmail', {}, 'Please enter a valid email address');
            statusEl.classList.add('error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending...';
        }

        try {
            await fetch('/api/auth/request-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            // Hide subtitle and form, show only success message
            const subtitle = document.querySelector('#forgot-password-page .muted');
            if (subtitle) subtitle.style.display = 'none';
            form.style.display = 'none';
            statusEl.innerHTML = `
                <div style="text-align:center;padding:12px 0 0;">
                    <p style="margin:0 0 6px;color:var(--text-primary);font-size:15px;font-weight:600;">
                        ${tAuth('auth.forgot.successSentTo', {}, 'Reset link sent to')} ${email}
                    </p>
                    <p style="margin:0 0 8px;color:var(--text-muted);font-size:13px;line-height:1.5;">
                        ${tAuth('auth.forgot.successCheckInbox', {}, 'Check your inbox (and spam folder).')}
                    </p>
                    <p style="margin:0;color:var(--text-muted);font-size:13px;line-height:1.5;">
                        ${tAuth('auth.forgot.successExpiry', {}, 'The link expires in 1 hour.')}
                    </p>
                </div>
            `;
            statusEl.className = 'status success';
        } catch (error) {
            statusEl.textContent = 'Something went wrong. Please try again.';
            statusEl.classList.add('error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Reset Link';
            }
        }
    });
}

// Initialize reset credential page
function initResetCredentialPage() {
    const form = document.getElementById('reset-credential-form');
    if (!form) return;
    const statusEl = document.getElementById('reset-status');
    const submitBtn = document.getElementById('reset-submit-btn');
    const passwordFields = document.getElementById('reset-password-fields');
    const pinFields = document.getElementById('reset-pin-fields');

    let resetAuthMethod = 'password';

    // PIN pads for reset page
    const newPinDots = document.getElementById('reset-pin-dots');
    const confirmPinDots = document.getElementById('reset-confirm-pin-dots');
    const pinPadContainer = document.getElementById('reset-pin-pad');

    if (newPinDots && confirmPinDots) {
        resetNewPinPad = new PinPad('reset-new-pin', newPinDots);
        resetConfirmPinPad = new PinPad('reset-confirm-pin', confirmPinDots);
        currentResetPinPad = resetNewPinPad;
    }

    // PIN pad buttons for reset page
    if (pinPadContainer) {
        pinPadContainer.querySelectorAll('.pin-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const value = btn.dataset.value;
                if (value === 'clear') {
                    if (currentResetPinPad) currentResetPinPad.clear();
                } else if (value >= '0' && value <= '9') {
                    if (currentResetPinPad) currentResetPinPad.addDigit(value);
                }
            });
        });

        // Next button for reset PIN
        const nextBtn = pinPadContainer.querySelector('.pin-btn-next');
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (currentResetPinPad === resetNewPinPad) {
                    if (resetNewPinPad.getValue().length === 4) {
                        currentResetPinPad = resetConfirmPinPad;
                        resetNewPinPad.disableKeyboard();
                        resetConfirmPinPad.enableKeyboard();
                        statusEl.textContent = 'Now confirm your PIN';
                        statusEl.classList.add('success');
                    } else {
                        statusEl.textContent = 'Please enter a 4-digit PIN first';
                        statusEl.classList.add('error');
                    }
                } else {
                    currentResetPinPad = resetNewPinPad;
                    resetConfirmPinPad.disableKeyboard();
                    resetNewPinPad.enableKeyboard();
                    statusEl.textContent = '';
                    statusEl.className = 'status';
                }
            });
        }
    }

    // Auth method selector for reset page
    const methodBtns = document.querySelectorAll('#reset-method-selector .method-btn');
    methodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            methodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resetAuthMethod = btn.dataset.method;

            if (resetAuthMethod === 'pin') {
                passwordFields.style.display = 'none';
                pinFields.style.display = 'block';
                if (resetNewPinPad) resetNewPinPad.enableKeyboard();
            } else {
                passwordFields.style.display = 'block';
                pinFields.style.display = 'none';
                if (resetNewPinPad) resetNewPinPad.disableKeyboard();
                if (resetConfirmPinPad) resetConfirmPinPad.disableKeyboard();
                const pwInput = document.getElementById('reset-password');
                if (pwInput) pwInput.focus();
            }
            statusEl.textContent = '';
            statusEl.className = 'status';
        });
    });

    // Password strength indicator
    updatePasswordStrength('reset-password', 'reset-password-strength');

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const token = document.getElementById('reset-token').value;
        if (!token) {
            statusEl.textContent = 'Invalid reset link. Please request a new one.';
            statusEl.classList.add('error');
            return;
        }

        let body = { token, authMethod: resetAuthMethod };

        if (resetAuthMethod === 'password') {
            const password = document.getElementById('reset-password').value;
            const confirmPassword = document.getElementById('reset-password-confirm').value;

            if (!isValidPasswordClient(password)) {
                statusEl.textContent = 'Password must be at least 8 characters with uppercase, lowercase, and digit';
                statusEl.classList.add('error');
                return;
            }

            if (password !== confirmPassword) {
                statusEl.textContent = 'Passwords do not match';
                statusEl.classList.add('error');
                return;
            }

            body.newPassword = password;
        } else {
            const newPin = resetNewPinPad ? resetNewPinPad.getValue() : '';
            const confirmPin = resetConfirmPinPad ? resetConfirmPinPad.getValue() : '';

            if (newPin.length !== 4 || confirmPin.length !== 4) {
                statusEl.textContent = 'Please enter and confirm your 4-digit PIN';
                statusEl.classList.add('error');
                return;
            }

            if (newPin !== confirmPin) {
                statusEl.textContent = 'PINs do not match';
                statusEl.classList.add('error');
                if (resetConfirmPinPad) resetConfirmPinPad.reset();
                return;
            }

            body.newPin = newPin;
        }

        if (submitBtn) submitBtn.disabled = true;

        try {
            const response = await fetch('/api/auth/reset-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Reset failed';
                statusEl.classList.add('error');
                return;
            }

            statusEl.textContent = 'Credential reset successfully! Redirecting to login...';
            statusEl.classList.add('success');

            setTimeout(() => {
                showAuthPage('login-page');
                window.location.hash = 'login';
            }, 2000);
        } catch (error) {
            console.error('Reset error:', error);
            statusEl.textContent = 'Reset failed. Please try again.';
            statusEl.classList.add('error');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}

// IDs of user-visible stats we must never show from a previous user
const USER_SENSITIVE_STAT_IDS = [
    'hero-active-projects', 'hero-completion-rate', 'ring-percentage',
    'pending-tasks-new', 'in-progress-tasks', 'high-priority-tasks',
    'overdue-tasks', 'completed-tasks-new', 'research-milestones'
];

function wipeUserSensitiveDOM() {
    USER_SENSITIVE_STAT_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
}

// Complete login and show app
async function completeLogin({ fromLoginForm = false } = {}) {
    const appRoot = document.querySelector('.app');

    // Clear auth-related hash so the URL doesn't stay on #forgot-password, #login, etc.
    // Preserve app navigation hashes (e.g. #project-4, #tasks, #dashboard) for deep linking.
    const authHashes = new Set(['login', 'admin-login', 'setup', 'forgot-password']);
    const currentHash = window.location.hash.slice(1).split('?')[0];
    if (authHashes.has(currentHash)) {
        window.location.hash = '';
    }

    // CRITICAL: Show splash and hide app *before* hiding auth overlay. Otherwise, when
    // switching users, we hide the login overlay first and briefly expose the app still
    // showing the previous user's data. Never reveal the app until new user's data is loaded.
    showBootSplash();
    if (appRoot) appRoot.style.display = 'none';
    wipeUserSensitiveDOM();
    showAuthPage(''); // Hide all auth pages (login overlay); app already hidden

    // Update user dropdown
    updateUserDropdown();

    // Trigger app initialization which will reload data for the new user.
    // skipCache: true so we never use cached data from a previous user (fixes 1–3s wrong dashboard).
    const initStart = performance.now();
    if (window.initializeApp) {
        await window.initializeApp({ skipCache: true });
    }
    const initEnd = performance.now();
    // console.log(`[PERF] initializeApp took ${(initEnd - initStart).toFixed(2)}ms`);

    // Show app AFTER data is loaded (prevents showing zeros on dashboard)
    if (appRoot) appRoot.style.display = 'flex';

    hideBootSplash();

    // Re-setup user menu after app is visible (fixes click handler)
    setTimeout(() => {
        if (window.setupUserMenus) {
            window.setupUserMenus();
        }
    }, 100);
}

// Initialize admin dashboard
function initAdminDashboard() {
    // Load users button
    document.getElementById('admin-logout').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        authToken = null;
        isAdmin = false;
        if (adminLoginPinPad) {
            adminLoginPinPad.reset();
        }
        showAuthPage('admin-login-page');
    });

    // Initialize create user form
    initCreateUserForm();
}

// Load users in admin dashboard
async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Failed to load users:', data.error);
            return;
        }

        displayUsers(data.users);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Display users in admin dashboard
function displayUsers(users) {
    const usersList = document.getElementById('users-list');

    if (users.length === 0) {
        usersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);">No users yet. Create one below.</p>';
        return;
    }

    usersList.innerHTML = users.map(user => `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-card-header">
                <div>
                    <div class="user-card-name">${escapeHtml(user.name)}</div>
                    <div class="user-card-username">@${escapeHtml(user.username)}</div>
                </div>
                <span class="user-card-status ${user.needsSetup ? 'setup' : 'active'}">
                    ${user.needsSetup ? 'Needs Setup' : 'Active'}
                </span>
            </div>
            <div class="user-card-info">
                ${user.email ? escapeHtml(user.email) : 'No email yet'}
            </div>
            <div class="user-card-info">
                Created: ${new Date(user.createdAt).toLocaleDateString()}
            </div>
            <div class="user-card-actions">
                <button onclick="resetUserPin('${user.id}', '${escapeHtml(user.name)}')">Reset PIN</button>
                <button class="danger" onclick="deleteUser('${user.id}', '${escapeHtml(user.name)}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Initialize create user form
function initCreateUserForm() {
    const form = document.getElementById('create-user-form');
    const dotsContainer = form.querySelector('.pin-dots');
    const statusEl = document.getElementById('create-user-status');

    createUserPinPad = new PinPad('new-temp-pin', dotsContainer);

    // PIN pad buttons
    form.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value;

            if (value === 'clear') {
                createUserPinPad.clear();
            } else if (value >= '0' && value <= '9') {
                createUserPinPad.addDigit(value);
            }
        });
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const username = document.getElementById('new-username').value.trim();
        const name = document.getElementById('new-name').value.trim();
        const tempPin = createUserPinPad.getValue();

        if (!username || !name) {
            statusEl.textContent = 'Username and name are required';
            statusEl.classList.add('error');
            return;
        }

        if (tempPin.length !== 4) {
            statusEl.textContent = 'Please enter a 4-digit temporary PIN';
            statusEl.classList.add('error');
            return;
        }

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ username, name, tempPin })
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Failed to create user';
                statusEl.classList.add('error');
                return;
            }

            statusEl.textContent = `User created! Temp PIN: ${data.user.tempPin}`;
            statusEl.classList.add('success');

            // Reset form
            form.reset();
            createUserPinPad.reset();

            // Reload users
            loadUsers();
        } catch (error) {
            console.error('Create user error:', error);
            statusEl.textContent = 'Failed to create user. Please try again.';
            statusEl.classList.add('error');
        }
    });
}

// Show admin dashboard
function showAdminDashboard() {
    showAuthPage('admin-page');
    loadUsers();
}

// Reset user PIN (admin action)
async function resetUserPin(userId, userName) {
    const newTempPin = prompt(tAuth('auth.admin.resetPinPrompt', { userName }, `Enter new temporary PIN for ${userName}:`));

    if (!newTempPin || !/^\d{4}$/.test(newTempPin)) {
        alert(tAuth('auth.admin.pinMustBe4Digits', null, 'PIN must be exactly 4 digits'));
        return;
    }

    try {
        const response = await fetch('/api/admin/users/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId, newTempPin })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || tAuth('auth.admin.resetPinFailed', null, 'Failed to reset PIN'));
            return;
        }

        alert(tAuth('auth.admin.resetPinSuccess', { userName, pin: newTempPin }, `PIN reset for ${userName}. New temp PIN: ${newTempPin}`));
        loadUsers();
    } catch (error) {
        console.error('Reset PIN error:', error);
        alert(tAuth('auth.admin.resetPinFailed', null, 'Failed to reset PIN'));
    }
}

// Delete user (admin action)
async function deleteUser(userId, userName) {
    if (!confirm(tAuth('auth.admin.deleteUserConfirm', { userName }, `Are you sure you want to delete user \"${userName}\"? This will also delete all their tasks and projects.`))) {
        return;
    }

    try {
        const response = await fetch('/api/admin/users/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || tAuth('auth.admin.deleteUserFailed', null, 'Failed to delete user'));
            return;
        }

        alert(tAuth('auth.admin.deleteUserSuccess', { userName }, `User \"${userName}\" deleted successfully`));
        loadUsers();
    } catch (error) {
        console.error('Delete user error:', error);
        alert(tAuth('auth.admin.deleteUserFailed', null, 'Failed to delete user'));
    }
}

// Update user dropdown in app
function updateUserDropdown() {
    if (!currentUser) return;

    const avatar = document.getElementById('shared-user-avatar');
    const nameEl = document.querySelector('.user-dropdown .user-name');
    const emailEl = document.querySelector('.user-dropdown .user-email');

    // Set initials
    const initials = currentUser.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    if (avatar) {
        if (currentUser.avatarDataUrl) {
            avatar.classList.add('has-image');
            avatar.style.backgroundImage = `url(${currentUser.avatarDataUrl})`;
            avatar.textContent = '';
        } else {
            avatar.classList.remove('has-image');
            avatar.style.backgroundImage = '';
            avatar.textContent = initials;
        }
    }
    nameEl.textContent = currentUser.name;
    emailEl.textContent = currentUser.email || currentUser.username;
}

// Check and run migration if needed
async function checkMigration() {
    // Check if migration already completed
    const migrated = localStorage.getItem('migration:checked');
    if (migrated) {
        return null;
    }

    try {
        const response = await fetch('/api/migrate', {
            method: 'POST'
        });

        const data = await response.json();

        // Mark as checked so we don't run again
        localStorage.setItem('migration:checked', 'true');

        if (data.success) {
            console.log('Migration completed:', data);
            return data.user; // Return migrated user info
        }

        return null;
    } catch (error) {
        console.error('Migration check failed:', error);
        localStorage.setItem('migration:checked', 'true'); // Don't retry on error
        return null;
    }
}

// Check if user is already logged in
async function checkAuth() {
    // console.time('[PERF] Total checkAuth');

    // Start migration check in the background (never block first paint / login UI).
    // console.time('[PERF] Migration Check');
    const migrationPromise = checkMigration().catch(() => null);
    // console.timeEnd('[PERF] Migration Check');

    // Check if URL has reset token FIRST — must take priority over stored auth
    // so that logged-in users still see the reset page instead of the dashboard.
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('reset?')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const resetToken = params.get('token');
        if (resetToken) {
            const tokenInput = document.getElementById('reset-token');
            if (tokenInput) tokenInput.value = resetToken;
            showAuthPage('reset-credential-page');
            // console.timeEnd('[PERF] Total checkAuth');
            return;
        }
    }

    const token = localStorage.getItem('authToken');
    const adminToken = localStorage.getItem('adminToken');
    const tokenExpiration = localStorage.getItem('authTokenExpiration');

    // Check admin token first
    if (adminToken) {
        authToken = adminToken;
        isAdmin = true;
        showAdminDashboard();
        // console.timeEnd('[PERF] Total checkAuth');
        return;
    }

    // Check user token with 24-hour expiration
    if (token && tokenExpiration) {
        const expirationDate = new Date(tokenExpiration);

        // If expired, clear and show login
        if (new Date() >= expirationDate) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authTokenExpiration');
            showAuthPage('login-page');
            // console.timeEnd('[PERF] Total checkAuth');
            return;
        }

        // Token not expired, verify it
        authToken = token;

        try {
            // console.time('[PERF] Auth Verify API Call');
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // console.timeEnd('[PERF] Auth Verify API Call');

            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;

                if (currentUser.needsSetup) {
                    showSetupPage(currentUser);
                } else {
                    completeLogin();
                }
                // console.timeEnd('[PERF] Total checkAuth');
                return;
            }
        } catch (error) {
            console.error('Auth verification failed:', error);
            // console.timeEnd('[PERF] Auth Verify API Call');
        }

        // Token invalid, remove it
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenExpiration');
    }

    // Not logged in, show login page
    showAuthPage('login-page');
    // console.timeEnd('[PERF] Total checkAuth');

    // If a migration completed, show a helpful message on the login screen.
    const migratedUser = await migrationPromise;
    if (migratedUser) {
        const statusEl = document.getElementById('login-status');
        if (statusEl) {
            statusEl.textContent = `Welcome back! Your data has been migrated. Login with username "${migratedUser.username}" and PIN "${migratedUser.tempPin}"`;
            statusEl.classList.add('success');
        }
    }
}

// Utility function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize auth system on page load
document.addEventListener('DOMContentLoaded', () => {
    // console.log('[PERF] DOMContentLoaded fired');
    // console.time('[PERF] Auth System Initialization');

    // Hide app initially
    document.querySelector('.app').style.display = 'none';

    // console.time('[PERF] Init Auth Pages');
    // Initialize all auth pages
    initLoginPage();
    initAdminLoginPage();
    initSetupPage();
    initAdminDashboard();
    initForgotPasswordPage();
    initResetCredentialPage();
    // console.timeEnd('[PERF] Init Auth Pages');

    // Add reveal toggles to all password inputs on auth pages
    window.applyPasswordToggles();

    // Check if already logged in
    checkAuth().finally(() => {
        // console.timeEnd('[PERF] Auth System Initialization');
    });

    // Handle hash navigation
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);

        if (hash === 'login') {
            showAuthPage('login-page');
        } else if (hash === 'admin-login') {
            showAuthPage('admin-login-page');
        } else if (hash === 'forgot-password') {
            showAuthPage('forgot-password-page');
        } else if (hash.startsWith('reset?')) {
            const params = new URLSearchParams(hash.split('?')[1]);
            const resetToken = params.get('token');
            if (resetToken) {
                const tokenInput = document.getElementById('reset-token');
                if (tokenInput) tokenInput.value = resetToken;
                showAuthPage('reset-credential-page');
            }
        }
    });

    // Cross-tab auth sync: when the auth token changes in another tab (e.g. another
    // tab signs out or a different user logs in), force a reload so this tab picks up
    // the correct session state instead of continuing with stale data / a mismatched
    // header+data combination.
    window.addEventListener('storage', (event) => {
        if (event.key !== 'authToken') return;

        const tokenWasRemoved = !event.newValue;
        const tokenChanged = event.newValue && event.newValue !== event.oldValue;

        if (tokenWasRemoved || tokenChanged) {
            // Reload this tab so checkAuth() runs fresh and shows the correct
            // user (or the login page if no token).
            window.location.reload();
        }
    });

    // Shared helper: hard-reload bypassing BFCache.
    // `window.location.reload()` can itself be served from BFCache on Chrome
    // mobile, creating an infinite restore loop.  Using `location.replace` with
    // the current URL forces a fresh network load and removes the current entry
    // from the session history (so back-navigation can't restore the stale page).
    function forceAuthReload() {
        window.location.replace(window.location.href);
    }

    // Shared helper: check whether the in-memory auth state matches localStorage
    // and whether the stored token is still valid.  Returns true when a reload is
    // required.
    function authStateIsStale() {
        const storedToken = localStorage.getItem('authToken');

        // Mismatch — another tab logged out or a different user logged in.
        if (storedToken !== authToken) return true;

        // Token present but expired client-side — treat as logged-out.
        if (storedToken) {
            const expiry = localStorage.getItem('authTokenExpiration');
            if (expiry && new Date() >= new Date(expiry)) return true;
        }

        return false;
    }

    // BFCache (Back/Forward Cache) restore guard.
    //
    // When Chrome mobile restores a page from BFCache (e.g. user navigates back,
    // or the OS resumes a frozen tab), ALL JavaScript state is revived exactly as
    // it was — including the in-memory `authToken` and `currentUser` variables.
    // But localStorage may have changed in the meantime (another tab signed out,
    // or a different user logged in on this tab after a reload).  The result is a
    // split identity: the header shows the BFCache user while API calls silently
    // use the NEW token from localStorage and return the new user's data.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return; // Normal page load — nothing to do.

        // `authToken` is the module-level variable frozen in the BFCache snapshot.
        if (authStateIsStale()) {
            forceAuthReload();
        }
    });

    // Tab-freeze / OS-background guard.
    //
    // Chrome mobile can freeze a tab's JS execution when the user backgrounds the
    // browser for a long period (distinct from BFCache navigation).  When the tab
    // is thawed, `visibilitychange` fires (visibilityState → 'visible') but
    // `pageshow` does NOT.  Without this guard the in-memory auth state is stale
    // for however long the tab was frozen, leading to:
    //   • expired tokens silently failing every API call
    //   • wrong user name in the header if localStorage was updated by another tab
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;

        if (authStateIsStale()) {
            forceAuthReload();
        }
    });
});

// Export for use in app.js
window.authSystem = {
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken,
    logout: () => {
        // Clear data caches for current user BEFORE clearing token.
        // Prevents next user from ever seeing this user's cached tasks/projects.
        const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
        if (token) {
            localStorage.removeItem(`tasksCache:v1:${token}`);
            localStorage.removeItem(`projectsCache:v1:${token}`);
        }
        localStorage.removeItem('nautilus_cache_token:v1');

        // Clear the feedback cache — it is NOT token-scoped so it is shared
        // across users.  Without this, the next user would briefly see the
        // previous user's feedback items from the local cache.
        localStorage.removeItem('feedbackItemsCache:v1');

        // Clear all user-specific data to prevent leakage between users
        localStorage.removeItem('authToken');
        localStorage.removeItem('authTokenExpiration');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userName');
        localStorage.removeItem('settings');
        // Keep lastUsername for pre-filling on next login
        currentUser = null;
        authToken = null;
        isAdmin = false;
        window.location.replace(window.location.href);
    }
};

// Export boot splash functions for app.js initialization
window.updateBootSplashProgress = updateBootSplashProgress;
window.hideBootSplash = hideBootSplash;
