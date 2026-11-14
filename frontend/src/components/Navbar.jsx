import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { CalendarCheck, ChevronDown, Hotel, LayoutDashboard, LogOut, Menu, User, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Главная', end: true },
  { to: '/hotels', label: 'Отели' },
  { to: '/reviews', label: 'Отзывы' },
  { to: '/about', label: 'О сервисе' },
]

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <Hotel className="h-5 w-5" />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Stay<span className="text-brand-600">Easy</span>
      </span>
    </Link>
  )
}

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const menuRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setMenu(false)
  }, [location.pathname])

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const linkCls = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`

  return (
    <header className={`sticky top-0 z-40 border-b transition-all ${scrolled ? 'border-slate-200 bg-white/90 backdrop-blur-md' : 'border-transparent bg-white'}`}>
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[140px] truncate text-sm font-medium text-slate-700">{user.name}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-56 animate-pop overflow-hidden rounded-xl bg-white py-1 shadow-lift ring-1 ring-slate-900/5">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <LayoutDashboard className="h-4 w-4" /> Панель администратора
                    </Link>
                  )}
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <User className="h-4 w-4" /> Личный кабинет
                  </Link>
                  <Link to="/my-bookings" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <CalendarCheck className="h-4 w-4" /> Мои бронирования
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
                    <LogOut className="h-4 w-4" /> Выйти
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Войти
              </Link>
              <Link to="/register" className="btn-primary">
                Регистрация
              </Link>
            </>
          )}
        </div>

        <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Меню">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="animate-fade-up border-t border-slate-100 bg-white md:hidden">
          <nav className="container-page flex flex-col gap-1 py-3">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {l.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-slate-100" />
            {user ? (
              <>
                {isAdmin && (
                  <NavLink to="/admin" className={linkCls}>
                    Панель администратора
                  </NavLink>
                )}
                <NavLink to="/profile" className={linkCls}>
                  Личный кабинет
                </NavLink>
                <NavLink to="/my-bookings" className={linkCls}>
                  Мои бронирования
                </NavLink>
                <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
                  Выйти
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn-secondary">
                  Войти
                </Link>
                <Link to="/register" className="btn-primary">
                  Регистрация
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
