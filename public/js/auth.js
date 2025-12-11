// public/js/auth.js
// -------------------------------------------------------------
// Heart Track - Authentication + Session Management Module
// -------------------------------------------------------------
//  - Manages full login, registration, logout, and session state.
//  - Stores JWT tokens + user objects in localStorage or sessionStorage
//      depending on the “Remember Me” option.
//  - Redirects users based on authentication state (auto-redirects
//      logged-out users away from protected pages).
//  - Implements UI interactions for:
//        • Login / Register tab switching
//        • Password strength meter (live updates)
//        • Inline form validation + user-friendly error handling
//        • Loading states on submit buttons
//  - API Calls handled manually via fetch() to:
//        • POST /api/auth/login
//        • POST /api/auth/register
//        • POST /api/auth/logout
//  - Provides helpers for:
//        • isAuthenticated()
//        • getAuthHeaders() → attaches Authorization: Bearer <token>
//        • getAuthData() (reads token + user from storage)
//        • storeAuthData() (persists token + user)
//  - Automatically binds logout button (#logoutBtn) globally.
//  - On DOM load, instantiates `window.authManager` for use by
//    all other modules (dashboard, daily-detail, settings, etc).
// -------------------------------------------------------------

class AuthManager {
    constructor() {
        this.apiBaseUrl = '/api/auth';
        this.tokenKey = 'heartTrackToken';
        this.userKey = 'heartTrackUser';
        this.init();
    }

    init() {
        this.setupAuthTabs();
        this.setupPasswordStrength();
        this.setupFormHandlers();
        this.checkAuthState();
    }

    setupAuthTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tab states
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update form states
                forms.forEach(form => {
                    form.classList.remove('active');
                    if (form.id === `${targetTab}Form`) {
                        form.classList.add('active');
                    }
                });
            });
        });
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('registerPassword');
        const strengthFill = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');

        if (passwordInput && strengthFill && strengthText) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = this.calculatePasswordStrength(password);
                
                this.updatePasswordStrength(strengthFill, strengthText, strength);
            });
        }
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        Object.values(checks).forEach(check => {
            if (check) score++;
        });

        if (score <= 2) return { level: 'weak', score: 25 };
        if (score <= 3) return { level: 'fair', score: 50 };
        if (score <= 4) return { level: 'good', score: 75 };
        return { level: 'strong', score: 100 };
    }

    updatePasswordStrength(fillElement, textElement, strength) {
        fillElement.style.width = `${strength.score}%`;
        fillElement.className = `strength-fill ${strength.level}`;
        textElement.textContent = `Password strength: ${strength.level}`;
    }

    setupFormHandlers() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        const button = document.querySelector('#loginForm .form-button');
        const buttonText = button.querySelector('.button-text');
        const loading = button.querySelector('.loading');
        const errorDiv = document.getElementById('loginError');

        // Show loading state
        this.setButtonLoading(button, buttonText, loading, true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, rememberMe })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user data
                this.storeAuthData(data.token, data.user, rememberMe);
                
                // Show success message
                if (window.heartTrackApp) {
                    window.heartTrackApp.showNotification('Login successful!', 'success');
                }
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            this.showError(errorDiv, error.message);
        } finally {
            this.setButtonLoading(button, buttonText, loading, false);
        }
    }

    async handleRegister() {
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;

        const button = document.querySelector('#registerForm .form-button');
        const buttonText = button.querySelector('.button-text');
        const loading = button.querySelector('.loading');
        const errorDiv = document.getElementById('registerError');

        // Validate passwords match
        if (password !== confirmPassword) {
            this.showError(errorDiv, 'Passwords do not match');
            return;
        }

        // Validate terms agreement
        if (!agreeTerms) {
            this.showError(errorDiv, 'Please agree to the terms and conditions');
            return;
        }

        // Show loading state
        this.setButtonLoading(button, buttonText, loading, true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store token and user data
                this.storeAuthData(data.token, data.user, false);
                
                // Show success message
                if (window.heartTrackApp) {
                    window.heartTrackApp.showNotification('Account created successfully!', 'success')
                }
                
                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            this.showError(errorDiv, error.message);
        } finally {
            this.setButtonLoading(button, buttonText, loading, false);
        }
    }

    setButtonLoading(button, buttonText, loading, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.classList.add('loading');
            buttonText.classList.add('hidden');
            loading.classList.remove('hidden');
        } else {
            button.disabled = false;
            button.classList.remove('loading');
            buttonText.classList.remove('hidden');
            loading.classList.add('hidden');
        }
    }

    showError(errorDiv, message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        // Auto-hide error after 5 seconds
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    storeAuthData(token, user, rememberMe) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(this.tokenKey, token);
        storage.setItem(this.userKey, JSON.stringify(user));
    }

    getAuthData() {
        const token = localStorage.getItem(this.tokenKey) || sessionStorage.getItem(this.tokenKey);
        const user = localStorage.getItem(this.userKey) || sessionStorage.getItem(this.userKey);
        
        return {
            token,
            user: user ? JSON.parse(user) : null
        };
    }

    isAuthenticated() {
        const { token } = this.getAuthData();
        return !!token;
    }

    checkAuthState() {
        if (this.isAuthenticated()) {
            // User is logged in, redirect to dashboard if on login page
            if (window.location.pathname.includes('login.html')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            // User is not logged in, redirect to login if on protected page
            const protectedPages = ['dashboard.html', 'weekly-summary.html', 'daily-detail.html', 'device-management.html', 'settings.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (protectedPages.includes(currentPage)) {
                window.location.href = 'login.html';
            }
        }
    }

    async logout() {
        try {
            const { token } = this.getAuthData();
            
            if (token) {
                await fetch(`${this.apiBaseUrl}/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear stored data
            localStorage.removeItem(this.tokenKey);
            localStorage.removeItem(this.userKey);
            sessionStorage.removeItem(this.tokenKey);
            sessionStorage.removeItem(this.userKey);
            
            // Redirect to login
            window.location.href = 'login.html';
        }
    }

    getAuthHeaders() {
        const { token } = this.getAuthData();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Setup logout button if it exists
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.authManager.logout();
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
