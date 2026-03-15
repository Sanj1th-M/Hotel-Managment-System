import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
    // Step 3 fix: send cookies with every request (required for HttpOnly cookie auth)
    withCredentials: true,
})

// ── Request interceptor ────────────────────────────────────────────────────────
// No Authorization header needed — the browser sends the HttpOnly cookie automatically.
// Keep interceptor in place for future needs (e.g. CSRF token header).
api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401 globally ────────────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Prevent redirect loop if the request was the initial session restore check
            if (error.config && error.config.url === '/auth/me') {
                return Promise.reject(error)
            }

            // Public routes that should not trigger a force redirect
            const publicRoutes = ['/login', '/register', '/rooms/browse']
            
            // Cookie is expired or revoked — redirect to login
            if (!publicRoutes.includes(window.location.pathname)) {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
