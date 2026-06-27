import axiosClient from '@/api/axiosClient'

export const settingsApi = {
  list: () => axiosClient.get('/settings'),
  update: (settings) => axiosClient.put('/settings', { settings }),
}
