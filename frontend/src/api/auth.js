import axiosClient from '@/api/axiosClient'

export const authApi = {
  login: (payload) => axiosClient.post('/v1/auth/login', payload),
  logout: () => axiosClient.post('/v1/auth/logout'),
  user: () => axiosClient.get('/v1/auth/me'),
}
