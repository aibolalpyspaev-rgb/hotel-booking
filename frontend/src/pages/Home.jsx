import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Bot, CalendarCheck, CreditCard, Headphones, Search, ShieldCheck, Sparkles, Star } from 'lucide-react'
import SearchForm from '../components/SearchForm'
import HotelCard from '../components/HotelCard'
import ReviewCard from '../components/ReviewCard'
import { Img } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { hotelsApi, publicApi, reviewsApi, roomsApi } from '../services/api'
import { money } from '../utils/format'

function SkeletonCards({ n = 4 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="card animate-pulse overflow-hidden">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-1/3 rounded bg-slate-200" />
      </div>
    </div>
  ))
}

const advantages = [
  { icon: ShieldCheck, title: 'Гарантия брони', text: 'Система проверяет занятость номера в реальном времени — двойное бронирование исключено.' },
  { icon: CreditCard, title: 'Без скрытых платежей', text: 'Итоговая стоимость рассчитывается сразу: цена за ночь × количество ночей.' },
  { icon: Bot, title: 'AI-помощник 24/7', text: 'Hotel Assistant подберёт отель под ваш бюджет и ответит на вопросы о бронировании.' },
  { icon: Headphones, title: 'Бесплатная отмена', text: 'Отмените бронирование в личном кабинете не позднее чем за сутки до заезда.' },
]

const steps = [
  { icon: Search, title: 'Найдите отель', text: 'Укажите город, даты и количество гостей или спросите AI-помощника.' },
  { icon: BadgeCheck, title: 'Выберите номер', text: 'Сравните номера, удобства и цены. Свободные даты видны сразу.' },
  { icon: CalendarCheck, title: 'Забронируйте', text: 'Подтвердите бронь в пару кликов — она появится в личном кабинете.' },
]

export default function Home() {
  const popular = useFetch(() => hotelsApi.list({ sort: 'popular', per_page: 8 }), [])
  const rooms = useFetch(() => roomsApi.list({ sort: 'recommended', per_page: 4 }), [])
  const reviews = useFetch(() => reviewsApi.list({ sort: 'rating', per_page: 3 }), [])
  const stats = useFetch(() => publicApi.stats(), [])

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-50" />
        </div>
        <div className="container-page relative pb-16 pt-16 sm:pt-24">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/25 backdrop-blur">
              <Sparkles className="h-4 w-4" /> Подбор отелей с AI-помощником
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Найдите идеальный отель для вашего путешествия
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-200">
              Лучшие отели Казахстана: сравнивайте цены, проверяйте свободные даты и бронируйте номер онлайн за пару минут.
            </p>
          </div>
          <div className="mt-10 animate-fade-up [animation-delay:150ms]">
            <SearchForm />
          </div>
          {stats.data && (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                [stats.data.hotels, 'отелей'],
                [stats.data.rooms, 'номеров'],
                [stats.data.cities, 'городов'],
                [stats.data.average_rating || '—', 'средняя оценка'],
              ].map(([v, l]) => (
                <div key={l} className="card px-4 py-3 text-center">
                  <div className="text-2xl font-extrabold text-brand-700">{v}</div>
                  <div className="text-xs text-slate-500">{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Популярные отели */}
      <section className="container-page mt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="section-title">Популярные отели</h2>
            <p className="mt-1 text-slate-500">Выбор наших гостей по количеству отзывов и рейтингу</p>
          </div>
          <Link to="/hotels" className="hidden items-center gap-1 font-semibold text-brand-700 hover:underline sm:flex">
            Все отели <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {popular.loading ? <SkeletonCards /> : popular.data?.data.map((h) => <HotelCard key={h.id} hotel={h} />)}
        </div>
        {popular.error && <p className="text-rose-600">{popular.error}</p>}
      </section>

      {/* Рекомендуемые номера */}
      <section className="container-page mt-16">
        <h2 className="section-title">Рекомендуемые номера</h2>
        <p className="mt-1 text-slate-500">Номера в отелях с самым высоким рейтингом</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {rooms.loading ? (
            <SkeletonCards />
          ) : (
            rooms.data?.data.map((r) => (
              <Link key={r.id} to={`/rooms/${r.id}`} className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lift">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Img src={r.image_url} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2 py-1 text-xs font-semibold">{r.type_label}</span>
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-brand-700">{r.hotel?.name} · {r.hotel?.city}</p>
                  <h3 className="mt-1 font-bold">{r.name}</h3>
                  <p className="text-sm text-slate-500">до {r.capacity} гостей · {r.area} м²</p>
                  <p className="mt-2 text-lg font-extrabold">{money(r.price_per_night)} <span className="text-xs font-normal text-slate-500">/ ночь</span></p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Преимущества */}
      <section className="container-page mt-16">
        <h2 className="section-title text-center">Почему выбирают нас</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {advantages.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6 transition hover:-translate-y-1 hover:shadow-lift">
              <div className="inline-flex rounded-xl bg-brand-50 p-3 text-brand-600">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Как работает бронирование */}
      <section className="mt-16 bg-white py-16">
        <div className="container-page">
          <h2 className="section-title text-center">Как работает бронирование</h2>
          <p className="mt-2 text-center text-slate-500">Три простых шага до вашего идеального отдыха</p>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lift">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="absolute left-1/2 top-0 ml-6 -translate-y-2 rounded-full bg-amber-400 px-2 text-xs font-bold text-slate-900">{i + 1}</span>
                <h3 className="mt-5 text-lg font-bold">{title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Отзывы */}
      <section className="container-page mt-16">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="section-title">Отзывы клиентов</h2>
            <p className="mt-1 flex items-center gap-1 text-slate-500">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Отзывы оставляют только реальные гости после проживания
            </p>
          </div>
          <Link to="/reviews" className="hidden items-center gap-1 font-semibold text-brand-700 hover:underline sm:flex">
            Все отзывы <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.data?.data.map((r) => <ReviewCard key={r.id} review={r} showHotel />)}
        </div>
      </section>

      {/* CTA AI */}
      <section className="container-page mt-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white sm:p-12">
          <Bot className="absolute -right-6 -top-6 h-48 w-48 text-white/10" />
          <h2 className="max-w-xl text-2xl font-bold text-white sm:text-3xl">Не знаете, что выбрать? Спросите Hotel Assistant</h2>
          <p className="mt-3 max-w-xl text-brand-100">
            Напишите, например, «Найди недорогой отель в Астане на двоих» — помощник уточнит бюджет и покажет подходящие варианты из нашей базы.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Кнопка чата — в правом нижнем углу
          </p>
        </div>
      </section>
    </>
  )
}
