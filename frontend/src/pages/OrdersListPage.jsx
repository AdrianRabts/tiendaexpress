import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchOrders } from '../api/orders'
import OrderStatusBadge from '../components/OrderStatusBadge'

const POLL_INTERVAL_MS = 4000

export default function OrdersListPage() {
  const [orders, setOrders] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrders(statusFilter || undefined, page)
      setOrders(data.results)
      setHasNext(Boolean(data.next))
      setHasPrevious(Boolean(data.previous))
      setError('')
    } catch {
      setError('No se pudo cargar el listado de pedidos')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    setPage(1)
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
      <header className="page-header">
        <h1>Pedidos</h1>
        <Link to="/orders/new" className="btn-primary">
          Nuevo pedido
        </Link>
      </header>

      <select
        className="status-filter"
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
      >
        <option value="">Todos los estados</option>
        <option value="PENDING">Pendiente</option>
        <option value="CONFIRMED">Confirmado</option>
        <option value="FAILED">Fallido</option>
      </select>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p className="empty-state">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="empty-state">No hay pedidos para mostrar.</p>
      ) : (
        <>
          <ul className="list-card">
            {orders.map((order) => (
              <li key={order.id} className="order-row">
                <span className="order-id">#{order.id}</span>
                <OrderStatusBadge status={order.status} />
                <span className="order-date">{new Date(order.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="pagination">
            <button
              type="button"
              className="btn-ghost"
              disabled={!hasPrevious}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </button>
            <span className="pagination-page">Página {page}</span>
            <button
              type="button"
              className="btn-ghost"
              disabled={!hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Siguiente
            </button>
          </div>
        </>
      )}
    </div>
  )
}
