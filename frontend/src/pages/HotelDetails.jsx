import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, Mail, MapPin, Phone, Search } from 'lucide-react'
import RoomCard from '../components/RoomCard'
import ReviewCard from '../components/ReviewCard'
import { AmenityIcon, ErrorBox, Img, PageLoader, RatingBadge, Stars } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { hotelsApi } from '../services/api'
import { addDays, nightsBetween, nightsLabel, todayISO } from '../utils/format'

export default function HotelDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const checkIn = params.get('check_in') || ''
  const checkOut = params.get('check_out') || ''
  const guests = Number(params.get('guests')) || 0
  const [dates, setDates] = useState({ check_in: checkIn, check_out: checkOut })
  const [photo, setPhoto] = useState(0)

  const { data: hotel, loading, error, reload } = useFetch(
    () => hotelsApi.get(id, checkIn && checkOut ? { check_in: checkIn, check_out: checkOut } : {}),
    [id, checkIn, checkOut],
  )

  if (loading && !hotel) return <PageLoader />
  if (error) return <div className="container-page py-10"><ErrorBox message={error} onRetry={reload} /></div>

  const photos = [hotel.image_url, ...(hotel.gallery || [])].filter(Boolean)
  const nights = nightsBetween(checkIn, checkOut)
  const rooms = guests ? hotel.rooms.filter((r) => r.capacity >= guests) : hotel.rooms
  const hidden = hotel.rooms.length - rooms.length

  const applyDates = (e) => {
    e.preventDefault()
    const p = new URLSearchParams(params)
    if (dates.check_in && dates.check_out && dates.check_out > dates.check_in) {
      p.set('check_in', dates.check_in)
      p.set('check_out', dates.check_out)
    } else {
      p.delete('check_in')
      p.delete('check_out')
    }
    setParams(p)
  }

  return (
    <div className="container-page py-8">
      <button onClick={() => navigate(-1)} className="btn-ghost -ml-3 mb-4">
        <ArrowLeft className="h-4 w-4" /> Назад
      </button>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Stars count={hotel.stars} />
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{hotel.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-slate-500">
            <MapPin className="h-4 w-4" /> {hotel.city}, {hotel.address}
          </p>
        </div>
        <RatingBadge rating={hotel.rating} reviews={hotel.reviews_count} />
      </div>

      {/* Галерея */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="card aspect-[16/9] overflow-hidden">
          <Img src={photos[photo]} alt={hotel.name} className="h-full w-full object-cover" />
        </div>
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-2">
          {photos.slice(0, 4).map((p, i) => (
            <button key={p + i} onClick={() => setPhoto(i)} className={`card aspect-square overflow-hidden ring-2 transition lg:aspect-auto ${photo === i ? 'ring-brand-500' : 'ring-transparent hover:opacity-80'}`}>
              <Img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="text-xl font-bold">Об отеле</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{hotel.description}</p>
            {hotel.amenities?.length > 0 && (
              <>
                <h3 className="mt-6 font-semibold">Удобства</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {hotel.amenities.map((a) => (
                    <span key={a.id} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600"><AmenityIcon name={a.icon} /></span>
                      {a.name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Номера */}
          <section id="rooms">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-bold">Доступные номера</h2>
              {nights > 0 && <p className="text-sm text-slate-500">Цены за {nightsLabel(nights)} указаны с учётом выбранных дат</p>}
            </div>
            <div className="space-y-4">
              {rooms.map((r) => (
                <RoomCard key={r.id} room={r} nights={nights} query={params.toString()} />
              ))}
              {rooms.length === 0 && <p className="card p-6 text-slate-500">Нет номеров для {guests} гостей. Измените количество гостей в поиске.</p>}
              {hidden > 0 && <p className="text-sm text-slate-500">Скрыто номеров, не подходящих по вместимости: {hidden}</p>}
            </div>
          </section>

          {/* Отзывы */}
          <section>
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-2xl font-bold">Отзывы гостей</h2>
              <Link to={`/reviews?hotel_id=${hotel.id}`} className="link text-sm">Все отзывы</Link>
            </div>
            {hotel.reviews.length === 0 ? (
              <p className="card p-6 text-slate-500">Отзывов пока нет. Станьте первым после проживания!</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {hotel.reviews.slice(0, 6).map((r) => <ReviewCard key={r.id} review={r} />)}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <form onSubmit={applyDates} className="card sticky top-24 space-y-4 p-5">
            <h3 className="flex items-center gap-2 font-bold"><CalendarDays className="h-5 w-5 text-brand-600" /> Проверить даты</h3>
            <div>
              <label className="label">Заезд</label>
              <input type="date" className="input" min={todayISO()} value={dates.check_in} onChange={(e) => setDates((d) => ({ check_in: e.target.value, check_out: d.check_out > e.target.value ? d.check_out : addDays(e.target.value, 1) }))} />
            </div>
            <div>
              <label className="label">Выезд</label>
              <input type="date" className="input" min={dates.check_in ? addDays(dates.check_in, 1) : todayISO()} value={dates.check_out} onChange={(e) => setDates((d) => ({ ...d, check_out: e.target.value }))} />
            </div>
            <button className="btn-primary w-full"><Search className="h-4 w-4" /> Показать свободные номера</button>
            <div className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-slate-400" /> Заезд с {hotel.check_in_time}, выезд до {hotel.check_out_time}</p>
              {hotel.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {hotel.phone}</p>}
              {hotel.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {hotel.email}</p>}
            </div>
          </form>
        </aside>
      </div>
    </div>
  )
}
