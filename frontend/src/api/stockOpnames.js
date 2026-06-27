import axiosClient from '@/api/axiosClient'

export const stockOpnamesApi = {
  list: (params) => axiosClient.get('/stock-opnames', { params }),
  show: (id) => axiosClient.get(`/stock-opnames/${id}`),
  create: (payload) => axiosClient.post('/stock-opnames', payload),
  saveItem: (id, payload) => axiosClient.post(`/stock-opnames/${id}/items`, payload),
  approve: (id) => axiosClient.post(`/stock-opnames/${id}/approve`),
}
