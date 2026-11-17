import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AmenityIcon, ConfirmModal, ErrorBox, Field, Modal, PageHeader, PageLoader, Spinner } from '../../components/ui'
import { useToast } from '../../context/ToastContext'
import { useFetch } from '../../hooks/useFetch'
import { amenitiesApi, errorMessage, fieldErrors } from '../../services/api'

const ICONS = ['wifi', 'wind', 'tv', 'coffee', 'car', 'waves', 'sparkles', 'dumbbell', 'plane', 'utensils', 'wine', 'building-2', 'paw-print', 'laptop', 'bath', 'baby', 'shirt', 'lock', 'mountain', 'check']

export default function AdminAmenities() {
  const toast = useToast()
  const { data, loading, error, reload } = useFetch(() => amenitiesApi.list(), [])
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (editing.name.trim().length < 2) return setErrors({ name: 'Минимум 2 символа.' })
    setBusy(true)
    try {
      const payload = { name: editing.name, icon: editing.icon }
      const res = editing.id ? await amenitiesApi.update(editing.id, payload) : await amenitiesApi.create(payload)
      toast.success(res.message)
      setEditing(null)
      reload()
    } catch (err) {
      setErrors(fieldErrors(err))
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const res = await amenitiesApi.remove(removing.id)
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
      <PageHeader title="Удобства" subtitle="Справочник удобств для номеров" actions={<button className="btn-primary" onClick={() => { setErrors({}); setEditing({ name: '', icon: 'check' }) }}><Plus className="h-4 w-4" /> Добавить</button>} />
      {loading ? <PageLoader /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 p-4">
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600"><AmenityIcon name={a.icon} className="h-5 w-5" /></span>
              <div className="flex-1">
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-slate-500">в {a.rooms_count} номерах</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => { setErrors({}); setEditing({ ...a }) }}><Pencil className="h-4 w-4" /></button>
              <button className="btn-ghost btn-sm text-rose-600" onClick={() => setRemoving(a)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Редактирование удобства' : 'Новое удобство'}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Название" error={errors.name}><input className="input" value={editing.name} onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))} /></Field>
            <div>
              <span className="label">Иконка</span>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {ICONS.map((i) => (
                  <button type="button" key={i} onClick={() => setEditing((x) => ({ ...x, icon: i }))} className={`flex items-center justify-center rounded-lg p-2 ring-1 ${editing.icon === i ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200 hover:bg-slate-50'}`} title={i}>
                    <AmenityIcon name={i} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />} Сохранить</button>
          </form>
        )}
      </Modal>
      <ConfirmModal open={Boolean(removing)} onClose={() => setRemoving(null)} onConfirm={remove} loading={busy} danger title="Удалить удобство?" text={`«${removing?.name}» будет убрано из всех номеров.`} confirmText="Удалить" />
    </div>
  )
}
