import axiosClient from '@/api/axiosClient'

export const transfersApi = {
  list: (params) => axiosClient.get('/transfers', { params }),
  show: (id) => axiosClient.get(`/transfers/${id}`),
  create: (payload) => axiosClient.post('/transfers', payload),
  approve: (id) => axiosClient.put(`/transfers/${id}/approve`),
  transit: (id) => axiosClient.put(`/transfers/${id}/transit`),
  receive: (id) => axiosClient.put(`/transfers/${id}/receive`),
  complete: (id) => axiosClient.put(`/transfers/${id}/complete`),
  reject: (id) => axiosClient.put(`/transfers/${id}/reject`),
}
