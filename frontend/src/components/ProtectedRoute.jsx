import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './ui'

/** Пускает только авторизованных (и, при adminOnly, — только администратора). */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />

  return children
}
