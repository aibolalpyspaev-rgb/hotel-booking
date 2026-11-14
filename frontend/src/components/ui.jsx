import { useEffect } from 'react'
import {
  AlertCircle, Baby, Bath, Building2, Car, Check, ChevronLeft, ChevronRight, Coffee, Dumbbell, Inbox, Laptop, Loader2,
  Lock, Mountain, PawPrint, Plane, Shirt, Sparkles, Star, Tv, Utensils, Waves, Wifi, Wind, Wine, X,
} from 'lucide-react'

const AMENITY_ICONS = {
  wifi: Wifi, wind: Wind, tv: Tv, coffee: Coffee, car: Car, waves: Waves, sparkles: Sparkles, dumbbell: Dumbbell,
  plane: Plane, utensils: Utensils, wine: Wine, 'building-2': Building2, 'paw-print': PawPrint, laptop: Laptop,
  bath: Bath, baby: Baby, shirt: Shirt, lock: Lock, mountain: Mountain, check: Check,
}
import { FALLBACK_IMG, STATUS } from '../utils/format'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin ${className}`} />
}

export function PageLoader({ text = 'Загрузка…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="h-8 w-8 text-brand-600" />
      <p className="text-sm">{text}</p>
    </div>
  )
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-rose-500" />
      <p className="text-slate-700">{message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="rounded-2xl bg-brand-50 p-4 text-brand-600">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-md text-sm text-slate-500">{text}</p>}
      {action}
    </div>
  )
}

export function Stars({ count = 0, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${count} звёзд`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`${className} ${i < count ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
      ))}
    </span>
  )
}

export function RatingBadge({ rating, reviews }) {
  const r = Number(rating) || 0
  const text = r >= 4.5 ? 'Превосходно' : r >= 4 ? 'Очень хорошо' : r >= 3 ? 'Хорошо' : r > 0 ? 'Неплохо' : 'Нет оценок'
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-lg bg-brand-600 px-2 py-1 text-sm font-bold text-white">{r ? r.toFixed(1) : '—'}</span>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-slate-800">{text}</div>
        {reviews !== undefined && <div className="text-xs text-slate-500">{reviews} отзывов</div>}
      </div>
    </div>
  )
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span className={`badge ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function Img({ src, alt, className = '' }) {
  return (
    <img
      src={src || FALLBACK_IMG}
      alt={alt}
      loading="lazy"
      className={className}
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_IMG) e.currentTarget.src = FALLBACK_IMG
      }}
    />
  )
}

/** Иконка удобства по имени lucide (например, "wifi" → Wifi) */
export function AmenityIcon({ name, className = 'h-4 w-4' }) {
  const Icon = AMENITY_ICONS[name] || Check
  return <Icon className={className} />
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null
  const { current_page: page, last_page: last } = meta
  const pages = Array.from({ length: last }, (_, i) => i + 1).filter((p) => p === 1 || p === last || Math.abs(p - page) <= 1)

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Страницы">
      <button className="btn-ghost btn-sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <button
            onClick={() => onPage(p)}
            className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${p === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {p}
          </button>
        </span>
      ))}
      <button className="btn-ghost btn-sm" disabled={page === last} onClick={() => onPage(page + 1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

export function Modal({ open, onClose, title, children, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[92vh] w-full ${size} animate-pop overflow-y-auto rounded-t-2xl bg-white shadow-lift sm:rounded-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmModal({ open, onClose, onConfirm, title, text, confirmText = 'Подтвердить', danger, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="max-w-md">
      <p className="text-sm text-slate-600">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-secondary" onClick={onClose}>
          Отмена
        </button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
          {loading && <Spinner className="h-4 w-4" />}
          {confirmText}
        </button>
      </div>
    </Modal>
  )
}

/** Поле формы с подписью и ошибкой */
export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
