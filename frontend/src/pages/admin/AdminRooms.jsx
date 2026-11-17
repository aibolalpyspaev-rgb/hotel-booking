import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { AmenityIcon, ConfirmModal, ErrorBox, Field, Img, Modal, PageHeader, PageLoader, Pagination, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { amenitiesApi, errorMessage, fieldErrors, hotelsApi, roomsApi } from '../../services/api'
import { money, ROOM_TYPES } from '../../utils/format'

function RoomForm({ initial, hotels, amenities, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({
    hotel_id: initial.hotel_id || hotels[0]?.id || '',
    name: initial.name || '',
    type: initial.type || 'standard',
    description: initial.description || '',
    price_per_night: initial.price_per_night || '',
    capacity: initial.capacity || 2,
    beds: initial.beds || 1,
    area: initial.area || '',
    image_url: initial.image_url || '',
    is_active: initial.is_active ?? true,
    amenities: initial.amenities?.map((a) => a.id) || [],
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const toggleAmenity = (id) => setForm((f) => ({ ...f, amenities: f.amenities.includes(id) ? f.amenities.filter((x) => x !== id) : [...f.amenities, id] }))

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (!form.hotel_id) v.hotel_id = 'Выберите отель.'
    if (form.name.trim().length < 2) v.name = 'Введите название.'
    if (!(Number(form.price_per_night) >= 1000)) v.price_per_night = 'Минимум 1000 ₸.'
    if (!(Number(form.capacity) >= 1 && Number(form.capacity) <= 10)) v.capacity = 'От 1 до 10.'
    if (Object.keys(v).length) return setErrors(v)

    setSaving(true)
    const payload = {
      ...form,
      hotel_id: Number(form.hotel_id),
      price_per_night: Number(form.price_per_night),
      capacity: Number(form.capacity),
      beds: Number(form.beds) || 1,
      area: form.area ? Number(form.area) : null,
      image_url: form.image_url || null,
    }
    try {
      const res = initial.id ? await roomsApi.update(initial.id, payload) : await roomsApi.create(payload)
      toast.success(res.message)
      onSaved()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label="Отель *" error={errors.hotel_id} className="sm:col-span-2">
        <select className="input" value={form.hotel_id} onChange={set('hotel_id')}>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
        </select>
      </Field>
      <Field label="Название *" error={errors.name}><input className="input" value={form.name} onChange={set('name')} /></Field>
      <Field label="Тип *" error={errors.type}>
        <select className="input" value={form.type} onChange={set('type')}>{Object.entries(ROOM_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </Field>
      <Field label="Цена за ночь, ₸ *" error={errors.price_per_night}><input type="number" min="1000" step="500" className="input" value={form.price_per_night} onChange={set('price_per_night')} /></Field>
      <Field label="Вместимость (гостей) *" error={errors.capacity}><input type="number" min="1" max="10" className="input" value={form.capacity} onChange={set('capacity')} /></Field>
      <Field label="Кроватей" error={errors.beds}><input type="number" min="1" max="10" className="input" value={form.beds} onChange={set('beds')} /></Field>
      <Field label="Площадь, м²" error={errors.area}><input type="number" min="5" className="input" value={form.area} onChange={set('area')} /></Field>
      <Field label="Ссылка на фото" error={errors.image_url} className="sm:col-span-2"><input className="input" placeholder="https://…" value={form.image_url} onChange={set('image_url')} /></Field>
      <Field label="Описание" error={errors.description} className="sm:col-span-2"><textarea rows={3} className="input" value={form.description} onChange={set('description')} /></Field>
      <div className="sm:col-span-2">
        <span className="label">Удобства</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {amenities.map((a) => (
            <label key={a.id} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ring-1 transition ${form.amenities.includes(a.id) ? 'bg-brand-50 text-brand-800 ring-brand-200' : 'ring-slate-200 hover:bg-slate-50'}`}>
              <input type="checkbox" className="sr-only" checked={form.amenities.includes(a.id)} onChange={() => toggleAmenity(a.id)} />
              <AmenityIcon name={a.icon} className="h-4 w-4" /> {a.name}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={form.is_active} onChange={set('is_active')} /> Номер доступен для бронирования
      </label>
      <button className="btn-primary sm:col-span-2" disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Сохранить</button>
    </form>
  )
}

export default function AdminRooms() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const hotelId = params.get('hotel_id') || ''
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const [hotels, setHotels] = useState([])
  const [amenities, setAmenities] = useState([])
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    hotelsApi.list({ per_page: 50, include_inactive: 1, sort: 'name' }).then((r) => setHotels(r.data)).catch(() => {})
    amenitiesApi.list().then(setAmenities).catch(() => {})
  }, [])

  const { data, loading, error, reload } = useFetch(
    () => roomsApi.list({ hotel_id: hotelId, search: q, page, per_page: 15, include_inactive: 1, sort: 'price_asc' }),
    [hotelId, q, page],
  )

  const remove = async () => {
    setBusy(true)
    try {
      const res = await roomsApi.remove(removing.id)
      toast.success(res.message)
      setRemoving(null)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader title="Управление номерами" subtitle="Номера отелей, цены, вместимость и удобства" actions={<button className="btn-primary" onClick={() => setEditing({ hotel_id: hotelId ? Number(hotelId) : undefined })} disabled={!hotels.length}><Plus className="h-4 w-4" /> Добавить номер</button>} />

      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-2">
        <select className="input" value={hotelId} onChange={(e) => { setParams(e.target.value ? { hotel_id: e.target.value } : {}); setPage(1) }}>
          <option value="">Все отели</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Поиск по названию номера или отеля…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50"><tr><th>Номер</th><th>Отель</th><th>Тип</th><th>Цена / ночь</th><th>Гостей</th><th>Статус</th><th className="text-right">Действия</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td><div className="flex items-center gap-3"><Img src={r.image_url} alt="" className="h-10 w-14 rounded-lg object-cover" /><span className="font-semibold">{r.name}</span></div></td>
                    <td>{r.hotel?.name}<p className="text-xs text-slate-500">{r.hotel?.city}</p></td>
                    <td>{r.type_label}</td>
                    <td className="whitespace-nowrap font-semibold">{money(r.price_per_night)}</td>
                    <td>{r.capacity}</td>
                    <td>{r.is_active ? <span className="badge bg-emerald-50 text-emerald-700">Доступен</span> : <span className="badge bg-slate-100 text-slate-500">Скрыт</span>}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} title="Редактировать"><Pencil className="h-4 w-4" /></button>
                        <button className="btn-ghost btn-sm text-rose-600" onClick={() => setRemoving(r)} title="Удалить"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.length === 0 && <p className="p-6 text-center text-slate-500">Номеров нет</p>}
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Редактирование номера' : 'Новый номер'} size="max-w-2xl">
        {editing && <RoomForm initial={editing} hotels={hotels} amenities={amenities} onSaved={() => { setEditing(null); reload() }} />}
      </Modal>
      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} danger title="Удалить номер?" text={`Номер «${removing?.name}» и все его бронирования будут удалены.`} confirmText="Удалить" />
    </div>
  )
}
