import { Link } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { Logo } from './Navbar'

export default function Footer() {
  return (
    <footer className="mt-20 bg-slate-900 text-slate-300">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed text-slate-400">
            Сервис онлайн-бронирования отелей Казахстана с интеллектуальным помощником, который подберёт номер за минуту.
          </p>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Навигация</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/hotels" className="hover:text-white">Каталог отелей</Link></li>
            <li><Link to="/reviews" className="hover:text-white">Отзывы гостей</Link></li>
            <li><Link to="/about" className="hover:text-white">О сервисе</Link></li>
            <li><Link to="/my-bookings" className="hover:text-white">Мои бронирования</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Популярные города</h4>
          <ul className="space-y-2 text-sm">
            {['Астана', 'Алматы', 'Шымкент', 'Туркестан', 'Актау'].map((c) => (
              <li key={c}><Link to={`/hotels?city=${encodeURIComponent(c)}`} className="hover:text-white">Отели в городе {c}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Контакты</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand-400" /> +7 (700) 000-00-00</li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand-400" /> support@hotelbooking.kz</li>
            <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-brand-400" /> Астана, Казахстан</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} StayEasy. Курсовой проект: веб-сервис бронирования номеров отелей.</p>
          <p>Laravel 12 · React · MySQL</p>
        </div>
      </div>
    </footer>
  )
}
