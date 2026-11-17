import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Filter, SearchX, SlidersHorizontal, X } from 'lucide-react'
import SearchForm from '../components/SearchForm'
import HotelCard from '../components/HotelCard'
import { AmenityIcon, EmptyState, ErrorBox, Pagination, Stars } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { useDebounce } from '../hooks/useDebounce'
import { amenitiesApi, hotelsApi } from '../services/api'
import { formatDate, guestsLabel } from '../utils/format'

const SORTS = [
  ['popular', 'По популярности'],
  ['price_asc', 'Сначала дешевле'],
  ['price_desc', 'Сначала дороже'],
  ['rating', 'По рейтингу'],
  ['stars', 'По звёздам'],
  ['name', 'По названию'],
]

export default function Hotels() {
  const [params, setParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [cities, setCities] = useState([])
  const [amenities, setAmenities] = useState([])

  const get = (k) => params.get(k) || ''
  const list = (k) => (params.get(k) ? params.get(k).split(',') : [])

  const [priceFrom, setPriceFrom] = useState(get('min_price'))
  const [priceTo, setPriceTo] = useState(get('max_price'))
  const [search, setSearch] = useState(get('search'))
  const dPriceFrom = useDebounce(priceFrom)
  const dPriceTo = useDebounce(priceTo)
  const dSearch = useDebounce(search)

  useEffect(() => {
    hotelsApi.cities().then(setCities).catch(() => {})
    amenitiesApi.list().then(setAmenities).catch(() => {})
  }, [])

  const update = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length)) next.delete(k)
      else next.set(k, Array.isArray(v) ? v.join(',') : v)
    })
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  useEffect(() => {
    if (dPriceFrom !== get('min_price') || dPriceTo !== get('max_price') || dSearch !== get('search')) {
      update({ min_price: dPriceFrom, max_price: dPriceTo, search: dSearch })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dPriceFrom, dPriceTo, dSearch])

  const toggle = (k, v) => {
    const cur = list(k)
    update({ [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }

  const query = params.toString()
  const { data, loading, error, reload } = useFetch(
    () => hotelsApi.list({ ...Object.fromEntries(params), per_page: 8 }),
    [query],
  )

  // Параметры, которые передаём на страницу отеля (даты и гости)
  const passQuery = useMemo(() => {
    const p = new URLSearchParams()
    ;['check_in', 'check_out', 'guests'].forEach((k) => params.get(k) && p.set(k, params.get(k)))
    return p.toString()
  }, [params])

  const resetFilters = () => {
    setPriceFrom('')
    setPriceTo('')
    setSearch('')
    const keep = new URLSearchParams()
    ;['city', 'check_in', 'check_out', 'guests'].forEach((k) => params.get(k) && keep.set(k, params.get(k)))
    setParams(keep)
  }

  const filters = (
    <div className="space-y-6">
      <div>
        <label className="label">Поиск по названию</label>
        <input className="input" placeholder="Название отеля…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div>
        <label className="label">Город</label>
        <select className="input" value={get('city')} onChange={(e) => update({ city: e.target.value })}>
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.hotels_count})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Цена за ночь, ₸</label>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" min="0" step="1000" placeholder="от" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
          <input className="input" type="number" min="0" step="1000" placeholder="до" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Количество звёзд</label>
        <div className="space-y-1.5">
          {[5, 4, 3, 2].map((s) => (
            <label key={s} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-50">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={list('stars').includes(String(s))} onChange={() => toggle('stars', String(s))} />
              <Stars count={s} />
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Рейтинг гостей</label>
        <div className="flex flex-wrap gap-2">
          {[['', 'Любой'], ['3', '3+'], ['4', '4+'], ['4.5', '4.5+']].map(([v, l]) => (
            <button key={l} onClick={() => update({ min_rating: v })} className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 transition ${get('min_rating') === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Удобства в номере</label>
        <div className="space-y-1.5">
          {amenities.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={list('amenities').includes(String(a.id))} onChange={() => toggle('amenities', String(a.id))} />
              <AmenityIcon name={a.icon} className="h-4 w-4 text-slate-400" /> {a.name}
            </label>
          ))}
        </div>
      </div>
      <button className="btn-secondary w-full" onClick={resetFilters}>
        Сбросить фильтры
      </button>
    </div>
  )

  return (
    <div className="container-page py-8">
      <SearchForm key={`${get('city')}${get('check_in')}${get('check_out')}${get('guests')}`} compact initial={{ city: get('city'), check_in: get('check_in'), check_out: get('check_out'), guests: get('guests') }} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 p-5">
            <h2 className="mb-5 flex items-center gap-2 font-bold">
              <SlidersHorizontal className="h-5 w-5 text-brand-600" /> Фильтры
            </h2>
            {filters}
          </div>
        </aside>

        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{get('city') ? `Отели в городе ${get('city')}` : 'Все отели'}</h1>
              <p className="text-sm text-slate-500">
                {data ? `Найдено: ${data.meta.total}` : 'Поиск…'}
                {get('check_in') && ` · ${formatDate(get('check_in'), { day: 'numeric', month: 'short' })} — ${formatDate(get('check_out'), { day: 'numeric', month: 'short' })}`}
                {get('guests') && ` · ${guestsLabel(Number(get('guests')))}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary lg:hidden" onClick={() => setShowFilters(true)}>
                <Filter className="h-4 w-4" /> Фильтры
              </button>
              <select className="input w-auto" value={get('sort') || 'popular'} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : loading && !data ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-52 animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <EmptyState icon={SearchX} title="Ничего не найдено" text="Попробуйте изменить даты, город или ослабить фильтры. Также можно спросить AI-помощника." action={<button className="btn-primary" onClick={resetFilters}>Сбросить фильтры</button>} />
          ) : (
            <div className={`space-y-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
              {data.data.map((h) => (
                <HotelCard key={h.id} hotel={h} query={passQuery} horizontal />
              ))}
              <Pagination meta={data.meta} onPage={(p) => { update({ page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </div>
          )}
        </section>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowFilters(false)} />
          <div className="relative ml-auto h-full w-full max-w-sm animate-fade-up overflow-y-auto bg-white p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold">Фильтры</h2>
              <button onClick={() => setShowFilters(false)} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {filters}
            <button className="btn-primary mt-3 w-full" onClick={() => setShowFilters(false)}>
              Показать результаты
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
