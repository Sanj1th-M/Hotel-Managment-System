import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { Filter, CalendarCheck, PlusCircle } from 'lucide-react'

const StatusBadge = ({ status }) => (
    <span className={`badge-${status} inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize`}>
        {status}
    </span>
)

const STATUSES = ['Pending', 'confirmed', 'cancelled', 'completed']

export default function BookingManagementPage() {
    const { isAdmin } = useAuth()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState({
        guestName: '',
        guestPhone: '',
        roomNumber: '',
        status: '',
        startDate: '',
        endDate: '',
    })

    const fetchBookings = useCallback(async () => {
        setLoading(true)
        try {
            const params = { page, limit: 15 }
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params[key] = value
            })
            const res = await api.get('/bookings', { params })
            setBookings(res.data.data)
            setTotal(res.data.total)
        } catch {
            toast.error('Failed to load bookings.')
        } finally {
            setLoading(false)
        }
    }, [filters, page])

    useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

    const updateFilter = (key, value) => {
        setFilters((current) => ({ ...current, [key]: value }))
        setPage(1)
    }

    const clearFilters = () => {
        setFilters({ guestName: '', guestPhone: '', roomNumber: '', status: '', startDate: '', endDate: '' })
        setPage(1)
    }

    const cancelBooking = async (id) => {
        if (!window.confirm('Cancel this booking?')) return
        try {
            await api.put(`/bookings/admin/update-booking-status/${id}`, { bookingStatus: 'cancelled' })
            toast.success('Booking cancelled.')
            fetchBookings()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cancel failed.')
        }
    }

    const confirmBooking = async (id) => {
        if (!window.confirm('Confirm this booking?')) return
        try {
            await api.put(`/bookings/admin/update-booking-status/${id}`, { bookingStatus: 'confirmed' })
            toast.success('Booking confirmed.')
            fetchBookings()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Confirm failed.')
        }
    }

    const completeBooking = async (id) => {
        if (!window.confirm('Mark this booking as completed?')) return
        try {
            await api.put(`/bookings/admin/update-booking-status/${id}`, { bookingStatus: 'completed' })
            toast.success('Booking marked as completed.')
            fetchBookings()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed.')
        }
    }

    const deleteBooking = async (id) => {
        if (!window.confirm('Permanently delete this booking?')) return
        try {
            await api.delete(`/bookings/${id}`)
            toast.success('Booking deleted.')
            fetchBookings()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed.')
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / 15))
    const currentPageCounts = [
        { label: 'This page', value: bookings.length },
        { label: 'Confirmed', value: bookings.filter((booking) => booking.bookingStatus === 'confirmed').length },
        { label: 'Completed', value: bookings.filter((booking) => booking.bookingStatus === 'completed').length },
        { label: 'Cancelled', value: bookings.filter((booking) => booking.bookingStatus === 'cancelled').length },
    ]

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <p className="page-kicker"></p>
                    <h1 className="page-title">Booking Management</h1>
                    <p className="page-subtitle">
                    Manage reservations and guest details in a structured interface.
                    </p>
                </div>

                <Link to="/bookings/new" className="btn-primary">
                    <PlusCircle size={16} />
                    New booking
                </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {currentPageCounts.map((item, index) => (
                    <div key={item.label} className="stat-card">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{item.label}</p>
                                <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${index === 0 ? 'bg-slate-900 text-white' : 'bg-primary-50 text-primary-700'}`}>
                                <CalendarCheck size={18} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <section className="section-card p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <Filter size={16} className="text-primary-600" />
                            Refine reservations
                        </div>
                        <p className="mt-2 text-sm text-slate-500">Use guest, room, and date filters to narrow the reservation list instantly.</p>
                    </div>
                    <button onClick={clearFilters} className="btn-ghost self-start text-primary-700 hover:bg-primary-50 hover:text-primary-800">
                        Clear filters
                    </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input value={filters.guestName} onChange={(event) => updateFilter('guestName', event.target.value)} placeholder="Guest name" className="field-input xl:col-span-1" />
                    <input value={filters.guestPhone} onChange={(event) => updateFilter('guestPhone', event.target.value)} placeholder="Phone" className="field-input xl:col-span-1" />
                    <input value={filters.roomNumber} onChange={(event) => updateFilter('roomNumber', event.target.value)} placeholder="Room #" type="number" className="field-input xl:col-span-1" />
                    <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} className="field-select xl:col-span-1">
                        <option value="">All status</option>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </option>
                        ))}
                    </select>
                    <input value={filters.startDate} onChange={(event) => updateFilter('startDate', event.target.value)} type="date" className="field-input xl:col-span-1" />
                    <input value={filters.endDate} onChange={(event) => updateFilter('endDate', event.target.value)} type="date" className="field-input xl:col-span-1" />
                </div>
            </section>

            <section className="section-card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-hotel-line px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reservation ledger</p>
                        <h2 className="mt-2 text-xl font-bold text-slate-900">{total} booking{total !== 1 ? 's' : ''} found</h2>
                    </div>
                    <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="py-16 text-center">
                        <CalendarCheck size={44} className="mx-auto text-slate-300" />
                        <p className="mt-4 text-sm text-slate-500">No bookings found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Booking ID</th>
                                    <th>Guest</th>
                                    <th>Room</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="table-row-hover">
                                        <td>
                                            <span className="rounded-full bg-primary-50 px-3 py-1 font-mono text-xs font-semibold text-primary-700">#{booking.id}</span>
                                        </td>
                                        <td>
                                            <p className="font-semibold text-slate-900">{booking.guestName}</p>
                                            <p className="mt-1 text-xs text-slate-500">{booking.guestPhone}</p>
                                        </td>
                                        <td className="text-sm text-slate-600">
                                            Room {booking.room?.roomNumber}
                                            <span className="ml-1 text-slate-400">({booking.room?.roomType})</span>
                                        </td>
                                        <td className="text-sm text-slate-600">{format(new Date(booking.checkInDate), 'dd MMM yy')}</td>
                                        <td className="text-sm text-slate-600">{format(new Date(booking.checkOutDate), 'dd MMM yy')}</td>
                                        <td className="text-sm font-semibold text-slate-900">₹{booking.totalPrice?.toFixed(2)}</td>
                                        <td><StatusBadge status={booking.bookingStatus} /></td>
                                        <td>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Link to={`/bookings/${booking.id}`} className="btn-ghost border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-100">
                                                    View
                                                </Link>
                                                {booking.bookingStatus === 'Pending' && isAdmin && (
                                                    <button onClick={() => confirmBooking(booking.id)} className="btn-ghost border border-emerald-200 px-3 py-2 text-emerald-700 hover:bg-emerald-50">
                                                        Confirm
                                                    </button>
                                                )}
                                                {(booking.bookingStatus === 'Pending' || booking.bookingStatus === 'confirmed') && (
                                                    <>
                                                        {booking.bookingStatus === 'confirmed' && isAdmin && (
                                                            <button onClick={() => completeBooking(booking.id)} className="btn-ghost border border-emerald-200 px-3 py-2 text-emerald-700 hover:bg-emerald-50">
                                                                Complete
                                                            </button>
                                                        )}
                                                        <button onClick={() => cancelBooking(booking.id)} className="btn-ghost border border-amber-200 px-3 py-2 text-amber-700 hover:bg-amber-50">
                                                            Cancel
                                                        </button>
                                                    </>
                                                )}
                                                {isAdmin && (
                                                    <button onClick={() => deleteBooking(booking.id)} className="btn-ghost border border-rose-200 px-3 py-2 text-rose-700 hover:bg-rose-50">
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {total > 15 && (
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="btn-secondary">
                        Prev
                    </button>
                    <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="btn-secondary">
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
