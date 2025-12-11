// public/js/api.js
// -------------------------------------------------------------
// Heart Track - API Communication Manager
// -------------------------------------------------------------
//  - Centralized wrapper around window.fetch for all backend calls.
//  - Automatically injects Authorization headers using auth.js.
//  - Installs a global fetch interceptor that:
//        • Adds JWT to every request when logged in
//        • Gracefully handles 401 Unauthorized responses
//        • Prevents accidental auto-logout unless token is missing
//  - Provides API helpers:
//        AUTH:
//          • login(email, password, rememberMe)
//          • register(email, password)
//          • logout()
//        DEVICES:
//          • getDevices()
//          • registerDevice(data)
//          • updateDevice(id, data)
//          • deleteDevice(id)
//        MEASUREMENTS:
//          • getMeasurements(params)
//          • submitMeasurement(data)
//          • addMeasurementFromDevice(data)
//          • getWeeklySummary()
//          • getDailyDetails(date)
//        USER PROFILE / SETTINGS:
//          • getUserProfile()
//          • updateUserProfile(data)
//          • updateUserSettings(settings)
//  - Includes JSON response handling with error translation.
//  - Contains mock data generators used for development/testing.
//  - Instantiated globally as window.apiManager on DOMContentLoaded.
// -------------------------------------------------------------

class APIManager {
    constructor() {
        this.baseUrl = '/api';
        this.authManager = window.authManager;
        this.init();
    }

    init() {
        // Setup request interceptors for authentication
        this.setupInterceptors();
    }

    setupInterceptors() {
        // Add authentication headers to all requests
        this.originalFetch = window.fetch.bind(window);
        window.fetch = async (url, options = {}) => {
            // Add auth headers if available
            if (this.authManager && this.authManager.isAuthenticated()) {
                const headers = this.authManager.getAuthHeaders();
                options.headers = {
                    ...(options.headers || {}),
                    ...headers
                };
            }

            try {
                const response = await this.originalFetch(url, options);
                
                // Handle 401 responses
                if (response.status === 401) {
                    this.handleUnauthorized();
                }
                
                return response;
            } catch (error) {
                console.error('API request failed:', error);
                throw error;
            }
        };
    }

    handleUnauthorized() {
        // DO NOT auto-logout immediately
        console.warn("Received 401 Unauthorized — NOT auto-logging out.");

        // Optionally: only log out if token truly missing
        if (!this.authManager || !this.authManager.getToken()) {
            console.warn("Token missing — logging out.");
            this.authManager.logout();
        }
    }

    // Authentication API calls
    async login(email, password, rememberMe = false) {
        const response = await fetch(`${this.baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, rememberMe })
        });

        return this.handleResponse(response);
    }

    async register(email, password) {
        const response = await fetch(`${this.baseUrl}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        return this.handleResponse(response);
    }

    async logout() {
        const response = await fetch(`${this.baseUrl}/auth/logout`, {
            method: 'POST',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // Device API calls
    async getDevices() {
        const response = await fetch(`${this.baseUrl}/devices`, {
            method: 'GET',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    async registerDevice(deviceData) {
        const response = await fetch(`${this.baseUrl}/devices`, {
            method: 'POST',
            headers: this.authManager.getAuthHeaders(),
            body: JSON.stringify(deviceData)
        });

        return this.handleResponse(response);
    }

    async updateDevice(deviceId, deviceData) {
        const response = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
            method: 'PUT',
            headers: this.authManager.getAuthHeaders(),
            body: JSON.stringify(deviceData)
        });

        return this.handleResponse(response);
    }

    async deleteDevice(deviceId) {
        const response = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
            method: 'DELETE',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // Measurement API calls
    async getMeasurements(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${this.baseUrl}/measurements?${queryString}` : `${this.baseUrl}/measurements`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    async submitMeasurement(measurementData) {
        const response = await fetch(`${this.baseUrl}/measurements`, {
            method: 'POST',
            headers: this.authManager.getAuthHeaders(),
            body: JSON.stringify(measurementData)
        });

        return this.handleResponse(response);
    }

    async addMeasurementFromDevice(measurementData) {
        const response = await fetch(`${this.baseUrl}/measurements/device`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(measurementData)
        });

        return this.handleResponse(response);
    }


    async getWeeklySummary() {
        const response = await fetch(`${this.baseUrl}/measurements/weekly`, {
            method: 'GET',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    async getDailyDetails(date) {
        const response = await fetch(`${this.baseUrl}/measurements/daily/${date}`, {
            method: 'GET',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    // User API calls
    async getUserProfile() {
        const response = await fetch(`${this.baseUrl}/users/profile`, {
            method: 'GET',
            headers: this.authManager.getAuthHeaders()
        });

        return this.handleResponse(response);
    }

    async updateUserProfile(userData) {
        const response = await fetch(`${this.baseUrl}/users/profile`, {
            method: 'PUT',
            headers: this.authManager.getAuthHeaders(),
            body: JSON.stringify(userData)
        });

        return this.handleResponse(response);
    }

    async updateUserSettings(settings) {
        const response = await fetch(`${this.baseUrl}/users/settings`, {
            method: 'PUT',
            headers: this.authManager.getAuthHeaders(),
            body: JSON.stringify(settings)
        });

        return this.handleResponse(response);
    }

    // Utility methods
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return data;
        } else {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        }
    }

    // Mock data for development/testing
    getMockData() {
        return {
            devices: [
                {
                    id: '1',
                    name: 'Heart Track Device #1',
                    status: 'online',
                    batteryLevel: 85,
                    lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
                    settings: {
                        measurementInterval: 30,
                        timeRange: { start: '06:00', end: '22:00' }
                    }
                },
                {
                    id: '2',
                    name: 'Heart Track Device #2',
                    status: 'offline',
                    batteryLevel: 42,
                    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                    settings: {
                        measurementInterval: 60,
                        timeRange: { start: '08:00', end: '20:00' }
                    }
                }
            ],
            measurements: this.generateMockMeasurements(),
            weeklySummary: {
                averageHeartRate: 72,
                minHeartRate: 58,
                maxHeartRate: 95,
                averageOxygen: 98,
                minOxygen: 94,
                maxOxygen: 100,
                totalMeasurements: 168
            },
            user: {
                id: '1',
                email: 'user@example.com',
                createdAt: new Date('2025-01-01'),
                settings: {
                    measurementInterval: 30,
                    timeRange: { start: '06:00', end: '22:00' },
                    notifications: true,
                    emailReports: true
                }
            }
        };
    }

    generateMockMeasurements() {
        const measurements = [];
        const now = new Date();
        
        // Generate measurements for the last 7 days
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            // Generate measurements every 30 minutes during active hours
            for (let hour = 6; hour < 22; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const measurementTime = new Date(date);
                    measurementTime.setHours(hour, minute, 0, 0);
                    
                    measurements.push({
                        id: `${i}-${hour}-${minute}`,
                        timestamp: measurementTime,
                        heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 BPM
                        bloodOxygen: Math.floor(Math.random() * 6) + 94, // 94-100%
                        deviceId: '1'
                    });
                }
            }
        }
        
        return measurements.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`API Error ${context}:`, error);
        
        if (window.heartTrackApp) {
            const message = error.message || 'An unexpected error occurred';
            window.heartTrackApp.showNotification(message, 'error');
        }
    }
}

// Initialize API manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.apiManager = new APIManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}
