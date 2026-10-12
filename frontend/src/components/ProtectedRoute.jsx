import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session } = useAuth()
  const location = useLocation()
  const redirectTo = `${location.pathname}${location.search}`

  if (!session) return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
