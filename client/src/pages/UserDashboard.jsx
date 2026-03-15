import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
    Hotel, CalendarCheck, BedDouble, User, LogOut, Download, IndianRupee,
    MapPin, Users, Clock, FileText, Settings, ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import UserSupportChat from '../components/UserSupportChat'

export default function UserDashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('bookings')
    const [profile, setProfile] = useState(null)
    const [profileView, setProfileView] = useState('view') // 'view', 'edit', 'password'
    const [profileForm, setProfileForm] = useState({ username: '', phone: '', age: '' })
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [profileLoading, setProfileLoading] = useState(false)
    const [passwordLoading, setPasswordLoading] = useState(false)

    const fetchBookings = useCallback(async () => {
        try {
            const { data } = await api.get('/users/my-bookings')
            if (data.success) setBookings(data.data)
        } catch {
            toast.error('Failed to load bookings.')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchProfile = useCallback(async () => {
        try {
            const { data } = await api.get('/users/profile')
            if (data.success) {
                setProfile(data.data)
                setProfileForm({
                    username: data.data.username || '',
                    phone: data.data.phone || '',
                    age: data.data.age || '',
                })
            }
        } catch {
            toast.error('Failed to load profile.')
        }
    }, [])

    useEffect(() => {
        fetchBookings()
        fetchProfile()
    }, [fetchBookings, fetchProfile])

    const handleProfileUpdate = async (e) => {
        e.preventDefault()
        setProfileLoading(true)
        try {
            const { data } = await api.put('/users/profile', {
                username: profileForm.username,
                phone: profileForm.phone || null,
                age: profileForm.age ? parseInt(profileForm.age) : null,
            })
            if (data.success) {
                setProfile(data.data)
                setProfileView('view')
                toast.success('Profile updated!')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile.')
        } finally {
            setProfileLoading(false)
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error('New passwords do not match')
        }
        
        setPasswordLoading(true)
        try {
            const { data } = await api.put('/users/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword
            })
            if (data.success) {
                toast.success('Password updated successfully!')
                setProfileView('view')
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            }
        } catch (err) {
            // Handle specific express-validator errors or general errors
            const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to update password'
            toast.error(msg)
        } finally {
            setPasswordLoading(false)
        }
    }

    const handleDownloadReceipt = async (bookingId) => {
        try {
            const response = await api.get(`/users/bookings/${bookingId}/receipt`, { responseType: 'blob' })
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `receipt_booking_${bookingId}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('Receipt downloaded!')
        } catch {
            toast.error('Failed to download receipt.')
        }
    }

    const getStatusBadge = (status) => {
        const classes = {
            confirmed: 'badge-confirmed',
            cancelled: 'badge-cancelled',
            completed: 'badge-completed',
        }
        return classes[status] || 'bg-slate-100 text-slate-600'
    }

    return (
        <div className="min-h-screen bg-hotel-canvas">
            {/* Top Nav */}
            <header className="sticky top-0 z-50 border-b border-hotel-line bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
                    <Link to="/rooms/browse" className="flex items-center gap-3">
                        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-panel">
                            <Hotel size={18} />
                            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Hotel Management</p>
                            <p className="text-xs text-slate-500">Guest Portal</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setActiveTab('profile')} 
                            className={`btn-secondary text-sm px-4 py-2.5 ${activeTab === 'profile' ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                        >
                            <Settings size={15} />
                            Profile
                        </button>
                        <button onClick={logout} className="btn-secondary text-sm px-4 py-2.5">
                            <LogOut size={15} />
                            Sign out
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
                {/* Welcome */}
                <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="page-kicker">Guest Dashboard</p>
                        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">Welcome, {user?.username}</h1>
                        <p className="mt-2 text-sm text-slate-500">Manage your bookings and profile</p>
                    </div>
                </div>

                {/* Tabs / Links */}
                <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors ${activeTab === 'bookings'
                            ? 'bg-primary-50 text-primary-700'
                            : 'bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <CalendarCheck size={16} />
                        My Bookings
                    </button>
                    <Link 
                        to="/rooms/browse" 
                        className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all duration-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:scale-[0.98] cursor-pointer"
                    >
                        <BedDouble size={16} />
                        Book a Room
                    </Link>
                </div>

                {/* Bookings Tab */}
                {activeTab === 'bookings' && (
                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
                            </div>
                        ) : bookings.length === 0 ? (
                            <div className="section-card p-12 text-center">
                                <CalendarCheck size={48} className="mx-auto text-slate-300" />
                                <p className="mt-4 text-lg font-semibold text-slate-900">No bookings yet</p>
                                <p className="mt-2 text-sm text-slate-500">Browse our rooms and book your first stay!</p>
                                <Link to="/rooms/browse" className="btn-primary mt-6 inline-flex">
                                    Browse Rooms <ChevronRight size={16} />
                                </Link>
                            </div>
                        ) : (
                            bookings.map((booking) => (
                                <div key={booking.id} className="section-card p-6">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-4">
                                            {booking.room?.imageUrl ? (
                                                <img src={booking.room.imageUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                                            ) : (
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                                                    <BedDouble size={24} className="text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-900">
                                                        Room {booking.room?.roomNumber || 'N/A'}
                                                    </h3>
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(booking.bookingStatus)}`}>
                                                        {booking.bookingStatus}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {format(new Date(booking.checkInDate), 'MMM dd')} - {format(new Date(booking.checkOutDate), 'MMM dd, yyyy')}
                                                    </span>
                                                    {booking.room && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            Floor {booking.room.floorNumber}
                                                        </span>
                                                    )}
                                                    {booking.persons && (
                                                        <span className="flex items-center gap-1">
                                                            <Users size={12} />
                                                            {booking.persons} guest{booking.persons > 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="flex items-center text-lg font-bold text-slate-900">
                                                <IndianRupee size={16} />{booking.totalPrice.toLocaleString()}
                                            </p>
                                            {booking.bookingStatus === 'confirmed' && booking.paymentId && (
                                                <button
                                                    onClick={() => handleDownloadReceipt(booking.id)}
                                                    className="btn-secondary px-3 py-2 text-xs"
                                                    title="Download Receipt"
                                                >
                                                    <Download size={14} />
                                                    Receipt
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && profile && (
                    <div className="section-card p-8 max-w-2xl">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Your Profile</h2>

                        {profileView === 'view' ? (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                                        {profile.photoUrl ? (
                                            <img src={profile.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                                        ) : (
                                            <User size={28} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">{profile.username}</h3>
                                        <p className="text-sm text-slate-500">{profile.email}</p>
                                    </div>
                                </div>

                                {[
                                    ['Phone', profile.phone || 'Not set'],
                                    ['Age', profile.age || 'Not set'],
                                    ['Member since', profile.createdAt ? format(new Date(profile.createdAt), 'MMM dd, yyyy') : 'N/A'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between border-b border-hotel-line py-3">
                                        <span className="text-sm text-slate-500">{label}</span>
                                        <span className="text-sm font-medium text-slate-900">{value}</span>
                                    </div>
                                ))}

                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setProfileView('edit')} className="btn-primary">
                                        <Settings size={16} /> Edit Profile
                                    </button>
                                    <button onClick={() => setProfileView('password')} className="btn-secondary">
                                        Change Password
                                    </button>
                                </div>
                            </div>
                        ) : profileView === 'password' ? (
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Change Password</h3>
                                <div>
                                    <label className="form-label">Current Password *</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                                        className="field-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                        className="field-input"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters with upper, lower, number & symbol.</p>
                                </div>
                                <div>
                                    <label className="form-label">Confirm New Password *</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={8}
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                        className="field-input"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={passwordLoading} className="btn-primary">
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                    <button type="button" onClick={() => {
                                        setProfileView('view')
                                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                    }} className="btn-secondary">Cancel</button>
                                </div>
                            </form>
                        ) : profileView === 'edit' ? (
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div>
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        value={profileForm.username}
                                        onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                                        className="field-input"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Phone</label>
                                    <input
                                        type="tel"
                                        value={profileForm.phone}
                                        onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                                        className="field-input"
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Age</label>
                                    <input
                                        type="number"
                                        value={profileForm.age}
                                        onChange={e => setProfileForm(f => ({ ...f, age: e.target.value }))}
                                        className="field-input"
                                        placeholder="25"
                                        min="19"
                                        max="150"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="submit" disabled={profileLoading} className="btn-primary">
                                        {profileLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button type="button" onClick={() => setProfileView('view')} className="btn-secondary">Cancel</button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                )}
            </div>

            {/* Chatbot - Render only if explicitly user role */}
            {user?.role === 'user' && <UserSupportChat />}
        </div>
    )
}
