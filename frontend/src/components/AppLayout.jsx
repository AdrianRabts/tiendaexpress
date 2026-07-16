import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/orders" className="brand">
          TiendaExpress
        </Link>
        <button type="button" className="btn-ghost" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
