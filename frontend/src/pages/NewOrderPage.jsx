import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchProducts } from '../api/products'
import { createOrder } from '../api/orders'

function extractErrorMessage(err) {
  const status = err.response?.status

  if (status === 400) {
    const itemErrors = err.response.data.items
    if (Array.isArray(itemErrors)) {
      return itemErrors.join(', ')
    }
    return 'No se pudo crear el pedido, revisá las cantidades'
  }

  if (status === 401) {
    return 'Tu sesión expiró, iniciá sesión de nuevo'
  }

  return 'Error de red, intentá de nuevo'
}

export default function NewOrderPage() {
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [error, setError] = useState('')
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
      .then((data) => setProducts(data.results))
      .catch(() => setError('No se pudo cargar el catálogo de productos'))
      .finally(() => setIsLoadingProducts(false))
  }, [])

  const handleQuantityChange = (productId, value) => {
    setQuantities((prev) => ({ ...prev, [productId]: Number(value) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const items = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ product_id: Number(productId), quantity }))

    if (items.length === 0) {
      setError('Seleccioná al menos un producto')
      return
    }

    setIsSubmitting(true)
    try {
      await createOrder(items)
      navigate('/orders')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingProducts) {
    return <p className="empty-state">Cargando productos...</p>
  }

  return (
    <div className="new-order-page">
      <header className="page-header">
        <h1>Nuevo pedido</h1>
        <Link to="/orders" className="btn-ghost">
          Volver
        </Link>
      </header>
      <form onSubmit={handleSubmit}>
        <ul className="list-card">
          {products.map((product) => (
            <li key={product.id} className="product-row">
              <div className="product-info">
                <span className="product-name">{product.name}</span>
                <span className="product-meta">
                  ${product.price} · stock disponible: {product.stock_quantity}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={quantities[product.id] ?? ''}
                onChange={(event) => handleQuantityChange(product.id, event.target.value)}
              />
            </li>
          ))}
        </ul>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creando...' : 'Crear pedido'}
        </button>
      </form>
    </div>
  )
}
