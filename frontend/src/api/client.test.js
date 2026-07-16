import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import apiClient from './client'
import { clearTokens, getAccessToken, setTokens } from './tokenStorage'

const BASE_URL = 'http://localhost:8000'

describe('apiClient interceptors', () => {
  let apiMock
  let rawAxiosMock

  beforeEach(() => {
    apiMock = new MockAdapter(apiClient)
    rawAxiosMock = new MockAdapter(axios)
    clearTokens()
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true })
  })

  afterEach(() => {
    apiMock.restore()
    rawAxiosMock.restore()
  })

  it('attaches the access token to outgoing requests', async () => {
    setTokens({ access: 'access-123', refresh: 'refresh-456' })
    apiMock.onGet('/api/products/').reply((config) => {
      expect(config.headers.Authorization).toBe('Bearer access-123')
      return [200, { results: [] }]
    })

    await apiClient.get('/api/products/')
  })

  it('refreshes the token once on a 401 and retries the original request', async () => {
    setTokens({ access: 'expired-access', refresh: 'refresh-456' })
    rawAxiosMock.onPost(`${BASE_URL}/api/auth/refresh/`).reply(200, { access: 'new-access' })
    apiMock
      .onGet('/api/products/')
      .replyOnce(401)
      .onGet('/api/products/')
      .reply((config) => {
        expect(config.headers.Authorization).toBe('Bearer new-access')
        return [200, { results: [] }]
      })

    const response = await apiClient.get('/api/products/')

    expect(response.status).toBe(200)
    expect(getAccessToken()).toBe('new-access')
  })

  it('clears the session and redirects to login if the refresh also fails', async () => {
    setTokens({ access: 'expired-access', refresh: 'invalid-refresh' })
    apiMock.onGet('/api/products/').reply(401)
    rawAxiosMock.onPost(`${BASE_URL}/api/auth/refresh/`).reply(401)

    await expect(apiClient.get('/api/products/')).rejects.toBeTruthy()

    expect(getAccessToken()).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})
