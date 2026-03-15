import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading } = useAuth()

    if (loading) {
        return null
    }

    // Not logged in — redirect to login
    if (!user) {
        return <Navigate to="/login" replace />
    }

    // If specific roles are required, check them
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to the appropriate dashboard based on role
        if (user.role === 'user') {
            return <Navigate to="/user/dashboard" replace />
        }
        return <Navigate to="/dashboard" replace />
    }

    return <Outlet />
}
