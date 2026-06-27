export function apiErrorMessage(error, fallback = 'Terjadi kesalahan saat memuat data.') {
  return error?.response?.data?.message ?? error?.message ?? fallback
}
