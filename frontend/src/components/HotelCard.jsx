import { Link } from 'react-router-dom'
import { ArrowRight, MapPin, Star } from 'lucide-react'
import { Img, Stars } from './ui'
import { money } from '../utils/format'

export default function HotelCard({ hotel, query = '', horizontal = false }) {
  const href = `/hotels/${hotel.id}${query ? `?${query}` : ''}`

  if (horizontal) {
    return (
      <Link to={href} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift sm:flex-row">
        <div className="relative h-52 shrink-0 overflow-hidden sm:h-auto sm:w-72">
          <Img src={hotel.image_url} alt={hotel.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Stars count={hotel.stars} className="h-3.5 w-3.5" />
              <h3 className="mt-1 text-lg font-bold group-hover:text-brand-700">{hotel.name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> {hotel.city}, {hotel.address}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-sm font-bold text-brand-700">
              <Star className="h-3.5 w-3.5 fill-brand-600 text-brand-600" />
              {Number(hotel.rating).toFixed(1)}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{hotel.short_description}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div className="text-xs text-slate-500">
              {hotel.reviews_count ?? 0} отзывов
              {hotel.available_rooms_count !== undefined && <span className="ml-2 text-emerald-600">· {hotel.available_rooms_count} подходящих номеров</span>}
            </div>
            <div className="text-right">
              {hotel.min_price ? (
                <>
                  <div className="text-xs text-slate-500">за ночь от</div>
                  <div className="text-xl font-extrabold text-slate-900">{money(hotel.min_price)}</div>
                </>
              ) : (
                <div className="text-sm text-slate-500">Нет свободных номеров</div>
              )}
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Подробнее <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link to={href} className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Img src={hotel.image_url} alt={hotel.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-xs font-bold text-slate-800 shadow-sm">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {Number(hotel.rating).toFixed(1)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Stars count={hotel.stars} className="h-3.5 w-3.5" />
        <h3 className="mt-1 font-bold group-hover:text-brand-700">{hotel.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" /> {hotel.city}
        </p>
        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{hotel.short_description}</p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <span className="text-xs text-slate-500">от </span>
            <span className="text-lg font-extrabold">{hotel.min_price ? money(hotel.min_price) : '—'}</span>
            <span className="text-xs text-slate-500"> / ночь</span>
          </div>
          <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">Подробнее</span>
        </div>
      </div>
    </Link>
  )
}
