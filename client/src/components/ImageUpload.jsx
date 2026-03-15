import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'

const ACCEPTED_MEDIA = '.jpg,.jpeg,.png,image/jpeg,image/png'

export default function ImageUpload({ value, error, onFileChange, onRemove }) {
    const inputRef = useRef(null)
    const [isDragActive, setIsDragActive] = useState(false)

    const handleInputChange = (event) => {
        const [file] = Array.from(event.target.files || [])
        if (file) {
            onFileChange(file)
        }
        event.target.value = ''
    }

    const handleDrop = (event) => {
        event.preventDefault()
        setIsDragActive(false)
        const [file] = Array.from(event.dataTransfer.files || [])
        if (file) {
            onFileChange(file)
        }
    }

    const typeLabel = value?.contentType === 'image/png' || value?.file?.type === 'image/png' ? 'PNG' : 'JPG'
    const sizeLabel = value?.file
        ? `${(value.file.size / (1024 * 1024)).toFixed(2)} MB`
        : value?.fileSizeLabel || 'Saved image'

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_MEDIA}
                className="hidden"
                onChange={handleInputChange}
            />

            <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        inputRef.current?.click()
                    }
                }}
                onDragOver={(event) => {
                    event.preventDefault()
                    setIsDragActive(true)
                }}
                onDragLeave={(event) => {
                    event.preventDefault()
                    setIsDragActive(false)
                }}
                onDrop={handleDrop}
                className={`group relative overflow-hidden rounded-[24px] border-2 border-dashed px-5 py-5 transition-all duration-200 ${
                    isDragActive
                        ? 'border-primary-300 bg-primary-50/80 shadow-[0_20px_36px_-30px_rgba(59,130,246,0.55)]'
                        : 'border-[#D1D5DB] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] hover:border-primary-200 hover:bg-primary-50/35'
                }`}
            >
                <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-sky-50 text-sky-400 shadow-[0_18px_32px_-28px_rgba(14,165,233,0.9)] transition-transform duration-200 group-hover:scale-[1.03]">
                        <ImagePlus size={24} strokeWidth={1.8} />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-sm font-semibold tracking-[0.01em] text-slate-900">
                            Click or drag to upload room photo
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                            JPG or PNG only • Up to 5MB
                        </p>
                    </div>
                </div>
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            {value?.previewUrl && (
                <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_36px_-32px_rgba(15,23,42,0.45)] sm:grid sm:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="h-[180px] bg-slate-50 sm:h-full">
                        <img
                            src={value.previewUrl}
                            alt="Room media preview"
                            className="h-full w-full object-cover"
                        />
                    </div>

                    <div className="flex flex-col gap-3 px-4 py-4 sm:justify-center sm:px-5">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{value.sanitizedName}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                                {typeLabel} • {sizeLabel}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation()
                                onRemove()
                            }}
                            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                            <X size={14} />
                            Remove
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
