import { Navigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'

export default function PermissionRoute({ perm, children }) {
  const { role } = useAuthStore()

  if (!role) return <Navigate to="/app/dashboard" replace />

  if (role.is_president) return children

  if (perm === 'president') return <Navigate to="/app/403" replace />

  if (!role[perm]) return <Navigate to="/app/403" replace />

  return children
}
