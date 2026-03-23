import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '../services/api'
import toast from 'react-hot-toast'
import { CalendarCheck, BedDouble, ArrowLeft, Sparkles } from 'lucide-react'
import { format, differenceInCalendarDays } from 'date-fns'

const pad = (value) => String(value).padStart(2, '0')
const toLocalDatetimeStr = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
const defaultCheckIn = (() => { const date = new Date(); date.setHours(14, 0, 0, 0); return toLocalDatetimeStr(date) })()
const defaultCheckOut = (() => { const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(12, 0, 0, 0); return toLocalDatetimeStr(date) })()

const getMinCheckOut = (checkInStr) => {
    if (!checkInStr) return defaultCheckIn
    const date = new Date(checkInStr)
    if (Number.isNaN(date.getTime())) return defaultCheckIn
    date.setDate(date.getDate() + 1)
    return toLocalDatetimeStr(date)
}

const bookingSchema = z.object({
    checkInDatetime: z.string().min(1, 'Check-in date and time required'),
    checkOutDatetime: z.string().min(1, 'Check-out date and time required'),
    roomId: z.string().min(1, 'Please select a room'),
    guestName: z.string().min(2, 'Guest name required').max(100),
    guestPhone: z.string().min(7, 'Valid phone required').max(20),
    guestEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    notes: z.string().max(500).optional(),
}).refine((data) => {
    const checkIn = new Date(data.checkInDatetime)
    const checkOut = new Date(data.checkOutDatetime)
    return !Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn
}, {
    message: 'Check-out must be after check-in',
    path: ['checkOutDatetime'],
})

export default function CreateBookingPage() {
    const navigate = useNavigate()
    const [availableRooms, setAvailableRooms] = useState([])
    const [loadingRooms, setLoadingRooms] = useState(false)
    const [selectedRoom, setSelectedRoom] = useState(null)

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            checkInDatetime: defaultCheckIn,
            checkOutDatetime: defaultCheckOut,
        },
    })

    const checkInDatetime = watch('checkInDatetime')
    const checkOutDatetime = watch('checkOutDatetime')
    const roomId = watch('roomId')

    useEffect(() => {
        const checkInDate = checkInDatetime ? new Date(checkInDatetime) : null
        const checkOutDate = checkOutDatetime ? new Date(checkOutDatetime) : null

        if (!checkInDate || !checkOutDate || Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
            setAvailableRooms([])
            setSelectedRoom(null)
            return
        }

        const fetchAvailableRooms = async () => {
            setLoadingRooms(true)
            try {
                const res = await api.get('/rooms/available', {
                    params: {
                        checkInDate: checkInDatetime.split('T')[0],
                        checkOutDate: checkOutDatetime.split('T')[0],
                    },
                })
                setAvailableRooms(res.data.data)
            } catch {
                toast.error('Failed to fetch available rooms.')
            } finally {
                setLoadingRooms(false)
            }
        }

        fetchAvailableRooms()
    }, [checkInDatetime, checkOutDatetime])

    useEffect(() => {
        if (roomId) {
            const room = availableRooms.find((item) => String(item.id) === roomId)
            setSelectedRoom(room || null)
        }
    }, [roomId, availableRooms])

    const checkInDate = checkInDatetime ? new Date(checkInDatetime) : null
    const checkOutDate = checkOutDatetime ? new Date(checkOutDatetime) : null
    const validDates = checkInDate && checkOutDate && !Number.isNaN(checkInDate.getTime()) && !Number.isNaN(checkOutDate.getTime())
    const nights = validDates && checkOutDate > checkInDate ? differenceInCalendarDays(checkOutDate, checkInDate) : 0
    const totalPrice = selectedRoom ? nights * (parseFloat(selectedRoom.price_per_night) || 0) : 0

    const onSubmit = async (data) => {
        try {
            const res = await api.post('/bookings', {
                ...data,
                checkInDate: new Date(data.checkInDatetime).toISOString(),
                checkOutDate: new Date(data.checkOutDatetime).toISOString(),
                guestEmail: data.guestEmail || undefined,
            })
            toast.success('Booking created successfully!')
            navigate(`/bookings/${res.data.data.id}`)
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create booking.')
        }
    }

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <p className="page-kicker"></p>
                    <h1 className="page-title">New Reservation</h1>
                    <p className="page-subtitle">
                        Select the stay window, review availability, and capture guest details in a cleaner reservation flow.
                    </p>
                </div>

                <button onClick={() => navigate('/bookings')} className="btn-secondary">
                    <ArrowLeft size={16} />
                    Back to bookings
                </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <section className="section-card p-6 sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                                <CalendarCheck size={18} />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Choose timing</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900"></h2>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="form-label">Check-in</label>
                                <input {...register('checkInDatetime')} type="datetime-local" min={defaultCheckIn} className={`field-input ${errors.checkInDatetime ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />
                                {errors.checkInDatetime && <p className="mt-2 text-sm text-red-500">{errors.checkInDatetime.message}</p>}
                            </div>
                            <div>
                                <label className="form-label">Check-out</label>
                                <input {...register('checkOutDatetime')} type="datetime-local" min={getMinCheckOut(checkInDatetime)} className={`field-input ${errors.checkOutDatetime ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />
                                {errors.checkOutDatetime && <p className="mt-2 text-sm text-red-500">{errors.checkOutDatetime.message}</p>}
                            </div>
                        </div>
                    </section>

                    <section className="section-card p-6 sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                                <BedDouble size={18} />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Room selection</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900"></h2>
                            </div>
                        </div>

                        <div className="mt-6">
                            {!checkInDatetime || !checkOutDatetime || new Date(checkOutDatetime) <= new Date(checkInDatetime) ? (
                                <p className="rounded-2xl border border-dashed border-hotel-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    Please select valid check-in and check-out dates first.
                                </p>
                            ) : loadingRooms ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-hotel-line bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                                    Loading available rooms...
                                </div>
                            ) : availableRooms.length === 0 ? (
                                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-700">
                                    No rooms are available for these dates.
                                </p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {availableRooms.map((room) => {
                                        const selected = roomId === String(room.id)

                                        return (
                                            <label
                                                key={String(room.id)}
                                                className={`flex cursor-pointer items-start gap-4 flex-col sm:flex-row rounded-[24px] border p-5 transition-all duration-200 ${selected
                                                    ? 'border-primary-500 bg-primary-50 shadow-panel'
                                                    : 'border-hotel-line bg-white hover:border-primary-200 hover:bg-primary-50/40'
                                                    }`}
                                            >
                                                <div className="flex w-full sm:w-auto items-start gap-4">
                                                    <input {...register('roomId')} type="radio" value={String(room.id)} className="field-check mt-1 h-4 w-4 shrink-0" />
                                                    {room.image_url ? (
                                                        <img
                                                            src={room.image_url}
                                                            alt={`Room ${room.room_number}`}
                                                            className="h-20 w-28 shrink-0 rounded-xl object-cover shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-slate-100/50 text-slate-400">
                                                            <BedDouble size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1 w-full mt-2 sm:mt-0">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <p className="text-base font-semibold text-slate-900">Room {room.room_number}</p>
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                                                            {room.room_type}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        Floor {room.floor_number} | {room.capacity} guests | <span className="font-semibold text-primary-700">₹{room.price_per_night}/night</span>
                                                    </p>
                                                    {room.description && <p className="mt-2 text-sm text-slate-500">{room.description}</p>}
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                            {errors.roomId && <p className="mt-3 text-sm text-red-500">{errors.roomId.message}</p>}
                        </div>
                    </section>

                    <section className="section-card p-6 sm:p-7">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                                <Sparkles size={18} />
                            </span>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Guest details</p>
                                <h2 className="mt-1 text-xl font-bold text-slate-900"></h2>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="form-label">Full name</label>
                                <input {...register('guestName')} placeholder="John Doe" className={`field-input ${errors.guestName ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />
                                {errors.guestName && <p className="mt-2 text-sm text-red-500">{errors.guestName.message}</p>}
                            </div>
                            <div>
                                <label className="form-label">Phone number</label>
                                <input {...register('guestPhone')} placeholder="+1 555 000 0000" className={`field-input ${errors.guestPhone ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />
                                {errors.guestPhone && <p className="mt-2 text-sm text-red-500">{errors.guestPhone.message}</p>}
                            </div>
                            <div>
                                <label className="form-label">Email</label>
                                <input {...register('guestEmail')} type="email" placeholder="guest@email.com" className="field-input" />
                                {errors.guestEmail && <p className="mt-2 text-sm text-red-500">{errors.guestEmail.message}</p>}
                            </div>
                            <div>
                                <label className="form-label">Notes</label>
                                <textarea {...register('notes')} rows={4} placeholder="Special requests, arrival notes, or stay preferences" className="field-textarea" />
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
                    <section className="section-card-soft p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Reservation summary</p>
                        <h2 className="mt-3 text-2xl font-bold text-slate-900">Booking snapshot</h2>

                        <div className="mt-6 space-y-4 text-sm text-slate-600">
                            <div className="rounded-2xl border border-hotel-line bg-white px-4 py-4 shadow-panel">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Check-in</p>
                                <p className="mt-2 font-semibold text-slate-900">{validDates ? format(checkInDate, 'dd MMM yyyy, hh:mm a') : 'Select dates'}</p>
                            </div>
                            <div className="rounded-2xl border border-hotel-line bg-white px-4 py-4 shadow-panel">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Check-out</p>
                                <p className="mt-2 font-semibold text-slate-900">{validDates ? format(checkOutDate, 'dd MMM yyyy, hh:mm a') : 'Select dates'}</p>
                            </div>
                            <div className="rounded-2xl border border-hotel-line bg-white px-4 py-4 shadow-panel">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected room</p>
                                <p className="mt-2 font-semibold text-slate-900">{selectedRoom ? `Room ${selectedRoom.room_number} - ${selectedRoom.room_type}` : 'Choose a room'}</p>
                                {selectedRoom && <p className="mt-2 text-sm text-slate-500">Floor {selectedRoom.floor_number} | {selectedRoom.capacity} guests</p>}
                            </div>
                        </div>

                        <div className="mt-6 rounded-[24px] bg-slate-900 p-5 text-white">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Estimated total</p>
                            <div className="mt-3 flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-3xl font-bold">₹{totalPrice.toFixed(2)}</p>
                                    <p className="mt-2 text-sm text-white/70">{nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Pick valid dates'}</p>
                                </div>
                                {selectedRoom && <p className="text-sm text-white/70">₹{selectedRoom.price_per_night}/night</p>}
                            </div>
                        </div>
                    </section>

                    <section className="section-card p-5">
                        <div className="flex flex-col gap-3">
                            <button type="submit" disabled={isSubmitting || !selectedRoom} className="btn-primary w-full">
                                {isSubmitting ? 'Creating booking...' : `Confirm booking${totalPrice ? ` - ₹${totalPrice.toFixed(2)}` : ''}`}
                            </button>
                            <button type="button" onClick={() => navigate('/bookings')} className="btn-secondary w-full">
                                Cancel
                            </button>
                        </div>
                    </section>
                </aside>
            </form>
        </div>
    )
}

