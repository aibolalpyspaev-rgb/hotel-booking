import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmModal, ErrorBox, PageHeader, PageLoader, Pagination, Stars } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { errorMessage, reviewsApi } from '../../services/api'
import { formatDate } from '../../utils/format'

export default function AdminReviews() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [rating, setRating] = useState('')
  const { data, loading, error, reload } = useFetch(() => reviewsApi.list({ page, rating, per_page: 15 }), [page, rating])
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
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
    <div>
      <PageHeader title="Отзывы" subtitle="Модерация отзывов гостей" actions={
        <select className="input w-auto" value={rating} onChange={(e) => { setRating(e.target.value); setPage(1) }}>
          <option value="">Все оценки</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>Оценка {r}</option>)}
        </select>
      } />
      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50"><tr><th>Автор</th><th>Отель</th><th>Оценка</th><th>Комментарий</th><th>Дата</th><th></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap font-medium">{r.user?.name}</td>
                    <td>{r.hotel?.name}<p className="text-xs text-slate-500">{r.hotel?.city}</p></td>
                    <td><Stars count={r.rating} className="h-3 w-3" /></td>
                    <td className="max-w-md"><p className="line-clamp-2">{r.comment}</p></td>
                    <td className="whitespace-nowrap">{formatDate(r.created_at)}</td>
                    <td><button className="btn-ghost btn-sm text-rose-600" onClick={() => setRemoving(r)} title="Удалить"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.length === 0 && <p className="p-6 text-center text-slate-500">Отзывов нет</p>}
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} danger title="Удалить отзыв?" text="Рейтинг отеля будет пересчитан автоматически." confirmText="Удалить" />
    </div>
  )
}
