import { useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
import { ConfirmModal, ErrorBox, PageHeader, PageLoader, Pagination } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { useDebounce } from '../../hooks/useDebounce'
import { adminApi, errorMessage } from '../../services/api'
import { formatDate } from '../../utils/format'

export default function AdminUsers() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search)
  const { data, loading, error, reload } = useFetch(() => adminApi.users({ search: q, role, page }), [q, role, page])
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const changeRole = async (u, newRole) => {
    try {
      const res = await adminApi.updateUser(u.id, { role: newRole })
      toast.success(res.message)
      reload()
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const res = await adminApi.removeUser(removing.id)
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
      <PageHeader title="Пользователи" subtitle="Управление пользователями и ролями" />
      <div className="card mb-4 grid gap-3 p-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Имя или email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
          <option value="">Все роли</option>
          <option value="user">Пользователи</option>
          <option value="admin">Администраторы</option>
        </select>
      </div>

      {loading && !data ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead className="bg-slate-50"><tr><th>Пользователь</th><th>Телефон</th><th>Броней</th><th>Отзывов</th><th>Регистрация</th><th>Роль</th><th></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700">{u.name.charAt(0)}</span>
                        <div><p className="font-semibold">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{u.phone || '—'}</td>
                    <td>{u.bookings_count}</td>
                    <td>{u.reviews_count}</td>
                    <td className="whitespace-nowrap">{formatDate(u.created_at)}</td>
                    <td>
                      <select className="input py-1.5 text-xs" value={u.role} disabled={u.id === me.id} onChange={(e) => changeRole(u, e.target.value)}>
                        <option value="user">Пользователь</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                    <td>
                      {u.id !== me.id && <button className="btn-ghost btn-sm text-rose-600" onClick={() => setRemoving(u)} title="Удалить"><Trash2 className="h-4 w-4" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} danger title="Удалить пользователя?" text={`Пользователь ${removing?.email} и все его бронирования будут удалены.`} confirmText="Удалить" />
    </div>
  )
}
