import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'

function PermissionGuard({
  all = false,
  children,
  fallback = null,
  permissions = [],
  redirectTo,
}) {
  const location = useLocation()
  const { hasAllPermissions, hasAnyPermission } = usePermissions()
  const allowed = all ? hasAllPermissions(permissions) : hasAnyPermission(permissions)

  if (allowed) {
    return children
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace state={{ from: location }} />
  }

  return fallback
}

export default PermissionGuard
