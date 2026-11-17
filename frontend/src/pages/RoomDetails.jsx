import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BedDouble, CalendarX, CheckCircle2, Maximize2, Users, XCircle } from 'lucide-react'
import { AmenityIcon, ErrorBox, Img, PageLoader, Spinner, Stars } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { errorMessage, roomsApi } from '../services/api'
import { addDays, formatDate, money, nightsLabel, todayISO } from '../utils/format'

export default function RoomDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data, loading, error, reload } = useFetch(() => roomsApi.get(id), [id])
  const [dates, setDates] = useState({ check_in: params.get('check_in') || '', check_out: params.get('check_out') || '' })
  const [quote, setQuote] = useState(null)
  const [checking, setChecking] = useState(false)
  const [quoteError, setQuoteError] = useState('')

  // Проверка занятости и расчёт стоимости при изменении дат
  useEffect(() => {
    setQuote(null)
    setQuoteError('')
    if (!dates.check_in || !dates.check_out || dates.check_out <= dates.check_in) return
    setChecking(true)
    roomsApi
      .availability(id, dates)
      .then(setQuote)
      .catch((e) => setQuoteError(errorMessage(e)))
      .finally(() => setChecking(false))
  }, [id, dates])

  if (loading) return <PageLoader />
  if (error) return <div className="container-page py-10"><ErrorBox message={error} onRetry={reload} /></div>

  const room = data.data
  const occupied = data.occupied || []
  const guests = params.get('guests')
  const bookQuery = new URLSearchParams({ ...dates, ...(guests ? { guests } : {}) }).toString()

  return (
    <div className="container-page py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="card aspect-[16/9] overflow-hidden">
            <Img src={room.image_url} alt={room.name} className="h-full w-full object-cover" />
          </div>
          <div className="mt-6">
            <Link to={`/hotels/${room.hotel.id}`} className="link text-sm">
              {room.hotel.name} · {room.hotel.city}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold">{room.name}</h1>
              <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">{room.type_label}</span>
            </div>
            <Stars count={room.hotel.stars} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              [Users, `до ${room.capacity}`, 'гостей'],
              [BedDouble, room.beds, 'кровати'],
              [Maximize2, room.area ? `${room.area} м²` : '—', 'площадь'],
            ].map(([Icon, v, l]) => (
              <div key={l} className="card p-4 text-center">
                <Icon className="mx-auto h-6 w-6 text-brand-600" />
                <div className="mt-2 text-lg font-bold">{v}</div>
                <div className="text-xs text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          <section className="card mt-6 p-6">
            <h2 className="text-xl font-bold">Описание номера</h2>
            <p className="mt-3 text-slate-600">{room.description || 'Описание отсутствует.'}</p>
            <h3 className="mt-6 font-semibold">Удобства в номере</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {room.amenities.map((a) => (
                <span key={a.id} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600"><AmenityIcon name={a.icon} /></span>
                  {a.name}
                </span>
              ))}
            </div>
          </section>

          <section className="card mt-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold"><CalendarX className="h-5 w-5 text-rose-500" /> Занятые даты</h2>
            {occupied.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Ближайшие даты полностью свободны.</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {occupied.map((o) => (
                  <span key={o.check_in} className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm text-rose-700 ring-1 ring-rose-100">
                    {formatDate(o.check_in, { day: 'numeric', month: 'short' })} — {formatDate(o.check_out, { day: 'numeric', month: 'short' })}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">День выезда одного гостя может быть днём заезда другого.</p>
          </section>
        </div>

        <aside>
          <div className="card sticky top-24 p-6">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold">{money(room.price_per_night)}</span>
              <span className="text-slate-500">/ ночь</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div>
                <label className="label">Заезд</label>
                <input type="date" className="input" min={todayISO()} value={dates.check_in} onChange={(e) => setDates((d) => ({ check_in: e.target.value, check_out: d.check_out > e.target.value ? d.check_out : addDays(e.target.value, 1) }))} />
              </div>
              <div>
                <label className="label">Выезд</label>
                <input type="date" className="input" min={dates.check_in ? addDays(dates.check_in, 1) : todayISO()} value={dates.check_out} onChange={(e) => setDates((d) => ({ ...d, check_out: e.target.value }))} />
              </div>
            </div>

            <div className="mt-4 min-h-[88px] rounded-xl bg-slate-50 p-4 text-sm">
              {checking ? (
                <span className="flex items-center gap-2 text-slate-500"><Spinner className="h-4 w-4" /> Проверяем занятость…</span>
              ) : quoteError ? (
                <span className="text-rose-600">{quoteError}</span>
              ) : quote ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>{money(quote.price_per_night)} × {nightsLabel(quote.nights)}</span>
                    <span>{money(quote.total_price)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                    <span>Итого</span>
                    <span>{money(quote.total_price)}</span>
                  </div>
                  <p className={`flex items-center gap-1.5 font-semibold ${quote.available ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {quote.available ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {quote.available ? 'Номер свободен' : 'Номер занят на эти даты'}
                  </p>
                </div>
              ) : (
                <span className="text-slate-500">Выберите даты, чтобы увидеть стоимость и проверить, свободен ли номер.</span>
              )}
            </div>

            <Link
              to={`/booking/${room.id}?${bookQuery}`}
              className={`btn-primary mt-4 w-full py-3 ${quote && !quote.available ? 'pointer-events-none opacity-50' : ''}`}
            >
              Забронировать
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">Бесплатная отмена за сутки до заезда</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
