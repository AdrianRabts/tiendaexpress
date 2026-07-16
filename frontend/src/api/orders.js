import apiClient from './client'

export function fetchOrders(status, page = 1) {
  const params = { page }
  if (status) params.status = status
  return apiClient.get('/api/orders/', { params }).then((res) => res.data)
}

export function fetchOrder(id) {
  return apiClient.get(`/api/orders/${id}/`).then((res) => res.data)
}

export function createOrder(items) {
  return apiClient.post('/api/orders/', { items }).then((res) => res.data)
}
