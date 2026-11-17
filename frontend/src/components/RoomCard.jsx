import { Link } from 'react-router-dom'
import { BedDouble, CheckCircle2, Maximize2, Users, XCircle } from 'lucide-react'
import { AmenityIcon, Img } from './ui'
import { money, nightsLabel } from '../utils/format'

export default function RoomCard({ room, nights = 0, query = '' }) {
  const unavailable = room.is_available === false
  const suffix = query ? `?${query}` : ''

  return (
    <div className={`card flex flex-col overflow-hidden md:flex-row ${unavailable ? 'opacity-70' : ''}`}>
      <Link to={`/rooms/${room.id}${suffix}`} className="relative h-48 shrink-0 overflow-hidden md:h-auto md:w-64">
        <Img src={room.image_url} alt={room.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold text-slate-700">{room.type_label}</span>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5 md:flex-row md:items-stretch">
        <div className="flex-1">
          <Link to={`/rooms/${room.id}${suffix}`} className="text-lg font-bold hover:text-brand-700">
            {room.name}
          </Link>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" /> до {room.capacity} гостей</span>
            <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-slate-400" /> {room.beds} кров.</span>
            {room.area && <span className="flex items-center gap-1.5"><Maximize2 className="h-4 w-4 text-slate-400" /> {room.area} м²</span>}
          </div>
          {room.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{room.description}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {room.amenities?.slice(0, 6).map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                <AmenityIcon name={a.icon} className="h-3.5 w-3.5" /> {a.name}
              </span>
            ))}
            {room.amenities?.length > 6 && <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">+{room.amenities.length - 6}</span>}
          </div>
        </div>
        <div className="flex flex-row items-end justify-between gap-3 border-t border-slate-100 pt-3 md:w-48 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="md:text-right">
            <div className="text-2xl font-extrabold">{money(room.price_per_night)}</div>
            <div className="text-xs text-slate-500">за ночь</div>
            {nights > 0 && (
              <div className="mt-1 text-sm font-medium text-slate-700">
                {money(room.price_per_night * nights)} за {nightsLabel(nights)}
              </div>
            )}
            {room.is_available !== undefined && (
              <div className={`mt-2 flex items-center gap-1 text-xs font-semibold md:justify-end ${unavailable ? 'text-rose-600' : 'text-emerald-600'}`}>
                {unavailable ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {unavailable ? 'Занят на эти даты' : 'Свободен на эти даты'}
              </div>
            )}
          </div>
          {unavailable ? (
            <Link to={`/rooms/${room.id}`} className="btn-secondary">Другие даты</Link>
          ) : (
            <Link to={`/booking/${room.id}${suffix}`} className="btn-primary">Забронировать</Link>
          )}
        </div>
      </div>
    </div>
  )
}
