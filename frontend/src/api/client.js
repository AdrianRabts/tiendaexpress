import axios from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage'

const baseURL = import.meta.env.VITE_API_URL

const apiClient = axios.create({ baseURL })

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = getRefreshToken()

    if (error.response?.status !== 401 || originalRequest._retry || !refreshToken) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const { data } = await axios.post(`${baseURL}/api/auth/refresh/`, { refresh: refreshToken })
      setTokens(data)
      originalRequest.headers.Authorization = `Bearer ${data.access}`
      return apiClient(originalRequest)
    } catch (refreshError) {
      clearTokens()
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  },
)

export default apiClient
