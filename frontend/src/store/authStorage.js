const USER_KEY = 'ims_user'

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)
  return rawUser ? JSON.parse(rawUser) : null
}

export function normalizeSession(payload) {
  const session = payload?.data?.user ? payload.data : payload

  return {
    user: session?.user ?? null,
  }
}

export function storeSession(payload) {
  const session = normalizeSession(payload)

  if (session.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  }

  return session
}

export function clearSession() {
  localStorage.removeItem(USER_KEY)
}
