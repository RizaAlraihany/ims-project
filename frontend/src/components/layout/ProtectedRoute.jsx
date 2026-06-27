import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

function ProtectedRoute({ all = false, permissions = [] }) {
  const location = useLocation()
  const { hasAllPermissions, hasAnyPermission, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const hasAccess = all ? hasAllPermissions(permissions) : hasAnyPermission(permissions)

  if (!hasAccess) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
