import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, X, BedDouble, DoorOpen, Users, Wrench } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import ImageUpload from '../components/ImageUpload'

const roomSchema = z.object({
    roomNumber: z.coerce.number().int().min(1, 'Required'),
    roomType: z.enum(['AC', 'NON AC', 'VIP']),
    pricePerNight: z.coerce.number().min(0, 'Required'),
    floorNumber: z.coerce.number().int().min(1, 'Required'),
    capacity: z.coerce.number().int().min(1).max(10),
    status: z.enum(['available', 'booked', 'occupied', 'maintenance', 'cleaning']).optional(),
    description: z.string().max(500).optional(),
})

const ROOM_TYPES = ['AC', 'NON AC', 'VIP']
const STATUSES = ['available', 'booked', 'occupied', 'maintenance', 'cleaning']
const ROOM_MEDIA_MAX_BYTES = 5 * 1024 * 1024
const ROOM_MEDIA_ALLOWED_TYPES = new Set(['image/jpeg', 'image/png'])
const ROOM_MEDIA_ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png'])
const ROOM_MEDIA_EXTENSION_BY_TYPE = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
}

const STATUS_STYLES = {
    available: {
        pill: 'bg-emerald-50',
        dot: 'bg-emerald-500',
        icon: 'bg-emerald-50 text-emerald-600',
        label: 'Available',
    },
    booked: {
        pill: 'bg-sky-50',
        dot: 'bg-sky-500',
        icon: 'bg-sky-50 text-sky-600',
        label: 'Booked',
    },
    occupied: {
        pill: 'bg-amber-50',
        dot: 'bg-amber-500',
        icon: 'bg-amber-50 text-amber-600',
        label: 'Occupied',
    },
    maintenance: {
        pill: 'bg-rose-50',
        dot: 'bg-rose-500',
        icon: 'bg-rose-50 text-rose-600',
        label: 'Maintenance',
    },
    cleaning: {
        pill: 'bg-violet-50',
        dot: 'bg-violet-500',
        icon: 'bg-violet-50 text-violet-600',
        label: 'Cleaning',
    },
}

function getFileExtension(filename = '') {
    return filename.split('.').pop()?.toLowerCase() || ''
}

function sanitizeFilename(filename, fallbackExtension = 'jpg') {
    const extension = ROOM_MEDIA_ALLOWED_EXTENSIONS.has(getFileExtension(filename))
        ? getFileExtension(filename)
        : fallbackExtension

    const safeBaseName = filename
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9\s_-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-_.]+|[-_.]+$/g, '')
        .toLowerCase()

    return `${safeBaseName || 'room-photo'}.${extension}`
}

function validateRoomMedia(file) {
    const extension = getFileExtension(file?.name)

    if (!file || !ROOM_MEDIA_ALLOWED_TYPES.has(file.type) || !ROOM_MEDIA_ALLOWED_EXTENSIONS.has(extension)) {
        return 'Only .jpg, .jpeg, and .png files are allowed.'
    }

    if (file.size > ROOM_MEDIA_MAX_BYTES) {
        return 'Room photo must be 5MB or smaller.'
    }

    return ''
}

function revokeObjectUrl(url) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url)
    }
}

function resolveRoomMedia(room, roomMediaById) {
    if (roomMediaById[room.id]) {
        return roomMediaById[room.id]
    }

    if (room.imageUrl) {
        // room.imageUrl is already a relative path like /uploads/rooms/room-xxx.jpg
        // The Vite dev proxy forwards /uploads/* to Express (port 5000).
        // In production, Express serves /uploads as static files on the same origin.
        return {
            previewUrl: room.imageUrl,
            sanitizedName: room.roomMediaName || 'room-photo.jpg',
            contentType: room.roomMediaType || 'image/jpeg',
            fileSizeLabel: room.roomMediaSizeLabel || 'Saved image',
        }
    }

    return null
}

function formatStatus(status) {
    return status
        ?.replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
}

function StatusPill({ status }) {
    const tone = STATUS_STYLES[status] || {
        pill: 'bg-slate-100',
        dot: 'bg-slate-500',
        label: formatStatus(status),
    }

    return (
        <span
            title={tone.label}
            aria-label={tone.label}
            className={`inline-flex h-10 w-14 items-center justify-center rounded-full ${tone.pill}`}
        >
            <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
            <span className="sr-only">{tone.label}</span>
        </span>
    )
}

function SummaryCard({ eyebrow, value, label, icon: Icon, iconClass }) {
    return (
        <div className="stat-card">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-500">{eyebrow}</p>
                    <p className="mt-6 text-5xl font-extrabold tracking-[-0.06em] text-slate-900">{value}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">{label}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${iconClass}`}>
                    <Icon size={18} />
                </div>
            </div>
        </div>
    )
}

function NoImagePlaceholder() {
    return (
        <div className="flex h-[72px] w-[128px] items-center justify-center rounded-[12px] border border-slate-200 bg-slate-50 text-slate-300">
            <svg viewBox="0 0 64 64" fill="none" className="h-9 w-9" aria-hidden="true">
                <path d="M12 35.5V25a4 4 0 0 1 4-4h18a8 8 0 0 1 8 8v6.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 35.5h40v11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 46.5v-5m28 5v-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 29h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
            </svg>
            <span className="sr-only">No image</span>
        </div>
    )
}

function RoomPreview({ room, media }) {
    if (!media?.previewUrl) {
        return <NoImagePlaceholder />
    }

    return (
        <img
            src={media.previewUrl}
            alt={`Room ${room.roomNumber} preview`}
            className="h-[72px] w-[128px] rounded-[12px] object-cover shadow-[0_18px_35px_-30px_rgba(15,23,42,0.55)]"
        />
    )
}

function RoomModal({ room, initialRoomMedia, onClose, onSaved }) {
    const isEdit = !!room
    const [roomMedia, setRoomMedia] = useState(initialRoomMedia || null)
    const [roomMediaError, setRoomMediaError] = useState('')
    const [roomMediaTouched, setRoomMediaTouched] = useState(false)
    const currentRoomMediaRef = useRef(initialRoomMedia || null)
    const draftPreviewUrlsRef = useRef(new Set())
    const preservePreviewRef = useRef(false)

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(roomSchema),
        defaultValues: room ? {
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            pricePerNight: room.pricePerNight,
            floorNumber: room.floorNumber,
            capacity: room.capacity,
            status: room.status,
            description: room.description || '',
        } : {
            roomType: 'AC',
            status: 'available',
            capacity: 2,
            floorNumber: 1,
            description: '',
        },
    })

    useEffect(() => {
        currentRoomMediaRef.current = roomMedia
    }, [roomMedia])

    useEffect(() => {
        return () => {
            const currentPreviewUrl = currentRoomMediaRef.current?.previewUrl
            if (preservePreviewRef.current && currentPreviewUrl) {
                draftPreviewUrlsRef.current.delete(currentPreviewUrl)
            }

            draftPreviewUrlsRef.current.forEach((previewUrl) => revokeObjectUrl(previewUrl))
        }
    }, [])

    const replaceRoomMedia = (nextMedia) => {
        setRoomMedia((currentMedia) => {
            if (
                currentMedia?.previewUrl &&
                currentMedia.previewUrl !== nextMedia?.previewUrl &&
                draftPreviewUrlsRef.current.has(currentMedia.previewUrl)
            ) {
                revokeObjectUrl(currentMedia.previewUrl)
                draftPreviewUrlsRef.current.delete(currentMedia.previewUrl)
            }

            return nextMedia
        })
    }

    const handleRoomMediaChange = (file) => {
        const validationError = validateRoomMedia(file)
        if (validationError) {
            setRoomMediaError(validationError)
            return
        }

        const sanitizedName = sanitizeFilename(file.name, ROOM_MEDIA_EXTENSION_BY_TYPE[file.type] || 'jpg')
        const sanitizedFile = new File([file], sanitizedName, {
            type: file.type,
            lastModified: file.lastModified,
        })
        const previewUrl = URL.createObjectURL(sanitizedFile)

        draftPreviewUrlsRef.current.add(previewUrl)
        setRoomMediaTouched(true)
        setRoomMediaError('')
        replaceRoomMedia({
            file: sanitizedFile,
            previewUrl,
            sanitizedName,
            contentType: sanitizedFile.type,
        })
    }

    const handleRoomMediaRemove = () => {
        setRoomMediaTouched(true)
        setRoomMediaError('')
        replaceRoomMedia(null)
    }

    const onSubmit = async (data) => {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== undefined && data[key] !== null) {
                    formData.append(key, data[key]);
                }
            });

            if (roomMediaTouched && roomMedia?.file) {
                formData.append('image', roomMedia.file);
            }

            const response = isEdit
                ? await api.put(`/rooms/${room.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                : await api.post('/rooms', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            const savedRoom = response.data.data

            if (roomMediaTouched && roomMedia?.previewUrl && draftPreviewUrlsRef.current.has(roomMedia.previewUrl)) {
                preservePreviewRef.current = true
                draftPreviewUrlsRef.current.delete(roomMedia.previewUrl)
            }

            await onSaved(savedRoom, { touched: roomMediaTouched, value: roomMedia })
            toast.success(isEdit ? 'Room updated successfully.' : 'Room created successfully.')
            onClose()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed.')
        }
    }

    const Field = ({ label, name, type = 'text', children }) => (
        <div>
            <label className="form-label">{label}</label>
            {children || <input {...register(name)} type={type} className={`field-input ${errors[name] ? 'border-red-400 focus:border-red-400 focus:ring-red-100' : ''}`} />}
            {errors[name] && <p className="mt-2 text-sm text-red-500">{errors[name].message}</p>}
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-float">
                <div className="flex items-center justify-between border-b border-hotel-line px-6 py-5">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-500">Room management</p>
                        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{isEdit ? 'Edit room' : 'Add new room'}</h2>
                    </div>
                    <button onClick={onClose} className="btn-ghost">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-6">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Room number" name="roomNumber" type="number" />
                            <Field label="Floor number" name="floorNumber" type="number" />
                            <Field label="Room type" name="roomType">
                                <select {...register('roomType')} className="field-select">
                                    {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </Field>
                            <Field label="Capacity" name="capacity" type="number" />
                            <Field label="Price per night" name="pricePerNight" type="number" />
                            {isEdit && (
                                <Field label="Status" name="status">
                                    <select {...register('status')} className="field-select">
                                        {STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {formatStatus(status)}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            )}
                        </div>

                        <Field label="Description" name="description">
                            <textarea {...register('description')} rows={4} className="field-textarea" />
                        </Field>

                        <div>
                            <label className="form-label">Room Media</label>
                            <ImageUpload
                                value={roomMedia}
                                error={roomMediaError}
                                onFileChange={handleRoomMediaChange}
                                onRemove={handleRoomMediaRemove}
                            />
                        </div>
                    </div>

                    <div className="border-t border-hotel-line bg-white/95 px-6 py-4 backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="btn-primary">
                                {isSubmitting ? 'Saving...' : isEdit ? 'Update room' : 'Create room'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function RoomsPage() {
    const { isAdmin } = useAuth()
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState('')
    const [modal, setModal] = useState(null)
    const [roomMediaById, setRoomMediaById] = useState({})
    const roomMediaByIdRef = useRef({})

    useEffect(() => {
        roomMediaByIdRef.current = roomMediaById
    }, [roomMediaById])

    useEffect(() => {
        return () => {
            Object.values(roomMediaByIdRef.current).forEach((media) => revokeObjectUrl(media?.previewUrl))
        }
    }, [])

    const fetchRooms = useCallback(async () => {
        setLoading(true)
        try {
            const params = filterStatus ? { status: filterStatus } : {}
            const res = await api.get('/rooms', { params })
            setRooms(res.data.data)
        } catch {
            toast.error('Failed to load rooms.')
        } finally {
            setLoading(false)
        }
    }, [filterStatus])

    useEffect(() => {
        fetchRooms()
    }, [fetchRooms])

    const handleRoomSaved = useCallback(async (savedRoom, roomMediaState) => {
        if (roomMediaState?.touched) {
            setRoomMediaById((currentMediaById) => {
                const nextMediaById = { ...currentMediaById }
                const previousMedia = currentMediaById[savedRoom.id]

                if (previousMedia?.previewUrl !== roomMediaState.value?.previewUrl) {
                    revokeObjectUrl(previousMedia?.previewUrl)
                }

                if (roomMediaState.value) {
                    nextMediaById[savedRoom.id] = roomMediaState.value
                } else {
                    delete nextMediaById[savedRoom.id]
                }

                return nextMediaById
            })
        }

        await fetchRooms()
    }, [fetchRooms])

    const handleDelete = async (room) => {
        if (!window.confirm(`Delete Room ${room.roomNumber}? This cannot be undone.`)) return
        try {
            await api.delete(`/rooms/${room.id}`)
            setRoomMediaById((currentMediaById) => {
                const nextMediaById = { ...currentMediaById }
                revokeObjectUrl(currentMediaById[room.id]?.previewUrl)
                delete nextMediaById[room.id]
                return nextMediaById
            })
            toast.success(`Room ${room.roomNumber} deleted.`)
            fetchRooms()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed.')
        }
    }

    const availableCount = rooms.filter((room) => room.status === 'available').length
    const occupiedCount = rooms.filter((room) => room.status === 'occupied').length
    const serviceCount = rooms.filter((room) => ['maintenance', 'cleaning'].includes(room.status)).length

    const roomSummaries = [
        {
            eyebrow: 'Total Rooms',
            value: rooms.length,
            label: 'Rooms in the operating stack',
            icon: BedDouble,
            iconClass: 'bg-slate-100 text-slate-900',
        },
        {
            eyebrow: 'Available Rooms',
            value: availableCount,
            label: 'Ready to assign right now',
            icon: DoorOpen,
            iconClass: 'bg-emerald-50 text-emerald-600',
        },
        {
            eyebrow: 'Occupied Rooms',
            value: occupiedCount,
            label: 'Currently hosting guests',
            icon: Users,
            iconClass: 'bg-amber-50 text-amber-600',
        },
        {
            eyebrow: 'Maintenance',
            value: serviceCount,
            label: 'Temporarily out of rotation',
            icon: Wrench,
            iconClass: 'bg-rose-50 text-rose-600',
        },
    ]

    const legendStatuses = ['available', 'occupied', 'maintenance', 'cleaning']

    return (
        <div className="page-shell">
            <div className="page-header">
                <div>
                    <p className="page-kicker"></p>
                    <h1 className="page-title">Room Management</h1>
                    <p className="page-subtitle">
                        A clear overview of all rooms and their current status.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="field-select min-w-[200px]">
                        <option value="">All room states</option>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {formatStatus(status)}
                            </option>
                        ))}
                    </select>
                    {isAdmin && (
                        <button onClick={() => setModal({ mode: 'create' })} className="btn-primary">
                            <Plus size={16} />
                            Add room
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {roomSummaries.map((item) => (
                    <SummaryCard key={item.eyebrow} {...item} />
                ))}
            </div>

            <section className="section-card overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-7 py-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primary-500">Room Status</p>
                        <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-slate-900">{rooms.length} rooms in view</h2>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                        {legendStatuses.map((status) => (
                            <span key={status} className="inline-flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_STYLES[status].dot}`} />
                                {STATUS_STYLES[status].label}
                            </span>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="py-16 text-center">
                        <BedDouble size={44} className="mx-auto text-slate-300" />
                        <p className="mt-4 text-sm text-slate-500">No rooms found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table min-w-[1120px]">
                            <thead>
                                <tr>
                                    <th>Preview</th>
                                    <th>Room</th>
                                    <th>Profile</th>
                                    <th>Rate</th>
                                    <th>Status</th>
                                    <th>Notes</th>
                                    {isAdmin && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room) => {
                                    const roomMedia = resolveRoomMedia(room, roomMediaById)

                                    return (
                                        <tr key={room.id} className="table-row-hover">
                                            <td>
                                                <RoomPreview room={room} media={roomMedia} />
                                            </td>
                                            <td>
                                                <p className="text-xl font-extrabold tracking-[-0.04em] text-slate-900">{room.roomNumber}</p>
                                                <p className="mt-2 text-sm text-slate-400">Floor {room.floorNumber}</p>
                                            </td>
                                            <td>
                                                <div className="space-y-3">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                                                        {room.roomType}
                                                    </span>
                                                    <p className="text-sm text-slate-500">Capacity for {room.capacity} guest{room.capacity !== 1 ? 's' : ''}</p>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-lg font-extrabold tracking-[-0.04em] text-slate-900">₹{room.pricePerNight}</p>
                                                <p className="mt-2 text-sm text-slate-400">Per night</p>
                                            </td>
                                            <td>
                                                <StatusPill status={room.status} />
                                            </td>
                                            <td className="max-w-[280px]">
                                                <p className="text-sm leading-7 text-slate-500">{room.description || 'No notes added.'}</p>
                                            </td>
                                            {isAdmin && (
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => setModal({ mode: 'edit', room })} className="btn-ghost text-slate-600 hover:text-slate-900">
                                                            <Pencil size={15} />
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDelete(room)} className="btn-ghost text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                                                            <Trash2 size={15} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {modal && (
                <RoomModal
                    room={modal.mode === 'edit' ? modal.room : null}
                    initialRoomMedia={modal.mode === 'edit' ? resolveRoomMedia(modal.room, roomMediaById) : null}
                    onClose={() => setModal(null)}
                    onSaved={handleRoomSaved}
                />
            )}
        </div>
    )
}

