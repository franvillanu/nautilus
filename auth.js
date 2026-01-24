// auth.js - Authentication system
// console.log('[PERF] auth.js script started executing at', performance.now());

// Global auth state
let currentUser = null;
let authToken = null;
let isAdmin = false;
let currentProgress = 0;
const BOOT_REVEAL_START_PERCENT = 52;

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
let currentSetupPinPad; // Track which setup PIN pad is active

// Show/hide auth pages
function showAuthPage(pageId) {
    // Disable all PIN pad keyboards first
    if (loginPinPad) loginPinPad.disableKeyboard();
    if (adminLoginPinPad) adminLoginPinPad.disableKeyboard();
    if (setupNewPinPad) setupNewPinPad.disableKeyboard();
    if (setupConfirmPinPad) setupConfirmPinPad.disableKeyboard();
    if (createUserPinPad) createUserPinPad.disableKeyboard();

    // Hide all auth pages
    document.querySelectorAll('.auth-overlay').forEach(page => {
        page.style.display = 'none';
    });

    // Show requested page and enable its keyboard
    const page = document.getElementById(pageId);
    if (page) {
        // Once an auth overlay is visible, the boot splash should get out of the way.
        hideBootSplash();
        page.style.display = 'flex';

        // Enable keyboard for the active PIN pad
        if (pageId === 'login-page' && loginPinPad) {
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
    const dotsContainer = form.querySelector('.pin-dots');
    const statusEl = document.getElementById('login-status');

    // Pre-fill username from last login
    const identifierInput = document.getElementById('login-identifier');
    const lastUsername = localStorage.getItem('lastUsername');
    if (lastUsername) {
        identifierInput.value = lastUsername;
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
    form.querySelectorAll('.pin-btn').forEach(btn => {
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

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
        statusEl.className = 'status';

        const identifier = document.getElementById('login-identifier').value.trim();
        const pin = loginPinPad.getValue();

        if (!identifier) {
            statusEl.textContent = 'Please enter username or email';
            statusEl.classList.add('error');
            return;
        }

        if (pin.length !== 4) {
            statusEl.textContent = 'Please enter your 4-digit PIN';
            statusEl.classList.add('error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, pin })
            });

            const data = await response.json();

            if (!response.ok) {
                statusEl.textContent = data.error || 'Login failed';
                statusEl.classList.add('error');
                loginPinPad.reset();
                return;
            }

            // Login successful
            authToken = data.token;
            currentUser = data.user;

            // Clear previous user's localStorage data to prevent data leakage
            localStorage.removeItem('userName');
            localStorage.removeItem('settings');

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
            loginPinPad.reset();
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
    const newPinDots = form.querySelectorAll('.pin-dots')[0];
    const confirmPinDots = form.querySelectorAll('.pin-dots')[1];
    const statusEl = document.getElementById('setup-status');

    setupNewPinPad = new PinPad('setup-new-pin', newPinDots);
    setupConfirmPinPad = new PinPad('setup-confirm-pin', confirmPinDots);
    currentSetupPinPad = setupNewPinPad; // Start with new PIN

    // PIN pad buttons
    form.querySelectorAll('.pin-btn').forEach(btn => {
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
    const nextBtn = form.querySelector('.pin-btn-next');
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
        const newPin = setupNewPinPad.getValue();
        const confirmPin = setupConfirmPinPad.getValue();

        // Validation
        if (!username || !name || !email) {
            statusEl.textContent = 'All fields are required';
            statusEl.classList.add('error');
            return;
        }

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

        try {
            const response = await fetch('/api/auth/setup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ username, name, email, newPin })
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

// Complete login and show app
async function completeLogin({ fromLoginForm = false } = {}) {
    showAuthPage(''); // Hide all auth pages

    // Always show boot splash while the app initializes to avoid empty UI flashes.
    showBootSplash();
    const appRoot = document.querySelector('.app');
    if (appRoot) appRoot.style.display = 'none';

    // Update user dropdown
    updateUserDropdown();

    // Trigger app initialization which will reload data for the new user
    const initStart = performance.now();
    if (window.initializeApp) {
        await window.initializeApp();
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
    // console.timeEnd('[PERF] Init Auth Pages');

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
        }
    });
});

// Export for use in app.js
window.authSystem = {
    getCurrentUser: () => currentUser,
    getAuthToken: () => authToken,
    logout: () => {
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
        window.location.reload();
    }
};

// Export boot splash functions for app.js initialization
window.updateBootSplashProgress = updateBootSplashProgress;
window.hideBootSplash = hideBootSplash;
