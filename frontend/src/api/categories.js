import axiosClient from '@/api/axiosClient'

export const categoriesApi = {
  list: (params) => axiosClient.get('/categories', { params }),
  show: (id) => axiosClient.get(`/categories/${id}`),
  create: (payload) => axiosClient.post('/categories', payload),
  update: (id, payload) => axiosClient.put(`/categories/${id}`, payload),
  remove: (id) => axiosClient.delete(`/categories/${id}`),
}
