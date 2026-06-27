import { describe, expect, it, beforeEach } from 'vitest'
import axiosClient from '@/api/axiosClient'
import { storeSession } from '@/store/authStorage'

function adapterWithResponse(status = 200) {
  return (config) =>
    Promise.resolve({
      config,
      data: { success: true },
      headers: {},
      request: {},
      status,
      statusText: 'OK',
    })
}

describe('axiosClient API integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('adds the stored Sanctum bearer token to API requests', async () => {
    storeSession({ token: 'phase-13-token', user: { id: 1, name: 'Admin' } })

    const response = await axiosClient.get('/inventory', {
      adapter: adapterWithResponse(),
    })

    expect(response.config.headers.Authorization).toBe('Bearer phase-13-token')
  })

  it('clears the stored session when the API responds with 401', async () => {
    storeSession({ token: 'expired-token', user: { id: 1, name: 'Admin' } })

    await expect(
      axiosClient.get('/inventory', {
        adapter: (config) => Promise.reject({ config, response: { status: 401 } }),
      }),
    ).rejects.toBeTruthy()

    expect(localStorage.getItem('ims_api_token')).toBeNull()
    expect(localStorage.getItem('ims_user')).toBeNull()
  })
})
