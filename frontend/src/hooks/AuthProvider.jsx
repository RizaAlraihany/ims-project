import { useCallback, useMemo, useState } from 'react'
import { authApi } from '@/api/auth'
import { AuthContext } from '@/hooks/authContext'
import { clearSession, getStoredUser, normalizeSession, storeSession } from '@/store/authStorage'

function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const isAuthenticated = Boolean(user)

  const login = useCallback(async (payload) => {
    await authApi.csrf()
    const response = await authApi.login(payload)
    const session = storeSession(response.data)

    setUser(session.user)

    return session
  }, [])

  const logout = useCallback(async () => {
    try {
      if (isAuthenticated) {
        await authApi.logout()
      }
    } finally {
      clearSession()
      setUser(null)
    }
  }, [isAuthenticated])

  const refreshUser = useCallback(async () => {
    const response = await authApi.user()
    const session = normalizeSession({
      user: response.data?.data?.user ?? response.data?.user,
    })

    if (session.user) {
      setUser(session.user)
      storeSession(session)
    }

    return session.user
  }, [])

  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return true
      return user?.permissions?.includes(permission) ?? false
    },
    [user],
  )

  const hasAnyPermission = useCallback(
    (permissions = []) => permissions.length === 0 || permissions.some((permission) => hasPermission(permission)),
    [hasPermission],
  )

  const hasAllPermissions = useCallback(
    (permissions = []) => permissions.every((permission) => hasPermission(permission)),
    [hasPermission],
  )

  const value = useMemo(
    () => ({
      hasAllPermissions,
      hasAnyPermission,
      hasPermission,
      isAuthenticated,
      login,
      logout,
      refreshUser,
      user,
    }),
    [hasAllPermissions, hasAnyPermission, hasPermission, isAuthenticated, login, logout, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
