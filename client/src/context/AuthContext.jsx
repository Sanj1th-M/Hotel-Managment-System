/**
 * AuthContext — Cookie-based authentication (Step 3 fix)
 *
 * - No token stored in localStorage (was XSS-vulnerable)
 * - On mount: calls GET /api/auth/me to hydrate session from the HttpOnly cookie
 * - Login: server sets the cookie; we only store the user profile in React state
 * - Logout: calls POST /api/auth/logout which clears the server cookie and revokes the JTI
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    // On mount: attempt to restore session from server-side cookie
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const { data } = await api.get('/auth/me')
                if (data.success) setUser(data.user)
            } catch {
                // No valid session — user will stay null (not logged in)
                setUser(null)
            } finally {
                setLoading(false)
            }
        }
        restoreSession()
    }, [])

    /**
     * Called after a successful login response.
     * The server has already set the HttpOnly cookie; we just store the user profile.
     */
    const login = useCallback((userData) => {
        setUser(userData)
    }, [])

    /**
     * Calls the server logout endpoint (which clears the cookie and revokes the JTI),
     * then clears local user state.
     */
    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout')
        } catch {
            // Even if the server call fails, clear local state
        } finally {
            setUser(null)
            navigate('/login', { replace: true })
        }
    }, [navigate])

    const isAdmin = user?.role === 'admin'
    const isUser = user?.role === 'user'
    const isStaff = user?.role === 'staff'

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin, isUser, isStaff, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
