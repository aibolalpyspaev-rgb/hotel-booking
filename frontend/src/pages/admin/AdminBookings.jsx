import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { ErrorBox, Modal, PageHeader, PageLoader, Pagination, StatusBadge } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { adminApi, errorMessage, hotelsApi } from '../../services/api'
import { formatDate, guestsLabel, money, nightsLabel, STATUS } from '../../utils/format'

// Допустимые переходы статусов (совпадают с серверной логикой)
const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'pending'],
  cancelled: ['pending', 'confirmed'],
  completed: [],
}

export default function AdminBookings() {
  const toast = useToast()
  const [filters, setFilters] = useState({ status: '', hotel_id: '', search: '' })
  const [page, setPage] = useState(1)
  const [hotels, setHotels] = useState([])
  const [viewing, setViewing] = useState(null)
  const q = useDebounce(filters.search)

  useEffect(() => {
    hotelsApi.list({ per_page: 50, include_inactive: 1, sort: 'name' }).then((r) => setHotels(r.data)).catch(() => {})
  }, [])

  const { data, loading, error, reload } = useFetch(
    () => adminApi.bookings({ status: filters.status, hotel_id: filters.hotel_id, search: q, page, per_page: 15 }),
    [filters.status, filters.hotel_id, q, page],
  )

  const setF = (k) => (e) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }))
    setPage(1)
  }

  const changeStatus = async (b, status) => {
    try {
      const res = await adminApi.setBookingStatus(b.id, status)
      toast.success(res.message)
      if (viewing?.id === b.id) setViewing(res.data)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div>
      <PageHeader title="Управление бронированиями" subtitle="Все бронирования сервиса и изменение их статусов" />

      <div className="card mb-4 grid gap-3 p-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Код, имя или email гостя…" value={filters.search} onChange={setF('search')} />
        </div>
        <select className="input" value={filters.status} onChange={setF('status')}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <select className="input" value={filters.hotel_id} onChange={setF('hotel_id')}>
          <option value="">Все отели</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className={`card overflow-hidden ${loading ? 'opacity-60' : ''}`}>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50"><tr><th>Код</th><th>Гость</th><th>Отель / номер</th><th>Даты</th><th>Сумма</th><th>Статус</th><th>Изменить статус</th><th></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs">{b.code}</td>
                    <td><p className="font-medium">{b.user?.name}</p><p className="text-xs text-slate-500">{b.user?.email}</p></td>
                    <td><p>{b.room?.hotel?.name}</p><p className="text-xs text-slate-500">{b.room?.name}</p></td>
                    <td className="whitespace-nowrap">{formatDate(b.check_in, { day: '2-digit', month: '2-digit', year: '2-digit' })} — {formatDate(b.check_out, { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                    <td className="whitespace-nowrap font-semibold">{money(b.total_price)}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td>
                      {TRANSITIONS[b.status].length ? (
                        <select className="input py-1.5 text-xs" value="" onChange={(e) => e.target.value && changeStatus(b, e.target.value)}>
                          <option value="">Выбрать…</option>
                          {TRANSITIONS[b.status].map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
                        </select>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td><button className="btn-ghost btn-sm" onClick={() => setViewing(b)} title="Подробнее"><Eye className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.length === 0 && <p className="p-6 text-center text-slate-500">Бронирований не найдено</p>}
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={`Бронирование ${viewing?.code || ''}`}>
        {viewing && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Статус</span><StatusBadge status={viewing.status} /></div>
            <div className="flex justify-between"><span className="text-slate-500">Пользователь</span><span className="text-right">{viewing.user?.name}<br /><span className="text-xs text-slate-500">{viewing.user?.email}</span></span></div>
            <div className="flex justify-between"><span className="text-slate-500">Гость</span><span>{viewing.guest_name || '—'} {viewing.guest_phone && `· ${viewing.guest_phone}`}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Отель</span><span>{viewing.room?.hotel?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Номер</span><span>{viewing.room?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Даты</span><span>{formatDate(viewing.check_in)} — {formatDate(viewing.check_out)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Гостей / ночей</span><span>{guestsLabel(viewing.guests)}, {nightsLabel(viewing.nights)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Пожелания</span><span className="max-w-[60%] text-right">{viewing.special_requests || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Создано</span><span>{formatDate(viewing.created_at)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold"><span>Итого</span><span>{money(viewing.total_price)}</span></div>
            {TRANSITIONS[viewing.status].length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                {TRANSITIONS[viewing.status].map((s) => (
                  <button key={s} className={s === 'cancelled' ? 'btn-danger btn-sm' : 'btn-primary btn-sm'} onClick={() => changeStatus(viewing, s)}>{STATUS[s].label}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
