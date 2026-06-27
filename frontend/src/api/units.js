import axiosClient from '@/api/axiosClient'

export const unitsApi = {
  list: (params) => axiosClient.get('/units', { params }),
  show: (id) => axiosClient.get(`/units/${id}`),
  create: (payload) => axiosClient.post('/units', payload),
  update: (id, payload) => axiosClient.put(`/units/${id}`, payload),
  remove: (id) => axiosClient.delete(`/units/${id}`),
}
