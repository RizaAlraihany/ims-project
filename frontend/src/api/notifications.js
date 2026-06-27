import axiosClient from '@/api/axiosClient'

export const notificationsApi = {
  list: (params) => axiosClient.get('/notifications', { params }),
  markAsRead: (id) => axiosClient.put(`/notifications/${id}/read`),
}
