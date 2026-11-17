import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BedDouble, CalendarCheck, ExternalLink, Hotel, LayoutDashboard, LogOut, Menu, MessageSquare, Sparkles, Users, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/Navbar'

const items = [
  { to: '/admin', label: 'Статистика', icon: LayoutDashboard, end: true },
  { to: '/admin/hotels', label: 'Отели', icon: Hotel },
  { to: '/admin/rooms', label: 'Номера', icon: BedDouble },
  { to: '/admin/bookings', label: 'Бронирования', icon: CalendarCheck },
  { to: '/admin/users', label: 'Пользователи', icon: Users },
  { to: '/admin/reviews', label: 'Отзывы', icon: MessageSquare },
  { to: '/admin/amenities', label: 'Удобства', icon: Sparkles },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const nav = (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`
          }
        >
          <Icon className="h-5 w-5" /> {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">Администрирование</p>
        </div>
        {nav}
        <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <ExternalLink className="h-4 w-4" /> На сайт
          </Link>
          <button
            onClick={async () => {
              await logout()
              navigate('/')
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
          <p className="truncate px-3 pt-2 text-xs text-slate-400">{user?.email}</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo />
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Меню">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>
      {open && (
        <div className="sticky top-14 z-20 border-b border-slate-200 bg-white p-3 lg:hidden">
          {nav}
          <Link to="/" className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
            <ExternalLink className="h-4 w-4" /> На сайт
          </Link>
        </div>
      )}

      <main className="p-4 sm:p-6 lg:ml-64 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
