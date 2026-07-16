import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '../api/orders'
import OrderStatusBadge from '../components/OrderStatusBadge'

const POLL_INTERVAL_MS = 4000

export default function OrdersListPage() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrders(statusFilter || undefined)
      setOrders(data.results)
      setError('')
    } catch {
      setError('No se pudo cargar el listado de pedidos')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    setIsLoading(true)
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    const hasPendingOrders = orders.some((order) => order.status === 'PENDING')
    if (!hasPendingOrders) return undefined

    const intervalId = setInterval(loadOrders, POLL_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [orders, loadOrders])

  return (
    <div className="orders-page">
      <header className="orders-header">
        <h1>Pedidos</h1>
        <Link to="/orders/new">Nuevo pedido</Link>
      </header>

      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="">Todos los estados</option>
        <option value="PENDING">Pendiente</option>
        <option value="CONFIRMED">Confirmado</option>
        <option value="FAILED">Fallido</option>
      </select>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p>Cargando...</p>
      ) : orders.length === 0 ? (
        <p>No hay pedidos para mostrar.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => (
            <li key={order.id} className="order-row">
              <span>#{order.id}</span>
              <OrderStatusBadge status={order.status} />
              <span>{new Date(order.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
