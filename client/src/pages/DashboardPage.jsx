import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
    BedDouble,
    CalendarCheck,
    CalendarRange,
    CheckCircle2,
    DoorOpen,
    RefreshCw,
    Users,
    Wrench,
    XCircle,
} from 'lucide-react'
import { format } from 'date-fns'

const STATUS_STYLES = {
    available: {
        pill: 'bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
    },
    confirmed: {
        pill: 'bg-sky-50 text-sky-700',
        dot: 'bg-sky-500',
    },
    booked: {
        pill: 'bg-sky-50 text-sky-700',
        dot: 'bg-sky-500',
    },
    occupied: {
        pill: 'bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
    },
    cancelled: {
        pill: 'bg-rose-50 text-rose-700',
        dot: 'bg-rose-500',
    },
    maintenance: {
        pill: 'bg-rose-50 text-rose-700',
        dot: 'bg-rose-500',
    },
    completed: {
        pill: 'bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
    },
    cleaning: {
        pill: 'bg-violet-50 text-violet-700',
        dot: 'bg-violet-500',
    },
}

function formatStatus(status) {
    return status
        ?.replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

const StatusBadge = ({ status }) => {
    const tone = STATUS_STYLES[status] || {
        pill: 'bg-slate-100 text-slate-700',
        dot: 'bg-slate-500',
    }

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${tone.pill}`}>
            <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
            {formatStatus(status)}
        </span>
    )
}

const MetricCard = ({ label, value, icon: Icon, iconClass }) => (
    <div className="stat-card rounded-[32px] border border-white/70 bg-white/95 p-6 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.35)]">
        <div className="flex min-h-[168px] flex-col">
            <div className="flex items-start justify-between gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-500">{label}</p>
                <div className={`flex h-12 w-12 items-center justify-center rounded-[20px] shadow-[0_18px_30px_-22px_rgba(15,23,42,0.45)] ${iconClass}`}>
                    <Icon size={18} />
                </div>
            </div>

            <div className="flex flex-1 items-center justify-center">
                <p className="text-center text-5xl font-extrabold tracking-[-0.08em] text-slate-900">{value}</p>
            </div>
        </div>
    </div>
)

export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = async () => {
        setLoading(true)
        try {
            const res = await api.get('/dashboard/stats')
            setStats(res.data.data)
        } catch {
            toast.error('Failed to load dashboard statistics.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-panel">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                    <span className="text-sm font-medium text-slate-500">Loading dashboard...</span>
                </div>
            </div>
        )
    }

    const { rooms, bookings, recentBookings } = stats || {}

    const overviewCards = [
        {
            label: 'Total Rooms',
            value: rooms?.total ?? 0,
            icon: BedDouble,
            iconClass: 'bg-sky-500 text-white',
        },
        {
            label: 'Available Rooms',
            value: rooms?.available ?? 0,
            icon: DoorOpen,
            iconClass: 'bg-emerald-500 text-white',
        },
        {
            label: 'Occupied Rooms',
            value: rooms?.occupied ?? 0,
            icon: Users,
            iconClass: 'bg-amber-500 text-white',
        },
        {
            label: 'Maintenance',
            value: rooms?.maintenance ?? 0,
            icon: Wrench,
            iconClass: 'bg-rose-500 text-white',
        },
        {
            label: 'Active Bookings',
            value: bookings?.active ?? 0,
            icon: CalendarCheck,
            iconClass: 'bg-blue-500 text-white',
        },
        {
            label: 'Completed',
            value: bookings?.completed ?? 0,
            icon: CheckCircle2,
            iconClass: 'bg-teal-500 text-white',
        },
        {
            label: 'Cancelled',
            value: bookings?.cancelled ?? 0,
            icon: XCircle,
            iconClass: 'bg-slate-400 text-white',
        },
        {
            label: 'Total Bookings',
            value: bookings?.total ?? 0,
            icon: CalendarRange,
            iconClass: 'bg-violet-500 text-white',
        },
    ]

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <h1 className="page-title mt-0">Dashboard</h1>
                    <p className="page-subtitle mt-2">Hotel overview at a glance</p>
                </div>
                <button onClick={fetchStats} className="btn-secondary">
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
                    <MetricCard key={card.label} {...card} />
                ))}
            </div>

            <section className="section-card overflow-hidden rounded-[32px]">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-6 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-slate-900">Recent Bookings</h2>
                    <Link to="/bookings" className="text-sm font-semibold text-primary-600 transition-colors hover:text-primary-700">
                        View all
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    {recentBookings?.length === 0 ? (
                        <p className="px-6 py-16 text-center text-sm text-slate-500">No recent bookings found.</p>
                    ) : (
                        <table className="data-table min-w-[720px]">
                            <thead>
                                <tr>
                                    <th>Guest</th>
                                    <th>Room</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentBookings?.map((booking) => (
                                    <tr key={booking.id} className="table-row-hover">
                                        <td>
                                            <p className="text-sm font-semibold text-slate-900">{booking.guestName}</p>
                                        </td>
                                        <td>
                                            <p className="text-sm font-semibold text-slate-900">{booking.room?.roomNumber ? `Room ${booking.room.roomNumber}` : 'Unassigned'}</p>
                                        </td>
                                        <td>
                                            <p className="text-sm font-semibold text-slate-900">{format(new Date(booking.checkInDate), 'dd MMM yyyy')}</p>
                                        </td>
                                        <td>
                                            <p className="text-sm font-semibold text-slate-900">{format(new Date(booking.checkOutDate), 'dd MMM yyyy')}</p>
                                        </td>
                                        <td>
                                            <StatusBadge status={booking.bookingStatus} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    )
}
