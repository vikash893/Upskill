import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/" replace />
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
