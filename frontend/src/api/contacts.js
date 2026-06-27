import axiosClient from '@/api/axiosClient'

export const contactsApi = {
  list: (params) => axiosClient.get('/contacts', { params }),
  get: (id) => axiosClient.get(`/contacts/${id}`),
  create: (data) => axiosClient.post('/contacts', data),
  update: (id, data) => axiosClient.put(`/contacts/${id}`, data),
  remove: (id) => axiosClient.delete(`/contacts/${id}`),
}
