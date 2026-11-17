import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Pencil, Star, Trash2 } from 'lucide-react'
import ReviewCard from '../components/ReviewCard'
import { ConfirmModal, EmptyState, ErrorBox, Field, Modal, PageHeader, PageLoader, Pagination, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useFetch } from '../hooks/useFetch'
import { errorMessage, hotelsApi, reviewsApi } from '../services/api'

export default function Reviews() {
  const { user } = useAuth()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [hotels, setHotels] = useState([])
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const filters = Object.fromEntries(params)
  const { data, loading, error, reload } = useFetch(() => reviewsApi.list({ ...filters, per_page: 9 }), [params.toString()])

  useEffect(() => {
    hotelsApi.list({ per_page: 50, sort: 'name' }).then((r) => setHotels(r.data)).catch(() => {})
  }, [])

  const update = (k, v) => {
    const next = new URLSearchParams(params)
    v ? next.set(k, v) : next.delete(k)
    next.delete('page')
    setParams(next)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (editing.comment.trim().length < 10) return toast.error('Комментарий — минимум 10 символов.')
    setBusy(true)
    try {
      const res = await reviewsApi.update(editing.id, { rating: editing.rating, comment: editing.comment })
      toast.success(res.message)
      setEditing(null)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const doRemove = async () => {
    setBusy(true)
    try {
      const res = await reviewsApi.remove(removing.id)
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
    <div className="container-page py-8">
      <PageHeader title="Отзывы гостей" subtitle="Отзывы оставляют только гости, которые действительно проживали в отеле" />

      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-3">
        <select className="input" value={params.get('hotel_id') || ''} onChange={(e) => update('hotel_id', e.target.value)}>
          <option value="">Все отели</option>
          {hotels.map((h) => <option key={h.id} value={h.id}>{h.name} ({h.city})</option>)}
        </select>
        <select className="input" value={params.get('rating') || ''} onChange={(e) => update('rating', e.target.value)}>
          <option value="">Любая оценка</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{'★'.repeat(r)} ({r})</option>)}
        </select>
        <select className="input" value={params.get('sort') || 'newest'} onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="rating">Сначала высокие оценки</option>
        </select>
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data.data.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Отзывов не найдено" text="Попробуйте изменить фильтры." />
      ) : (
        <>
          <div className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {data.data.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                showHotel
                actions={
                  user && (r.can_edit || user.role === 'admin') ? (
                    <>
                      {r.can_edit && <button className="btn-ghost btn-sm" onClick={() => setEditing({ ...r })}><Pencil className="h-3.5 w-3.5" /> Изменить</button>}
                      <button className="btn-ghost btn-sm text-rose-600" onClick={() => setRemoving(r)}><Trash2 className="h-3.5 w-3.5" /> Удалить</button>
                    </>
                  ) : null
                }
              />
            ))}
          </div>
          <Pagination meta={data.meta} onPage={(p) => update('page', p)} />
        </>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Редактирование отзыва">
        {editing && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setEditing((e) => ({ ...e, rating: n }))}>
                  <Star className={`h-8 w-8 ${n <= editing.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
            <Field label="Комментарий">
              <textarea rows={4} className="input" value={editing.comment} onChange={(e) => setEditing((x) => ({ ...x, comment: e.target.value }))} />
            </Field>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Сохранить</button>
          </form>
        )}
      </Modal>

      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={doRemove} loading={busy} danger title="Удалить отзыв?" text="Отзыв будет удалён без возможности восстановления, рейтинг отеля пересчитается." confirmText="Удалить" />
    </div>
  )
}
