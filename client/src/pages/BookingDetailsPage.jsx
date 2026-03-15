import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { ArrowLeft, CalendarCheck, BedDouble, User, Phone, Mail, FileText, Clock } from 'lucide-react'

const StatusBadge = ({ status }) => (
    <span className={`badge-${status} inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize`}>
        {status}
    </span>
)

const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 rounded-2xl border border-hotel-line bg-slate-50/80 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-primary-700 shadow-panel">
            <Icon size={17} />
        </div>
        <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{value || 'Not provided'}</p>
        </div>
    </div>
)

export default function BookingDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { isAdmin } = useAuth()
    const [booking, setBooking] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                const res = await api.get(`/bookings/${id}`)
                setBooking(res.data.data)
            } catch {
                toast.error('Booking not found.')
                navigate('/bookings')
            } finally {
                setLoading(false)
            }
        }

        fetchBooking()
    }, [id, navigate])

    const updateStatus = async (bookingStatus) => {
        const labels = { cancelled: 'Cancel', completed: 'Mark as completed' }
        if (!window.confirm(`${labels[bookingStatus] || 'Update'} this booking?`)) return

        try {
            const res = await api.put(`/bookings/${id}`, { bookingStatus })
            setBooking(res.data.data)
            toast.success('Booking updated.')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed.')
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex items-center gap-3 rounded-full border border-hotel-line bg-white px-5 py-3 shadow-panel">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                    <span className="text-sm font-medium text-slate-500">Loading booking details...</span>
                </div>
            </div>
        )
    }

    if (!booking) return null

    const nights = Math.ceil((new Date(booking.checkOutDate) - new Date(booking.checkInDate)) / (1000 * 60 * 60 * 24))

    return (
        <div className="page-shell">
            <button onClick={() => navigate(-1)} className="btn-ghost w-fit rounded-full border border-hotel-line bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
                <ArrowLeft size={16} />
                Back to bookings
            </button>

            <section className="section-card-soft p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <p className="page-kicker">Booking profile</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Booking #{booking.id}</h1>
                            <StatusBadge status={booking.bookingStatus} />
                        </div>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                            A single view of the guest stay, room assignment, and operational timeline for this reservation.
                        </p>
                    </div>

                    {booking.bookingStatus === 'confirmed' && (
                        <div className="flex flex-col gap-3 sm:flex-row">
                            {isAdmin && (
                                <button onClick={() => updateStatus('completed')} className="btn-secondary border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                    Mark completed
                                </button>
                            )}
                            <button onClick={() => updateStatus('cancelled')} className="btn-secondary border-amber-200 text-amber-700 hover:bg-amber-50">
                                Cancel booking
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-panel">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guest</p>
                        <p className="mt-3 text-2xl font-bold text-slate-900">{booking.guestName}</p>
                        <p className="mt-2 text-sm text-slate-500">Primary reservation holder</p>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-panel">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Room</p>
                        <p className="mt-3 text-2xl font-bold text-slate-900">{booking.room?.roomNumber}</p>
                        <p className="mt-2 text-sm text-slate-500">{booking.room?.roomType} on floor {booking.room?.floorNumber}</p>
                    </div>
                    <div className="rounded-[24px] border border-white/80 bg-white/95 p-5 shadow-panel">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total value</p>
                        <p className="mt-3 text-2xl font-bold text-slate-900">${booking.totalPrice?.toFixed(2)}</p>
                        <p className="mt-2 text-sm text-slate-500">{nights} night{nights > 1 ? 's' : ''} booked</p>
                    </div>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="section-card p-6">
                    <h2 className="text-xl font-bold text-slate-900">Guest information</h2>
                    <div className="mt-5 space-y-4">
                        <InfoRow icon={User} label="Full name" value={booking.guestName} />
                        <InfoRow icon={Phone} label="Phone" value={booking.guestPhone} />
                        <InfoRow icon={Mail} label="Email" value={booking.guestEmail} />
                        <InfoRow icon={FileText} label="Notes" value={booking.notes} />
                    </div>
                </section>

                <section className="section-card p-6">
                    <h2 className="text-xl font-bold text-slate-900">Room details</h2>
                    <div className="mt-5 space-y-4">
                        <InfoRow icon={BedDouble} label="Room number" value={`Room ${booking.room?.roomNumber}`} />
                        <InfoRow icon={BedDouble} label="Room type" value={booking.room?.roomType} />
                        <InfoRow icon={BedDouble} label="Floor" value={`Floor ${booking.room?.floorNumber}`} />
                        <InfoRow icon={User} label="Capacity" value={`${booking.room?.capacity} guests`} />
                    </div>
                </section>

                <section className="section-card p-6">
                    <h2 className="text-xl font-bold text-slate-900">Stay information</h2>
                    <div className="mt-5 space-y-4">
                        <InfoRow icon={CalendarCheck} label="Check-in" value={format(new Date(booking.checkInDate), 'EEEE, dd MMMM yyyy')} />
                        <InfoRow icon={CalendarCheck} label="Check-out" value={format(new Date(booking.checkOutDate), 'EEEE, dd MMMM yyyy')} />
                        <InfoRow icon={CalendarCheck} label="Duration" value={`${nights} night${nights > 1 ? 's' : ''}`} />
                    </div>
                    <div className="mt-5 rounded-[24px] bg-slate-900 p-5 text-white">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Billing</p>
                        <div className="mt-3 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-3xl font-bold">${booking.totalPrice?.toFixed(2)}</p>
                                <p className="mt-2 text-sm text-white/70">{nights} night{nights > 1 ? 's' : ''} x ${booking.room?.pricePerNight}/night</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section-card p-6">
                    <h2 className="text-xl font-bold text-slate-900">Record history</h2>
                    <div className="mt-5 space-y-4">
                        <InfoRow icon={User} label="Created by" value={`${booking.createdBy?.username} (${booking.createdBy?.role})`} />
                        <InfoRow icon={Clock} label="Created at" value={booking.createdAt ? format(new Date(booking.createdAt), 'dd MMM yyyy, HH:mm') : 'Unknown'} />
                        <InfoRow icon={Clock} label="Last updated" value={booking.updatedAt ? format(new Date(booking.updatedAt), 'dd MMM yyyy, HH:mm') : 'Never'} />
                    </div>
                </section>
            </div>
        </div>
    )
}
