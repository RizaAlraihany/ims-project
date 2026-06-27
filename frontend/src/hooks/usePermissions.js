import { useAuth } from '@/hooks/useAuth'

export function usePermissions() {
  const { hasAllPermissions, hasAnyPermission, hasPermission, user } = useAuth()

  return {
    hasAllPermissions,
    hasAnyPermission,
    hasPermission,
    permissions: user?.permissions ?? [],
    role: user?.role ?? null,
  }
}
