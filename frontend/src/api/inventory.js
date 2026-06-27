import axiosClient from '@/api/axiosClient'

export const inventoryApi = {
  list: (params) => axiosClient.get('/inventory', { params }),
  lowStock: (params) => axiosClient.get('/inventory/low-stock', { params }),
  stockCard: (params) => axiosClient.get('/inventory/stock-card', { params }),
}
