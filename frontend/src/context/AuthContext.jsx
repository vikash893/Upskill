import { createContext, useContext, useState, useCallback } from 'react'
import { getSession, setSession as saveSession, clearSession } from '../api/request'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession())

  const login = useCallback((newSession) => {
    saveSession(newSession)
    setSessionState(newSession)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setSessionState(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
