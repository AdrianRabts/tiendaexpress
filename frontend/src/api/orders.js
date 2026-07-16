import apiClient from './client'

export function fetchOrders(status) {
  return apiClient.get('/api/orders/', { params: status ? { status } : {} }).then((res) => res.data)
}

export function fetchOrder(id) {
  return apiClient.get(`/api/orders/${id}/`).then((res) => res.data)
}

export function createOrder(items) {
  return apiClient.post('/api/orders/', { items }).then((res) => res.data)
}
