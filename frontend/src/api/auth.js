import axiosClient from '@/api/axiosClient'

export const authApi = {
  csrf: () => axiosClient.get('/sanctum/csrf-cookie', { baseURL: (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/api(\/v1)?\/?$/, '') }),
  login: (payload) => axiosClient.post('/auth/login', payload),
  logout: () => axiosClient.post('/auth/logout'),
  user: () => axiosClient.get('/auth/me'),
}
