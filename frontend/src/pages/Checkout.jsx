import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, Lock, MapPin, PartyPopper, Users, XCircle } from 'lucide-react'
import { ErrorBox, Field, Img, PageLoader, Spinner, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks/useFetch'
import { bookingsApi, errorMessage, fieldErrors, roomsApi } from '../services/api'
import { addDays, formatDate, guestsLabel, money, nightsLabel, todayISO } from '../utils/format'

/**
 * Оформление бронирования: 1) данные и проверка дат → 2) бронь создана (pending) → 3) подтверждение (confirmed).
 */
export default function Checkout() {
  const { roomId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { data, loading, error, reload } = useFetch(() => roomsApi.get(roomId), [roomId])

  const [form, setForm] = useState({
    check_in: params.get('check_in') || addDays(todayISO(), 1),
    check_out: params.get('check_out') || addDays(todayISO(), 2),
    guests: Number(params.get('guests')) || 1,
    guest_name: user?.name || '',
    guest_phone: user?.phone || '',
    special_requests: '',
  })
  const [errors, setErrors] = useState({})
  const [quote, setQuote] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [booking, setBooking] = useState(null)

  const room = data?.data

  useEffect(() => {
    if (room && form.guests > room.capacity) setForm((f) => ({ ...f, guests: room.capacity }))
  }, [room, form.guests])

  useEffect(() => {
    setQuote(null)
    if (!form.check_in || !form.check_out || form.check_out <= form.check_in) return
    roomsApi.availability(roomId, { check_in: form.check_in, check_out: form.check_out }).then(setQuote).catch(() => {})
  }, [roomId, form.check_in, form.check_out])

  if (loading) return <PageLoader />
  if (error) return <div className="container-page py-10"><ErrorBox message={error} onRetry={reload} /></div>

  const set = (k) => (e) => {
    const v = e.target.value
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (k === 'check_in' && f.check_out <= v) next.check_out = addDays(v, 1)
      return next
    })
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.check_in) e.check_in = 'Укажите дату заезда.'
    else if (form.check_in < todayISO()) e.check_in = 'Дата заезда не может быть в прошлом.'
    if (!form.check_out) e.check_out = 'Укажите дату выезда.'
    else if (form.check_out <= form.check_in) e.check_out = 'Дата выезда должна быть позже даты заезда.'
    if (form.guests < 1) e.guests = 'Минимум 1 гость.'
    else if (form.guests > room.capacity) e.guests = `Максимум ${room.capacity} гостей.`
    if (!form.guest_name.trim()) e.guest_name = 'Укажите имя гостя.'
    if (form.guest_phone && !/^\+?[0-9\s\-()]{10,20}$/.test(form.guest_phone)) e.guest_phone = 'Формат: +7 700 000 00 00'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await bookingsApi.create({ room_id: Number(roomId), ...form, guests: Number(form.guests) })
      setBooking(res.data)
      toast.success(res.message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const confirm = async () => {
    setSubmitting(true)
    try {
      const res = await bookingsApi.confirm(booking.id)
      setBooking(res.data)
      toast.success(res.message)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Шаг 2–3: бронь создана ----------
  if (booking) {
    const done = booking.status === 'confirmed'
    return (
      <div className="container-page max-w-2xl py-10">
        <div className="card animate-pop overflow-hidden">
          <div className={`p-8 text-center ${done ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-brand-600 to-brand-700'} text-white`}>
            {done ? <PartyPopper className="mx-auto h-14 w-14" /> : <CheckCircle2 className="mx-auto h-14 w-14" />}
            <h1 className="mt-3 text-2xl font-bold text-white">{done ? 'Бронирование подтверждено!' : 'Бронирование создано'}</h1>
            <p className="mt-1 text-white/80">Номер брони: <b className="text-white">{booking.code}</b></p>
          </div>
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Статус</span>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex justify-between"><span className="text-slate-500">Отель</span><span className="text-right font-medium">{booking.room.hotel.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Номер</span><span className="font-medium">{booking.room.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Даты</span><span className="font-medium">{formatDate(booking.check_in)} — {formatDate(booking.check_out)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Гости</span><span className="font-medium">{guestsLabel(booking.guests)}</span></div>
            <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold"><span>Итого за {nightsLabel(booking.nights)}</span><span>{money(booking.total_price)}</span></div>

            {!done ? (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
                Номер закреплён за вами. Подтвердите бронирование — это имитация оплаты (оплата производится при заселении).
                <button onClick={confirm} disabled={submitting} className="btn-primary mt-3 w-full py-3">
                  {submitting ? <Spinner className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />} Подтвердить бронирование
                </button>
              </div>
            ) : (
              <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-100">
                Ждём вас {formatDate(booking.check_in)} с 14:00. Подтверждение также доступно в разделе «Мои бронирования».
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/my-bookings" className="btn-secondary flex-1">Мои бронирования</Link>
              <Link to="/hotels" className="btn-ghost flex-1">Продолжить поиск</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ---------- Шаг 1: форма ----------
  return (
    <div className="container-page py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-3 mb-4"><ArrowLeft className="h-4 w-4" /> Назад</button>
      <h1 className="text-3xl font-extrabold">Оформление бронирования</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="card space-y-6 p-6" noValidate>
          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><CalendarDays className="h-5 w-5 text-brand-600" /> Даты и гости</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Дата заезда" error={errors.check_in}>
                <input type="date" className={`input ${errors.check_in ? 'input-error' : ''}`} min={todayISO()} value={form.check_in} onChange={set('check_in')} />
              </Field>
              <Field label="Дата выезда" error={errors.check_out}>
                <input type="date" className={`input ${errors.check_out ? 'input-error' : ''}`} min={addDays(form.check_in || todayISO(), 1)} value={form.check_out} onChange={set('check_out')} />
              </Field>
              <Field label="Гостей" error={errors.guests} hint={`Вместимость: до ${room.capacity}`}>
                <select className={`input ${errors.guests ? 'input-error' : ''}`} value={form.guests} onChange={set('guests')}>
                  {Array.from({ length: room.capacity }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
            </div>
            {quote && (
              <p className={`mt-3 flex items-center gap-1.5 text-sm font-semibold ${quote.available ? 'text-emerald-600' : 'text-rose-600'}`}>
                {quote.available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {quote.available ? 'Номер свободен на выбранные даты' : 'Номер уже забронирован на эти даты — выберите другие'}
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-brand-600" /> Данные гостя</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Имя и фамилия" error={errors.guest_name}>
                <input className={`input ${errors.guest_name ? 'input-error' : ''}`} value={form.guest_name} onChange={set('guest_name')} />
              </Field>
              <Field label="Телефон" error={errors.guest_phone}>
                <input className={`input ${errors.guest_phone ? 'input-error' : ''}`} placeholder="+7 700 000 00 00" value={form.guest_phone} onChange={set('guest_phone')} />
              </Field>
              <Field label="Пожелания (необязательно)" className="sm:col-span-2" error={errors.special_requests}>
                <textarea rows={3} maxLength={1000} className="input" placeholder="Ранний заезд, детская кроватка…" value={form.special_requests} onChange={set('special_requests')} />
              </Field>
            </div>
          </div>

          <button type="submit" disabled={submitting || (quote && !quote.available)} className="btn-primary w-full py-3 text-base">
            {submitting ? <Spinner className="h-5 w-5" /> : <Lock className="h-5 w-5" />} Забронировать за {money(quote?.total_price || 0)}
          </button>
        </form>

        <aside>
          <div className="card sticky top-24 overflow-hidden">
            <Img src={room.image_url} alt={room.name} className="h-44 w-full object-cover" />
            <div className="space-y-3 p-5">
              <div>
                <p className="text-sm font-medium text-brand-700">{room.hotel.name}</p>
                <h3 className="text-lg font-bold">{room.name}</h3>
                <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {room.hotel.city}, {room.hotel.address}</p>
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between text-slate-600"><span>Цена за ночь</span><span>{money(room.price_per_night)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Ночей</span><span>{quote?.nights ?? '—'}</span></div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-lg font-extrabold"><span>Итого</span><span>{quote ? money(quote.total_price) : '—'}</span></div>
              </div>
              <p className="text-xs text-slate-500">Оплата при заселении. Бесплатная отмена не позднее чем за сутки до заезда.</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
