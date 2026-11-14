import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, KeyRound, Mail, MessageSquare, Phone, Save, User } from 'lucide-react'
import { Field, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks/useFetch'
import { authApi, bookingsApi, errorMessage, fieldErrors } from '../services/api'
import { formatDate, money } from '../utils/format'

export default function Profile() {
  const { user, setUser } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone || '', current_password: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const bookings = useFetch(() => bookingsApi.list({ per_page: 3 }), [])
  const me = useFetch(() => authApi.me(), [])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (form.name.trim().length < 2) v.name = 'Минимум 2 символа.'
    if (form.password && form.password.length < 8) v.password = 'Минимум 8 символов.'
    if (form.password && form.password !== form.password_confirmation) v.password_confirmation = 'Пароли не совпадают.'
    if (form.password && !form.current_password) v.current_password = 'Укажите текущий пароль.'
    if (Object.keys(v).length) return setErrors(v)

    setSaving(true)
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone || null }
      if (form.password) Object.assign(payload, { current_password: form.current_password, password: form.password, password_confirmation: form.password_confirmation })
      const res = await authApi.updateProfile(payload)
      setUser(res.user)
      setForm((f) => ({ ...f, current_password: '', password: '', password_confirmation: '' }))
      toast.success(res.message)
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container-page py-8">
      <PageHeader title="Личный кабинет" subtitle="Ваши данные и последние бронирования" />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-3xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-3 text-lg font-bold">{user.name}</h2>
            <p className="flex items-center justify-center gap-1 text-sm text-slate-500"><Mail className="h-3.5 w-3.5" /> {user.email}</p>
            {user.phone && <p className="flex items-center justify-center gap-1 text-sm text-slate-500"><Phone className="h-3.5 w-3.5" /> {user.phone}</p>}
            <span className="badge mt-3 bg-brand-50 text-brand-700">{user.role_label}</span>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              <div>
                <div className="text-2xl font-extrabold text-brand-700">{me.data?.bookings_count ?? '—'}</div>
                <div className="text-xs text-slate-500">бронирований</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-brand-700">{me.data?.reviews_count ?? '—'}</div>
                <div className="text-xs text-slate-500">отзывов</div>
              </div>
            </div>
          </div>
          <Link to="/my-bookings" className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
            <CalendarCheck className="h-5 w-5 text-brand-600" /> <span className="font-medium">Мои бронирования</span>
          </Link>
          <Link to="/reviews" className="card flex items-center gap-3 p-4 transition hover:shadow-lift">
            <MessageSquare className="h-5 w-5 text-brand-600" /> <span className="font-medium">Отзывы</span>
          </Link>
        </aside>

        <div className="space-y-6">
          <section className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Последние бронирования</h2>
              <Link to="/my-bookings" className="link text-sm">Все бронирования</Link>
            </div>
            {bookings.loading ? (
              <Spinner className="h-5 w-5 text-brand-600" />
            ) : bookings.data?.data.length ? (
              <div className="divide-y divide-slate-100">
                {bookings.data.data.map((b) => (
                  <div key={b.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{b.room.hotel.name}</p>
                      <p className="text-sm text-slate-500">{b.room.name} · {formatDate(b.check_in)} — {formatDate(b.check_out)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{money(b.total_price)}</span>
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Бронирований пока нет. <Link to="/hotels" className="link">Найти отель</Link></p>
            )}
          </section>

          <form onSubmit={submit} className="card space-y-5 p-6" noValidate>
            <h2 className="flex items-center gap-2 text-lg font-bold"><User className="h-5 w-5 text-brand-600" /> Редактирование профиля</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Имя" error={errors.name}><input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} /></Field>
              <Field label="Email" error={errors.email}><input type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} /></Field>
              <Field label="Телефон" error={errors.phone}><input className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+7 700 000 00 00" /></Field>
            </div>
            <h3 className="flex items-center gap-2 border-t border-slate-100 pt-5 font-semibold"><KeyRound className="h-4 w-4 text-slate-400" /> Смена пароля (необязательно)</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Текущий пароль" error={errors.current_password}><input type="password" className={`input ${errors.current_password ? 'input-error' : ''}`} value={form.current_password} onChange={set('current_password')} /></Field>
              <Field label="Новый пароль" error={errors.password}><input type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} /></Field>
              <Field label="Повторите пароль" error={errors.password_confirmation}><input type="password" className={`input ${errors.password_confirmation ? 'input-error' : ''}`} value={form.password_confirmation} onChange={set('password_confirmation')} /></Field>
            </div>
            <button className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />} Сохранить изменения
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
