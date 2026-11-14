import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, TOKEN_KEY } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)))

  const loadUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false)
      return
    }
    try {
      setUser(await authApi.me())
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
    const onExpired = () => setUser(null)
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [loadUser])

  const applySession = ({ token, user: u }) => {
    localStorage.setItem(TOKEN_KEY, token)
    setUser(u)
    return u
  }

  const login = async (credentials) => applySession(await authApi.login(credentials))
  const register = async (data) => applySession(await authApi.register(data))

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      /* токен мог уже истечь — всё равно выходим */
    }
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, setUser, loading, isAuth: Boolean(user), isAdmin: user?.role === 'admin', login, register, logout, reload: loadUser }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
