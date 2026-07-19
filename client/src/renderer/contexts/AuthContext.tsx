import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../ipc-client'

export interface RendererSession {
  userId: string
  username: string
}

interface AuthContextValue {
  session: RendererSession | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<RendererSession | null>(null)
  const [loading, setLoading] = useState(true)

  // O main é o dono da sessão; hidratamos a partir dele no boot.
  useEffect(() => {
    api
      .session()
      .then((s) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const s = await api.login(username, password)
    setSession(s)
  }

  async function register(username: string, password: string) {
    await api.register(username, password)
    await login(username, password)
  }

  async function logout() {
    await api.logout()
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
