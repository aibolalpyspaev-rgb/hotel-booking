import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { Field, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage, fieldErrors } from '../services/api'

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="card p-8">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { login, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Введите корректный email.'
    if (!form.password) v.password = 'Введите пароль.'
    if (Object.keys(v).length) return setErrors(v)

    setLoading(true)
    try {
      const u = await login(form)
      toast.success(`Добро пожаловать, ${u.name}!`)
      navigate(location.state?.from || (u.role === 'admin' ? '/admin' : '/'), { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
      if (!err.response?.data?.errors) toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const fill = (email, password) => setForm({ email, password })

  return (
    <AuthShell title="Вход в аккаунт" subtitle="Войдите, чтобы бронировать номера и управлять бронированиями.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="Пароль" error={errors.password}>
          <input type="password" autoComplete="current-password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} placeholder="••••••••" />
        </Field>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />} Войти
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Нет аккаунта? <Link to="/register" className="link">Зарегистрируйтесь</Link>
      </p>
      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 ring-1 ring-slate-100">
        <p className="mb-2 font-semibold text-slate-700">Тестовые аккаунты (нажмите, чтобы подставить):</p>
        <button type="button" onClick={() => fill('admin@hotel.kz', 'admin123')} className="block hover:text-brand-700">Администратор: admin@hotel.kz / admin123</button>
        <button type="button" onClick={() => fill('user@hotel.kz', 'user1234')} className="mt-1 block hover:text-brand-700">Пользователь: user@hotel.kz / user1234</button>
      </div>
    </AuthShell>
  )
}
