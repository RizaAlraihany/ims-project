import axiosClient from '@/api/axiosClient'

export const authApi = {
  csrf: () => axiosClient.get('/sanctum/csrf-cookie', { baseURL: (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api').replace('/api', '') }),
  login: (payload) => axiosClient.post('/v1/auth/login', payload),
  logout: () => axiosClient.post('/v1/auth/logout'),
  user: () => axiosClient.get('/v1/auth/me'),
}
