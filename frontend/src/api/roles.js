import axiosClient from '@/api/axiosClient'

export const rolesApi = {
  list: () => axiosClient.get('/roles'),
  permissions: () => axiosClient.get('/permissions'),
  updatePermissions: (roleId, permissionIds) => axiosClient.put(`/roles/${roleId}/permissions`, {
    permission_ids: permissionIds,
  }),
}
