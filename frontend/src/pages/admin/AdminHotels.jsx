import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BedDouble, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { ConfirmModal, ErrorBox, Field, Img, Modal, PageHeader, PageLoader, Pagination, Spinner, Stars } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { errorMessage, fieldErrors, hotelsApi } from '../../services/api'
import { money } from '../../utils/format'

const EMPTY = { name: '', city: '', address: '', description: '', short_description: '', stars: 4, image_url: '', phone: '', email: '', check_in_time: '14:00', check_out_time: '12:00', is_active: true }

export function HotelForm({ initial, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ ...EMPTY, ...initial, gallery: undefined })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const v = {}
    if (form.name.trim().length < 2) v.name = 'Введите название.'
    if (form.city.trim().length < 2) v.city = 'Введите город.'
    if (!form.address.trim()) v.address = 'Введите адрес.'
    if (form.description.trim().length < 10) v.description = 'Минимум 10 символов.'
    if (Object.keys(v).length) return setErrors(v)

    setSaving(true)
    const payload = { ...form, stars: Number(form.stars) }
    ;['image_url', 'phone', 'email', 'short_description'].forEach((k) => { if (!payload[k]) payload[k] = null })
    delete payload.id
    try {
      const res = initial?.id ? await hotelsApi.update(initial.id, payload) : await hotelsApi.create(payload)
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
      <Field label="Название *" error={errors.name}><input className="input" value={form.name} onChange={set('name')} /></Field>
      <Field label="Город *" error={errors.city}><input className="input" value={form.city} onChange={set('city')} /></Field>
      <Field label="Адрес *" error={errors.address} className="sm:col-span-2"><input className="input" value={form.address} onChange={set('address')} /></Field>
      <Field label="Краткое описание" error={errors.short_description} className="sm:col-span-2"><input className="input" maxLength={300} value={form.short_description || ''} onChange={set('short_description')} /></Field>
      <Field label="Описание *" error={errors.description} className="sm:col-span-2"><textarea rows={4} className="input" value={form.description} onChange={set('description')} /></Field>
      <Field label="Звёзд *" error={errors.stars}>
        <select className="input" value={form.stars} onChange={set('stars')}>{[1, 2, 3, 4, 5].map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </Field>
      <Field label="Ссылка на фото" error={errors.image_url}><input className="input" placeholder="https://…" value={form.image_url || ''} onChange={set('image_url')} /></Field>
      <Field label="Телефон" error={errors.phone}><input className="input" value={form.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Email" error={errors.email}><input className="input" value={form.email || ''} onChange={set('email')} /></Field>
      <Field label="Время заезда" error={errors.check_in_time}><input type="time" className="input" value={form.check_in_time} onChange={set('check_in_time')} /></Field>
      <Field label="Время выезда" error={errors.check_out_time}><input type="time" className="input" value={form.check_out_time} onChange={set('check_out_time')} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 rounded text-brand-600" checked={form.is_active} onChange={set('is_active')} /> Отель активен (виден на сайте)
      </label>
      <button className="btn-primary sm:col-span-2" disabled={saving}>{saving && <Spinner className="h-4 w-4" />} Сохранить</button>
    </form>
  )
}

export default function AdminHotels() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const q = useDebounce(search)
  const { data, loading, error, reload } = useFetch(() => hotelsApi.list({ search: q, page, per_page: 10, include_inactive: 1, sort: 'name' }), [q, page])
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setBusy(true)
    try {
      const res = await hotelsApi.remove(removing.id)
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
      <PageHeader title="Управление отелями" subtitle="Добавление, редактирование и удаление отелей" actions={<button className="btn-primary" onClick={() => setEditing({})}><Plus className="h-4 w-4" /> Добавить отель</button>} />

      <div className="card mb-4 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Поиск по названию, городу, адресу…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50"><tr><th>Отель</th><th>Город</th><th>Звёзды</th><th>Рейтинг</th><th>Цена от</th><th>Статус</th><th className="text-right">Действия</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td>
                      <div className="flex items-center gap-3">
                        <Img src={h.image_url} alt="" className="h-10 w-14 rounded-lg object-cover" />
                        <span className="font-semibold">{h.name}</span>
                      </div>
                    </td>
                    <td>{h.city}</td>
                    <td><Stars count={h.stars} className="h-3 w-3" /></td>
                    <td>{Number(h.rating).toFixed(1)} <span className="text-xs text-slate-400">({h.reviews_count})</span></td>
                    <td className="whitespace-nowrap">{h.min_price ? money(h.min_price) : '—'}</td>
                    <td>{h.is_active ? <span className="badge bg-emerald-50 text-emerald-700">Активен</span> : <span className="badge bg-slate-100 text-slate-500">Скрыт</span>}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link to={`/hotels/${h.id}`} className="btn-ghost btn-sm" title="Открыть на сайте"><Eye className="h-4 w-4" /></Link>
                        <Link to={`/admin/rooms?hotel_id=${h.id}`} className="btn-ghost btn-sm" title="Номера"><BedDouble className="h-4 w-4" /></Link>
                        <button className="btn-ghost btn-sm" title="Редактировать" onClick={() => hotelsApi.get(h.id).then(setEditing)}><Pencil className="h-4 w-4" /></button>
                        <button className="btn-ghost btn-sm text-rose-600" title="Удалить" onClick={() => setRemoving(h)}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.length === 0 && <p className="p-6 text-center text-slate-500">Ничего не найдено</p>}
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Редактирование отеля' : 'Новый отель'} size="max-w-2xl">
        {editing && <HotelForm initial={editing} onSaved={() => { setEditing(null); reload() }} />}
      </Modal>
      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} danger title="Удалить отель?" text={`Отель «${removing?.name}» будет удалён вместе со всеми номерами, бронированиями и отзывами.`} confirmText="Удалить" />
    </div>
  )
}
