import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

type User = {
  id: string
  name: string
  email: string
  role: 'artist' | 'buyer' | 'csr' | 'admin'
}

const AuthContext = createContext<any>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('artx_user')
    if (raw) setUser(JSON.parse(raw))
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password)
    setUser(res.user)
    localStorage.setItem('artx_user', JSON.stringify(res.user))
    localStorage.setItem('artx_token', res.token)
    return res
  }

  const logout = () => {
    localStorage.removeItem('artx_user')
    localStorage.removeItem('artx_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)