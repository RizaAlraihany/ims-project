import axiosClient from '@/api/axiosClient'

export const dashboardApi = {
  summary: (params) => axiosClient.get('/dashboard/summary', { params }),
}
