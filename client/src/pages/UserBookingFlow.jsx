import { useState, useEffect } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
    Hotel, BedDouble, Users, MapPin, CalendarCheck, IndianRupee,
    ArrowLeft, CreditCard, CheckCircle, Download, ArrowRight
} from 'lucide-react'



export default function UserBookingFlow() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [step, setStep] = useState('details') // details | success
    const [loading, setLoading] = useState(false)
    const [bookingResult, setBookingResult] = useState(null)

    const room = location.state?.room
    const initialCheckIn = location.state?.checkInDate || ''
    const initialCheckOut = location.state?.checkOutDate || ''

    const [form, setForm] = useState({
        guestName: user?.username || '',
        guestPhone: user?.phone || '',
        guestEmail: user?.email || '',
        persons: 1,
        checkInDate: initialCheckIn,
        checkOutDate: initialCheckOut,
    })

    useEffect(() => {
        if (!room) {
            navigate('/rooms/browse')
        }
    }, [room, navigate])

    if (!room) return null

    const nights = form.checkInDate && form.checkOutDate
        ? Math.max(1, Math.ceil((new Date(form.checkOutDate) - new Date(form.checkInDate)) / (1000 * 60 * 60 * 24)))
        : 0
    const totalPrice = nights * room.pricePerNight

    const handleBookRoom = async () => {
        if (!form.checkInDate || !form.checkOutDate) {
            toast.error('Please select check-in and check-out dates.')
            return
        }
        if (new Date(form.checkOutDate) <= new Date(form.checkInDate)) {
            toast.error('Check-out must be after check-in.')
            return
        }
        if (!form.guestName.trim()) {
            toast.error('Please enter guest name.')
            return
        }
        if (!form.guestPhone.trim()) {
            toast.error('Please enter phone number.')
            return
        }
        if (form.persons < 1 || form.persons > room.capacity) {
            toast.error(`Persons must be between 1 and ${room.capacity}.`)
            return
        }

        setLoading(true)
        try {
            const { data } = await api.post('/bookings/book-room', {
                roomId: room.id,
                checkInDate: form.checkInDate,
                checkOutDate: form.checkOutDate,
                persons: parseInt(form.persons),
                guestName: form.guestName.trim(),
                guestPhone: form.guestPhone.trim(),
                guestEmail: form.guestEmail || null,
            })

            if (data.success) {
                setBookingResult({
                    booking: data.data
                })
                setStep('success')
                toast.success('Room booked successfully! Awaiting confirmation.')
            } else {
                toast.error(data.message || 'Failed to book room.')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Booking failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadReceipt = async () => {
        if (!bookingResult?.booking?.id) return
        try {
            const response = await api.get(`/users/bookings/${bookingResult.booking.id}/receipt`, { responseType: 'blob' })
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `receipt_booking_${bookingResult.booking.id}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('Receipt downloaded!')
        } catch {
            toast.error('Failed to download receipt.')
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
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Hotel Management</p>
                            <p className="text-xs text-slate-500">Complete Your Booking</p>
                        </div>
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
                {step === 'details' && (
                    <>
                        <button onClick={() => navigate(-1)} className="btn-ghost mb-4">
                            <ArrowLeft size={16} /> Back to rooms
                        </button>

                        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                            {/* Booking Form */}
                            <div className="section-card p-6 sm:p-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-6">Booking Details</h2>

                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="form-label">Guest Name *</label>
                                            <input
                                                type="text"
                                                value={form.guestName}
                                                onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                                                className="field-input"
                                                placeholder="Your full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Phone *</label>
                                            <input
                                                type="tel"
                                                value={form.guestPhone}
                                                onChange={e => setForm(f => ({ ...f, guestPhone: e.target.value }))}
                                                className="field-input"
                                                placeholder="+91 98765 43210"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            value={form.guestEmail}
                                            onChange={e => setForm(f => ({ ...f, guestEmail: e.target.value }))}
                                            className="field-input"
                                            placeholder="guest@example.com"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div>
                                            <label className="form-label">Check-in *</label>
                                            <input
                                                type="date"
                                                value={form.checkInDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                onChange={e => setForm(f => ({ ...f, checkInDate: e.target.value }))}
                                                className="field-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Check-out *</label>
                                            <input
                                                type="date"
                                                value={form.checkOutDate}
                                                min={form.checkInDate || new Date().toISOString().split('T')[0]}
                                                onChange={e => setForm(f => ({ ...f, checkOutDate: e.target.value }))}
                                                className="field-input"
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label">Guests</label>
                                            <input
                                                type="number"
                                                value={form.persons}
                                                min={1}
                                                max={room.capacity}
                                                onChange={e => setForm(f => ({ ...f, persons: parseInt(e.target.value) || 1 }))}
                                                className="field-input"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="section-card p-6 h-fit lg:sticky lg:top-24">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h3>

                                <div className="flex items-center gap-3 mb-4">
                                    {room.imageUrl ? (
                                        <img src={room.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                                    ) : (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                                            <BedDouble size={20} className="text-slate-400" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-slate-900">Room {room.roomNumber}</p>
                                        <p className="text-xs text-slate-500">{room.roomType} • Floor {room.floorNumber}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-hotel-line pt-4 text-sm">
                                    <div className="flex justify-between text-slate-500">
                                        <span className="flex items-center gap-1"><IndianRupee size={12} />{room.pricePerNight.toLocaleString()} × {nights} night{nights !== 1 ? 's' : ''}</span>
                                        <span className="flex items-center"><IndianRupee size={12} />{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-slate-900 border-t border-hotel-line pt-2 text-base">
                                        <span>Total</span>
                                        <span className="flex items-center"><IndianRupee size={16} />{totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBookRoom}
                                    disabled={loading || nights === 0}
                                    className="btn-primary mt-5 w-full justify-center"
                                >
                                    {loading ? (
                                        <>
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CalendarCheck size={16} />
                                            Book Room
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === 'success' && bookingResult && (
                    <div className="mx-auto max-w-lg">
                        <div className="section-card p-8 text-center">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                                <CheckCircle size={32} className="text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Booking Confirmed!</h2>
                            <p className="mt-2 text-sm text-slate-500">Your room has been successfully booked. A confirmation has been recorded.</p>

                            <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-left space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Booking ID</span>
                                    <span className="font-semibold text-slate-900">#{bookingResult.booking.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Room</span>
                                    <span className="font-semibold text-slate-900">{bookingResult.booking.room?.roomNumber || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Total Amount</span>
                                    <span className="flex items-center font-bold text-slate-900"><IndianRupee size={14} />{bookingResult.booking.totalPrice?.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <button onClick={handleDownloadReceipt} className="btn-primary w-full justify-center">
                                    <Download size={16} />
                                    Download Receipt
                                </button>
                                <Link to="/user/dashboard" className="btn-secondary w-full justify-center">
                                    Go to Dashboard
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
