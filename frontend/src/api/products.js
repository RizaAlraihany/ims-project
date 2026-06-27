import axiosClient from '@/api/axiosClient'

export const productsApi = {
  list: (params) => axiosClient.get('/products', { params }),
  show: (productOrBarcode) => axiosClient.get(`/products/${productOrBarcode}`),
  create: (payload) => axiosClient.post('/products', payload),
  update: (id, payload) => axiosClient.put(`/products/${id}`, payload),
  remove: (id) => axiosClient.delete(`/products/${id}`),
  import: (payload) => axiosClient.post('/products/import', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  export: (params) => axiosClient.get('/products/export', { params, responseType: 'blob' }),
}
