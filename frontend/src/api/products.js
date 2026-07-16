import apiClient from './client'

export function fetchProducts() {
  return apiClient.get('/api/products/').then((res) => res.data)
}
