const TOKEN_KEY = 'ims_api_token'
const USER_KEY = 'ims_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)
  return rawUser ? JSON.parse(rawUser) : null
}

export function normalizeSession(payload) {
  const session = payload?.data?.token ? payload.data : payload

  return {
    token: session?.token ?? '',
    user: session?.user ?? null,
  }
}

export function storeSession(payload) {
  const session = normalizeSession(payload)

  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(USER_KEY, JSON.stringify(session.user))

  return session
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
