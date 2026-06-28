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

  it('uses Sanctum cookie/session requests without attaching a bearer token', async () => {
    storeSession({ user: { id: 1, name: 'Admin' } })

    const response = await axiosClient.get('/inventory', {
      adapter: adapterWithResponse(),
    })

    expect(response.config.withCredentials).toBe(true)
    expect(response.config.withXSRFToken).toBe(true)
    expect(response.config.headers.Authorization).toBeUndefined()
  })

  it('clears the stored session when the API responds with 401', async () => {
    storeSession({ user: { id: 1, name: 'Admin' } })

    await expect(
      axiosClient.get('/inventory', {
        adapter: (config) => Promise.reject({ config, response: { status: 401 } }),
      }),
    ).rejects.toBeTruthy()

    expect(localStorage.getItem('ims_user')).toBeNull()
  })
})
