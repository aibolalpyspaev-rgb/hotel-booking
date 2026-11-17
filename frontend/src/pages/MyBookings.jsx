import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarCheck, CalendarDays, CreditCard, MapPin, MessageSquarePlus, Star, Users, XCircle } from 'lucide-react'
import { ConfirmModal, EmptyState, ErrorBox, Field, Img, Modal, PageHeader, PageLoader, Pagination, Spinner, StatusBadge } from '../components/ui'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks/useFetch'
import { bookingsApi, errorMessage, fieldErrors, reviewsApi } from '../services/api'
import { formatDate, guestsLabel, money, nightsLabel } from '../utils/format'

const TABS = [
  ['', 'Все'],
  ['pending', 'Ожидают'],
  ['confirmed', 'Подтверждённые'],
  ['completed', 'Завершённые'],
  ['cancelled', 'Отменённые'],
]

function ReviewForm({ booking, onDone }) {
  const toast = useToast()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (comment.trim().length < 10) return setErrors({ comment: 'Минимум 10 символов.' })
    setSaving(true)
    try {
      const res = await reviewsApi.create({ booking_id: booking.id, rating, comment })
      toast.success(res.message)
      onDone()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">{booking.room.hotel.name} · {formatDate(booking.check_in)} — {formatDate(booking.check_out)}</p>
      <div>
        <label className="label">Ваша оценка</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} звёзд`}>
              <Star className={`h-8 w-8 transition ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 hover:text-amber-200'}`} />
            </button>
          ))}
        </div>
      </div>
      <Field label="Комментарий" error={errors.comment}>
        <textarea rows={4} maxLength={2000} className={`input ${errors.comment ? 'input-error' : ''}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Расскажите о проживании…" />
      </Field>
      <button className="btn-primary w-full" disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Опубликовать отзыв</button>
    </form>
  )
}

export default function MyBookings() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''
  const page = Number(params.get('page')) || 1
  const { data, loading, error, reload } = useFetch(() => bookingsApi.list({ status, page, per_page: 6 }), [status, page])
  const [cancelling, setCancelling] = useState(null)
  const [busy, setBusy] = useState(false)
  const [reviewFor, setReviewFor] = useState(null)

  const doCancel = async () => {
    setBusy(true)
    try {
      const res = await bookingsApi.cancel(cancelling.id)
      toast.success(res.message)
      setCancelling(null)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const doConfirm = async (b) => {
    try {
      const res = await bookingsApi.confirm(b.id)
      toast.success(res.message)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="container-page py-8">
      <PageHeader title="Мои бронирования" subtitle="История бронирований, статусы и управление" actions={<Link to="/hotels" className="btn-primary">Новое бронирование</Link>} />

      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map(([v, l]) => (
          <button key={l} onClick={() => setParams(v ? { status: v } : {})} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${status === v ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}>
            {l}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data.data.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Бронирований нет" text="Здесь будут отображаться ваши бронирования." action={<Link to="/hotels" className="btn-primary">Найти отель</Link>} />
      ) : (
        <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
          {data.data.map((b) => (
            <article key={b.id} className="card flex flex-col overflow-hidden md:flex-row">
              <Img src={b.room.hotel?.image_url || b.room.image_url} alt="" className="h-40 w-full object-cover md:h-auto md:w-56" />
              <div className="flex flex-1 flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={b.status} />
                    <span className="text-xs text-slate-400">№ {b.code}</span>
                  </div>
                  <Link to={`/hotels/${b.room.hotel.id}`} className="block text-lg font-bold hover:text-brand-700">{b.room.hotel.name}</Link>
                  <p className="flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {b.room.hotel.city} · {b.room.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-slate-400" /> {formatDate(b.check_in)} — {formatDate(b.check_out)}</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4 text-slate-400" /> {guestsLabel(b.guests)}</span>
                  </div>
                  {b.review && <p className="flex items-center gap-1 text-sm text-emerald-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Ваш отзыв: {b.review.rating}/5</p>}
                </div>
                <div className="flex flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:flex-col lg:items-end lg:border-0 lg:pt-0">
                  <div className="lg:text-right">
                    <div className="text-xl font-extrabold">{money(b.total_price)}</div>
                    <div className="text-xs text-slate-500">{nightsLabel(b.nights)} × {money(b.price_per_night)}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {b.status === 'pending' && (
                      <button onClick={() => doConfirm(b)} className="btn-primary btn-sm"><CreditCard className="h-3.5 w-3.5" /> Подтвердить</button>
                    )}
                    {b.can_cancel && (
                      <button onClick={() => setCancelling(b)} className="btn-secondary btn-sm text-rose-600"><XCircle className="h-3.5 w-3.5" /> Отменить</button>
                    )}
                    {b.can_review && (
                      <button onClick={() => setReviewFor(b)} className="btn-primary btn-sm"><MessageSquarePlus className="h-3.5 w-3.5" /> Оставить отзыв</button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
          <Pagination meta={data.meta} onPage={(p) => setParams({ ...(status ? { status } : {}), page: p })} />
        </div>
      )}

      <ConfirmModal
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={doCancel}
        loading={busy}
        danger
        title="Отменить бронирование?"
        text={cancelling ? `Бронирование ${cancelling.code} в отеле «${cancelling.room.hotel.name}» будет отменено, а номер станет доступен другим гостям.` : ''}
        confirmText="Да, отменить"
      />

      <Modal open={Boolean(reviewFor)} onClose={() => setReviewFor(null)} title="Отзыв о проживании">
        {reviewFor && <ReviewForm booking={reviewFor} onDone={() => { setReviewFor(null); reload() }} />}
      </Modal>
    </div>
  )
}
