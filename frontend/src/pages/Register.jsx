import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { UserPlus } from 'lucide-react'
import { Field, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { errorMessage, fieldErrors } from '../services/api'
import { AuthShell } from './Login'

export default function Register() {
  const { register, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const validate = () => {
    const v = {}
    if (form.name.trim().length < 2) v.name = 'Введите имя (минимум 2 символа).'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) v.email = 'Введите корректный email.'
    if (form.phone && !/^\+?[0-9\s\-()]{10,20}$/.test(form.phone)) v.phone = 'Формат: +7 700 000 00 00'
    if (form.password.length < 8) v.password = 'Минимум 8 символов.'
    else if (!/[A-Za-zА-Яа-я]/.test(form.password) || !/\d/.test(form.password)) v.password = 'Пароль должен содержать буквы и цифры.'
    if (form.password !== form.password_confirmation) v.password_confirmation = 'Пароли не совпадают.'
    setErrors(v)
    return !Object.keys(v).length
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const u = await register(form)
      toast.success(`Регистрация прошла успешно. Добро пожаловать, ${u.name}!`)
      navigate('/', { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Регистрация" subtitle="Создайте аккаунт, чтобы бронировать номера в пару кликов.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Имя" error={errors.name}>
          <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Айгерим Нурланова" autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Телефон (необязательно)" error={errors.phone}>
          <input className={`input ${errors.phone ? 'input-error' : ''}`} value={form.phone} onChange={set('phone')} placeholder="+7 700 000 00 00" autoComplete="tel" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Пароль" error={errors.password}>
            <input type="password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Повторите пароль" error={errors.password_confirmation}>
            <input type="password" className={`input ${errors.password_confirmation ? 'input-error' : ''}`} value={form.password_confirmation} onChange={set('password_confirmation')} autoComplete="new-password" />
          </Field>
        </div>
        <button className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} Зарегистрироваться
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Уже есть аккаунт? <Link to="/login" className="link">Войти</Link>
      </p>
    </AuthShell>
  )
}
