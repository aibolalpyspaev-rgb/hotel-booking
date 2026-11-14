export const money = (v) => `${new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))} ₸`

export const formatDate = (iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('ru-RU', opts) : '—'

export const shortDate = (iso) => formatDate(iso, { day: '2-digit', month: '2-digit', year: 'numeric' })

/** YYYY-MM-DD в локальной зоне */
export const toISODate = (d) => {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export const todayISO = () => toISODate(new Date())

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0
  const diff = (new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000
  return diff > 0 ? Math.round(diff) : 0
}

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100
  const b = a % 10
  if (a > 10 && a < 20) return many
  if (b > 1 && b < 5) return few
  if (b === 1) return one
  return many
}

export const nightsLabel = (n) => `${n} ${plural(n, 'ночь', 'ночи', 'ночей')}`
export const guestsLabel = (n) => `${n} ${plural(n, 'гость', 'гостя', 'гостей')}`

export const STATUS = {
  pending: { label: 'Ожидает подтверждения', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  confirmed: { label: 'Подтверждено', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { label: 'Отменено', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-500' },
  completed: { label: 'Завершено', cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200', dot: 'bg-slate-500' },
}

export const ROOM_TYPES = {
  standard: 'Стандарт',
  comfort: 'Комфорт',
  deluxe: 'Делюкс',
  suite: 'Люкс',
  family: 'Семейный',
}

export const FALLBACK_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cffafe"/><stop offset="1" stop-color="#a5f3fc"/></linearGradient></defs><rect width="400" height="260" fill="url(#g)"/><path d="M160 170v-60l40-24 40 24v60h-28v-34h-24v34z" fill="#0891b2" opacity=".55"/></svg>',
  )
