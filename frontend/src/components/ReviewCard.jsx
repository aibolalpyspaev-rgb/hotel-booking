import { Link } from 'react-router-dom'
import { Quote } from 'lucide-react'
import { Stars } from './ui'
import { formatDate } from '../utils/format'

export default function ReviewCard({ review, showHotel = false, actions }) {
  return (
    <article className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-bold text-brand-800">
            {review.user?.name?.charAt(0) || '?'}
          </span>
          <div>
            <p className="font-semibold">{review.user?.name || 'Гость'}</p>
            <p className="text-xs text-slate-500">{formatDate(review.created_at)}</p>
          </div>
        </div>
        <Stars count={review.rating} className="h-3.5 w-3.5" />
      </div>
      <p className="relative mt-4 flex-1 text-sm leading-relaxed text-slate-600">
        <Quote className="absolute -left-1 -top-1 h-6 w-6 text-brand-100" />
        <span className="relative">{review.comment}</span>
      </p>
      {showHotel && review.hotel && (
        <Link to={`/hotels/${review.hotel.id}`} className="mt-4 text-sm font-semibold text-brand-700 hover:underline">
          {review.hotel.name} · {review.hotel.city}
        </Link>
      )}
      {actions && <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">{actions}</div>}
    </article>
  )
}
