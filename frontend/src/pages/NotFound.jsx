import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Compass className="h-16 w-16 text-brand-500" />
      <h1 className="mt-4 text-5xl font-extrabold">404</h1>
      <p className="mt-2 text-slate-500">Такой страницы не существует.</p>
      <Link to="/" className="btn-primary mt-6">На главную</Link>
    </div>
  )
}
