import axiosClient from '@/api/axiosClient'

export const auditLogsApi = {
  list: (params) => axiosClient.get('/audit-logs', { params }),
}
