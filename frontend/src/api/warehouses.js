import axiosClient from '@/api/axiosClient'

export const warehousesApi = {
  list: (params) => axiosClient.get('/warehouses', { params }),
  show: (id) => axiosClient.get(`/warehouses/${id}`),
  create: (payload) => axiosClient.post('/warehouses', payload),
  update: (id, payload) => axiosClient.put(`/warehouses/${id}`, payload),
  remove: (id) => axiosClient.delete(`/warehouses/${id}`),
}
