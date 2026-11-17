import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Search, Users } from 'lucide-react'
import { hotelsApi } from '../services/api'
import { addDays, todayISO } from '../utils/format'

/** Форма поиска: город, даты заезда/выезда, гости → переход в каталог с фильтрами */
export default function SearchForm({ initial = {}, compact = false }) {
  const navigate = useNavigate()
  const [cities, setCities] = useState([])
  const [form, setForm] = useState({
    city: initial.city || '',
    check_in: initial.check_in || '',
    check_out: initial.check_out || '',
    guests: initial.guests || 2,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    hotelsApi.cities().then(setCities).catch(() => {})
  }, [])

  const set = (k) => (e) => {
    const value = e.target.value
    setForm((f) => {
      const next = { ...f, [k]: value }
      if (k === 'check_in' && value && (!f.check_out || f.check_out <= value)) next.check_out = addDays(value, 1)
      return next
    })
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    if ((form.check_in && !form.check_out) || (!form.check_in && form.check_out)) return setError('Укажите обе даты или оставьте их пустыми.')
    if (form.check_in && form.check_out <= form.check_in) return setError('Дата выезда должна быть позже даты заезда.')
    const params = new URLSearchParams()
    Object.entries(form).forEach(([k, v]) => v && params.set(k, v))
    navigate(`/hotels?${params.toString()}`)
  }

  const box = 'flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500'

  return (
    <form onSubmit={submit} className={`card p-3 ${compact ? '' : 'sm:p-4'}`}>
      <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_.8fr_auto]">
        <label className={box}>
          <MapPin className="h-5 w-5 shrink-0 text-brand-600" />
          <div className="w-full">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Город</span>
            <select value={form.city} onChange={set('city')} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none">
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c.city} value={c.city}>
                  {c.city}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label className={box}>
          <CalendarDays className="h-5 w-5 shrink-0 text-brand-600" />
          <div className="w-full">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Заезд</span>
            <input type="date" min={todayISO()} value={form.check_in} onChange={set('check_in')} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none" />
          </div>
        </label>
        <label className={box}>
          <CalendarDays className="h-5 w-5 shrink-0 text-brand-600" />
          <div className="w-full">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Выезд</span>
            <input type="date" min={form.check_in ? addDays(form.check_in, 1) : todayISO()} value={form.check_out} onChange={set('check_out')} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none" />
          </div>
        </label>
        <label className={box}>
          <Users className="h-5 w-5 shrink-0 text-brand-600" />
          <div className="w-full">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Гости</span>
            <select value={form.guests} onChange={set('guests')} className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </label>
        <button type="submit" className="btn-primary h-full min-h-12 px-6 text-base">
          <Search className="h-5 w-5" />
          Найти отель
        </button>
      </div>
      {error && <p className="mt-2 px-1 text-sm text-rose-600">{error}</p>}
    </form>
  )
}
