import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { LifeBuoy, RefreshCw, Search, UserRound, Mail, Phone, Clock } from 'lucide-react'

const STATUS_TONE = {
  open: 'bg-amber-50 text-amber-800 ring-amber-200',
  in_progress: 'bg-sky-50 text-sky-800 ring-sky-200',
  resolved: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}

function StatusPill({ status }) {
  const tone = STATUS_TONE[status] || 'bg-slate-50 text-slate-700 ring-slate-200'
  const label = String(status || 'unknown')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      {label}
    </span>
  )
}

export default function GuestSupportPage() {
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState({ tickets: [], openCount: 0 })
  const [query, setQuery] = useState('')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const res = await api.get('/support', { params: { limit: 100 } })
      if (res.data?.success) {
        setPayload(res.data.data)
      } else {
        toast.error('Failed to load support tickets.')
      }
    } catch {
      toast.error('Failed to load support tickets.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const tickets = payload?.tickets ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tickets

    return tickets.filter((t) => {
      const guest = t.guest || {}
      return (
        String(t.id).includes(q) ||
        String(t.status || '').toLowerCase().includes(q) ||
        String(t.message || '').toLowerCase().includes(q) ||
        String(guest.username || '').toLowerCase().includes(q) ||
        String(guest.email || '').toLowerCase().includes(q) ||
        String(guest.phone || '').toLowerCase().includes(q)
      )
    })
  }, [tickets, query])

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title mt-0 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-panel">
              <LifeBuoy size={18} />
            </span>
            Guest Support
          </h1>
          <p className="page-subtitle mt-2">
            Review support ticket requests and guest details. <span className="font-semibold text-slate-700">{payload?.openCount ?? 0}</span> open.
          </p>
        </div>

        <button onClick={fetchTickets} className="btn-secondary">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="section-card rounded-[32px] p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by guest name, email, phone, status, ticket id, message..."
              className="field-input w-full pl-11"
            />
          </div>

          <div className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{tickets.length}</span>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 shadow-panel">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <span className="text-sm font-medium text-slate-500">Loading support tickets...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-slate-900">No tickets found</p>
              <p className="mt-2 text-sm text-slate-500">Try clearing your search, or wait for new tickets.</p>
            </div>
          ) : (
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Guest</th>
                  <th>Contact</th>
                  <th>Message</th>
                  <th>Created</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="table-row-hover align-top">
                    <td>
                      <p className="text-sm font-extrabold text-slate-900">#{t.id}</p>
                    </td>
                    <td>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <UserRound size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{t.guest?.username || 'Unknown guest'}</p>
                          <p className="text-xs text-slate-500">User ID: {t.guest?.id ?? 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Mail size={14} className="text-slate-400" />
                          <span className="truncate max-w-[240px]">{t.guest?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone size={14} className="text-slate-400" />
                          <span>{t.guest?.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap break-words max-w-[420px]">
                        {t.message || '—'}
                      </p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Clock size={14} className="text-slate-400" />
                        <span>
                          {t.createdAt ? format(new Date(t.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

