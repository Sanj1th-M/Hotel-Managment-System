import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import RoomsPage from './pages/RoomsPage'
import CreateBookingPage from './pages/CreateBookingPage'
import BookingManagementPage from './pages/BookingManagementPage'
import BookingDetailsPage from './pages/BookingDetailsPage'

export default function App() {
    const { loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-white px-6">
                <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black shadow-float">
                        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-white/35 border-t-white" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-600">Hotel Suite</p>
                        <p className="text-sm text-slate-500">Preparing your luxury workspace...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/rooms" element={<RoomsPage />} />
                    <Route path="/bookings" element={<BookingManagementPage />} />
                    <Route path="/bookings/new" element={<CreateBookingPage />} />
                    <Route path="/bookings/:id" element={<BookingDetailsPage />} />
                </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}
