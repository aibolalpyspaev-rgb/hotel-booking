import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, CalendarCheck, CalendarClock, Hotel, MessageSquare, Star, TrendingUp, Users, Wallet } from 'lucide-react'
import { ErrorBox, PageHeader, PageLoader, StatusBadge } from '../../components/ui'
import { useFetch } from '../../hooks/useFetch'
import { adminApi } from '../../services/api'
import { formatDate, money, STATUS } from '../../utils/format'

function StatCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`rounded-xl p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="truncate text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

/** Простой столбчатый график: одна серия, один цвет, подсказка при наведении. */
function BarChart({ title, data, valueKey, format = (v) => v }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div className="card p-6">
      <h3 className="font-bold">{title}</h3>
      <div className="relative mt-6 flex h-48 items-end gap-3 border-b border-slate-200">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-100" style={{ bottom: `${f * 100}%` }} />
        ))}
        {data.map((d, i) => (
          <div key={d.month} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            {hover === i && (
              <div className="absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ bottom: `calc(${(d[valueKey] / max) * 100}% + 6px)` }}>
                {d.month}: <b>{format(d[valueKey])}</b>
              </div>
            )}
            <div
              className={`w-full max-w-10 rounded-t transition-all duration-500 ${hover === i ? 'bg-brand-700' : 'bg-brand-500'}`}
              style={{ height: `${Math.max(d[valueKey] ? 2 : 0, (d[valueKey] / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {data.map((d) => (
          <span key={d.month} className="flex-1 truncate text-center text-xs text-slate-500">{d.month}</span>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch(() => adminApi.stats(), [])

  if (loading) return <PageLoader />
  if (error) return <ErrorBox message={error} onRetry={reload} />

  const t = data.totals
  const totalByStatus = data.by_status.reduce((s, x) => s + x.total, 0) || 1

  return (
    <div className="space-y-6">
      <PageHeader title="Панель администратора" subtitle="Статистика сервиса бронирования" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Hotel} label="Всего отелей" value={t.hotels} />
        <StatCard icon={BedDouble} label="Всего номеров" value={t.rooms} tone="violet" />
        <StatCard icon={CalendarCheck} label="Всего бронирований" value={t.bookings} tone="slate" />
        <StatCard icon={Users} label="Пользователей" value={t.users} tone="amber" />
        <StatCard icon={CalendarClock} label="Активные бронирования" value={t.active_bookings} tone="emerald" />
        <StatCard icon={TrendingUp} label="Гостей проживает сейчас" value={t.guests_now} />
        <StatCard icon={Wallet} label="Выручка (подтв. + заверш.)" value={money(t.revenue)} tone="emerald" />
        <StatCard icon={Star} label={`Средняя оценка · ${t.reviews} отзывов`} value={t.average_rating || '—'} tone="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart title="Бронирования по месяцам" data={data.by_month} valueKey="bookings" format={(v) => `${v} шт.`} />
        <BarChart title="Выручка по месяцам, ₸" data={data.by_month} valueKey="revenue" format={money} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-6">
          <h3 className="font-bold">Бронирования по статусам</h3>
          <div className="mt-5 space-y-4">
            {data.by_status.map((s) => (
              <div key={s.status}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS[s.status].dot}`} /> {s.label}
                  </span>
                  <span className="font-semibold text-slate-900">{s.total} <span className="font-normal text-slate-400">({Math.round((s.total / totalByStatus) * 100)}%)</span></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${STATUS[s.status].dot}`} style={{ width: `${(s.total / totalByStatus) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-3">
            <h3 className="font-bold">Топ отелей по бронированиям</h3>
            <Link to="/admin/hotels" className="link text-sm">Управление</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Отель</th><th>Броней</th><th>Выручка</th><th>Рейтинг</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.top_hotels.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td><p className="font-semibold">{h.name}</p><p className="text-xs text-slate-500">{h.city}</p></td>
                    <td>{h.bookings_count}</td>
                    <td className="whitespace-nowrap">{money(h.revenue)}</td>
                    <td><span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{Number(h.rating).toFixed(1)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="flex items-center gap-2 font-bold"><MessageSquare className="h-5 w-5 text-brand-600" /> Последние бронирования</h3>
          <Link to="/admin/bookings" className="link text-sm">Все бронирования</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Код</th><th>Гость</th><th>Отель / номер</th><th>Даты</th><th>Сумма</th><th>Статус</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.recent_bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="font-mono text-xs">{b.code}</td>
                  <td>{b.user?.name}<p className="text-xs text-slate-500">{b.user?.email}</p></td>
                  <td>{b.room?.hotel?.name}<p className="text-xs text-slate-500">{b.room?.name}</p></td>
                  <td className="whitespace-nowrap">{formatDate(b.check_in, { day: '2-digit', month: 'short' })} — {formatDate(b.check_out, { day: '2-digit', month: 'short' })}</td>
                  <td className="whitespace-nowrap font-semibold">{money(b.total_price)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
