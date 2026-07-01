const USER_KEY = 'ims_user'
const TOKEN_KEY = 'ims_token'

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)
  return rawUser ? JSON.parse(rawUser) : null
}

export function normalizeSession(payload) {
  const session = payload?.data?.user ? payload.data : payload

  return {
    user: session?.user ?? null,
    token: payload?.data?.token ?? payload?.token ?? null,
  }
}

export function storeSession(payload) {
  const session = normalizeSession(payload)

  if (session.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(session.user))
  }

  if (session.token) {
    localStorage.setItem(TOKEN_KEY, session.token)
  }

  return session
}

export function clearSession() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}
