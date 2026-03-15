import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { BedDouble, Users, MapPin, Search, Hotel, ArrowRight, Star, IndianRupee } from 'lucide-react'

export default function VisitorRoomsPage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ roomType: '', checkInDate: '', checkOutDate: '' })

    const fetchRooms = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters.roomType) params.append('roomType', filters.roomType)
            if (filters.checkInDate) params.append('checkInDate', filters.checkInDate)
            if (filters.checkOutDate) params.append('checkOutDate', filters.checkOutDate)

            const { data } = await api.get(`/public/rooms?${params.toString()}`)
            if (data.success) setRooms(data.data)
        } catch {
            toast.error('Failed to load rooms.')
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        fetchRooms()
    }, [fetchRooms])

    const handleBook = (room) => {
        if (!user) {
            toast('Please sign in to book a room', { icon: '🔑' })
            navigate('/login')
            return
        }
        if (user.role !== 'user') {
            toast.error('Only guest accounts can book rooms.')
            return
        }
        navigate('/user/book', { state: { room, checkInDate: filters.checkInDate, checkOutDate: filters.checkOutDate } })
    }

    const getRoomTypeColor = (type) => {
        switch (type) {
            case 'VIP': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'AC': return 'bg-sky-50 text-sky-700 border-sky-200'
            default: return 'bg-slate-50 text-slate-600 border-slate-200'
        }
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
                            <p className="text-xs text-slate-500">Browse & Book Rooms</p>
                        </div>
                    </Link>
                    <div className="flex items-center gap-3">
                        {user ? (
                            user.role === 'user' ? (
                                <Link to="/user/dashboard" className="btn-primary text-sm px-4 py-2.5">My Dashboard</Link>
                            ) : (
                                <Link to="/dashboard" className="btn-primary text-sm px-4 py-2.5">Staff Dashboard</Link>
                            )
                        ) : (
                            <>
                                <Link to="/login" className="btn-secondary text-sm px-4 py-2.5">Sign in</Link>
                                <Link to="/register" className="btn-primary text-sm px-4 py-2.5">Create Account</Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950 py-16 sm:py-24">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_50%)]" />
                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-primary-400">Luxury Stays</p>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-6xl">Find Your Perfect Room</h1>
                    <p className="mx-auto mt-5 max-w-xl text-base text-slate-400">Browse our collection of rooms and suites. Book your next memorable experience with us.</p>
                </div>
            </section>

            {/* Filters */}
            <div className="mx-auto -mt-8 max-w-5xl px-4 sm:px-6 relative z-10">
                <div className="rounded-[24px] bg-white p-5 shadow-float sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                            <label className="form-label">Room Type</label>
                            <select
                                value={filters.roomType}
                                onChange={(e) => setFilters(f => ({ ...f, roomType: e.target.value }))}
                                className="field-select"
                            >
                                <option value="">All Types</option>
                                <option value="AC">AC</option>
                                <option value="NON AC">NON AC</option>
                                <option value="VIP">VIP</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label">Check-in</label>
                            <input
                                type="date"
                                value={filters.checkInDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFilters(f => ({ ...f, checkInDate: e.target.value }))}
                                className="field-input"
                            />
                        </div>
                        <div>
                            <label className="form-label">Check-out</label>
                            <input
                                type="date"
                                value={filters.checkOutDate}
                                min={filters.checkInDate || new Date().toISOString().split('T')[0]}
                                onChange={(e) => setFilters(f => ({ ...f, checkOutDate: e.target.value }))}
                                className="field-input"
                            />
                        </div>
                        <div className="flex items-end">
                            <button onClick={fetchRooms} className="btn-primary w-full">
                                <Search size={16} />
                                Search
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Grid */}
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-primary-500" />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="rounded-[28px] bg-white p-12 text-center shadow-panel">
                        <BedDouble size={48} className="mx-auto text-slate-300" />
                        <p className="mt-4 text-lg font-semibold text-slate-900">No rooms available</p>
                        <p className="mt-2 text-sm text-slate-500">Try adjusting your filters or check back later.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {rooms.map((room) => (
                            <div key={room.id} className="group overflow-hidden rounded-[24px] bg-white shadow-panel transition-all duration-300 hover:shadow-float hover:-translate-y-1">
                                {/* Room Image */}
                                <div className="relative h-48 overflow-hidden bg-slate-100">
                                    {room.imageUrl ? (
                                        <img
                                            src={room.imageUrl}
                                            alt={`Room ${room.roomNumber}`}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
                                            <BedDouble size={48} className="text-slate-300" />
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3">
                                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getRoomTypeColor(room.roomType)}`}>
                                            {room.roomType}
                                        </span>
                                    </div>
                                    <div className="absolute top-3 right-3">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1 text-xs font-semibold text-slate-700">
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            4.8
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Room {room.roomNumber}</h3>
                                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><MapPin size={12} />Floor {room.floorNumber}</span>
                                                <span className="flex items-center gap-1"><Users size={12} />Up to {room.capacity}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="flex items-center text-xl font-bold text-slate-900"><IndianRupee size={16} />{room.pricePerNight.toLocaleString()}</p>
                                            <p className="text-[11px] text-slate-400">per night</p>
                                        </div>
                                    </div>

                                    {room.description && (
                                        <p className="mt-3 line-clamp-2 text-sm text-slate-500">{room.description}</p>
                                    )}

                                    <button
                                        onClick={() => handleBook(room)}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        Book Now
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
