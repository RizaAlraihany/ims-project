import axiosClient from '@/api/axiosClient'

export const usersApi = {
  list: (params) => axiosClient.get('/users', { params }),
  create: (payload) => axiosClient.post('/users', payload),
  update: (id, payload) => axiosClient.put(`/users/${id}`, payload),
  remove: (id) => axiosClient.delete(`/users/${id}`),
}
