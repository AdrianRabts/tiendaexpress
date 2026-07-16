import { useState } from 'react'
import { login as loginRequest } from '../api/auth'
import { clearTokens, getAccessToken, setTokens } from '../api/tokenStorage'
import { AuthContext } from './context'

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()))

  const login = async (email, password) => {
    const tokens = await loginRequest(email, password)
    setTokens(tokens)
    setIsAuthenticated(true)
  }

  const logout = () => {
    clearTokens()
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
