import axiosClient from '@/api/axiosClient'

export const reportsApi = {
  stocks: (params) => axiosClient.get('/reports/stocks', { params }),
  movements: (params) => axiosClient.get('/reports/movements', { params }),
  transfers: (params) => axiosClient.get('/reports/transfers', { params }),
  opnames: (params) => axiosClient.get('/reports/opnames', { params }),
}
