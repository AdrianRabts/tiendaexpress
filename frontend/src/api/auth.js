import apiClient from './client'

export function login(email, password) {
  return apiClient.post('/api/auth/login/', { email, password }).then((res) => res.data)
}
