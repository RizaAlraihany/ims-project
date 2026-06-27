import axiosClient from '@/api/axiosClient'

export const movementsApi = {
  list: (params) => axiosClient.get('/movements', { params }),
  stockIn: (payload) => axiosClient.post('/stock-in', payload),
  stockOut: (payload) => axiosClient.post('/stock-out', payload),
}
