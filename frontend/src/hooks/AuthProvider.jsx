import { useCallback, useMemo, useState } from 'react'
import { authApi } from '@/api/auth'
import { AuthContext } from '@/hooks/authContext'
import { clearSession, getStoredToken, getStoredUser, normalizeSession, storeSession } from '@/store/authStorage'

function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken)
  const [user, setUser] = useState(getStoredUser)
  const isAuthenticated = Boolean(token)

  const login = useCallback(async (payload) => {
    await authApi.csrf()
    const response = await authApi.login(payload)
    const session = storeSession(response.data)

    setToken(session.token)
    setUser(session.user)

    return session
  }, [])

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout()
      }
    } finally {
      clearSession()
      setToken(null)
      setUser(null)
    }
  }, [token])

  const refreshUser = useCallback(async () => {
    const response = await authApi.user()
    const session = normalizeSession({
      token,
      user: response.data?.data?.user ?? response.data?.user,
    })

    if (session.user) {
      setUser(session.user)
      storeSession(session)
    }

    return session.user
  }, [token])

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
      token,
      user,
    }),
    [hasAllPermissions, hasAnyPermission, hasPermission, isAuthenticated, login, logout, refreshUser, token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
