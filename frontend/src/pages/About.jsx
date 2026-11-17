import { Link } from 'react-router-dom'
import { Bot, Database, Lock, Server, ShieldCheck, Zap } from 'lucide-react'

const features = [
  { icon: Zap, title: 'Бронирование в реальном времени', text: 'Каждое бронирование проверяется на пересечение дат прямо на сервере в транзакции с блокировкой номера — двух гостей на одни даты быть не может.' },
  { icon: Bot, title: 'Hotel Assistant', text: 'Интеллектуальный помощник понимает запросы на естественном языке, уточняет бюджет и показывает реальные отели из базы данных.' },
  { icon: ShieldCheck, title: 'Безопасность', text: 'Авторизация по токенам Laravel Sanctum, хеширование паролей, проверка ролей и владельца бронирования на сервере.' },
  { icon: Lock, title: 'Честные правила', text: 'Бесплатная отмена не позднее чем за сутки до заезда, оплата при заселении, отзывы только от реальных гостей.' },
]

export default function About() {
  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-extrabold">О сервисе StayEasy</h1>
        <p className="mt-4 text-lg text-slate-600">
          StayEasy — веб-сервис поиска и онлайн-бронирования номеров в отелях Казахстана с интеллектуальным AI-помощником.
          Проект выполнен в рамках курсовой работы.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="card flex gap-4 p-6">
            <div className="h-fit rounded-xl bg-brand-50 p-3 text-brand-600"><Icon className="h-6 w-6" /></div>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-12 p-8">
        <h2 className="text-2xl font-bold">Технологии</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Server className="h-5 w-5 text-brand-600" /> Backend</h3>
            <p className="mt-2 text-sm text-slate-600">PHP 8.3, Laravel 12, REST API, Sanctum, Eloquent ORM, Form Requests, API Resources, Service-классы, Middleware ролей, Feature-тесты.</p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Zap className="h-5 w-5 text-brand-600" /> Frontend</h3>
            <p className="mt-2 text-sm text-slate-600">React, Vite, React Router, Axios, Tailwind CSS, Lucide React. Адаптивная вёрстка для телефонов и компьютеров.</p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><Database className="h-5 w-5 text-brand-600" /> База данных</h3>
            <p className="mt-2 text-sm text-slate-600">MySQL 8: пользователи, отели, номера, удобства (many-to-many), бронирования, отзывы, история чата.</p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <Link to="/hotels" className="btn-primary px-8 py-3 text-base">Перейти к отелям</Link>
      </div>
    </div>
  )
}
