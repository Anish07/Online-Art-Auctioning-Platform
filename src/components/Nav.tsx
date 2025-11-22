import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'

export default function Nav() {
  const { user, logout } = useAuth()
  return (
    <header className="border-b">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link to="/" className="text-2xl font-bold">ArtX</Link>
        <nav className="flex items-center gap-4">
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/support">Support</Link>
          {user ? (
            <>
              <span className="text-sm">{user.name}</span>
              <button onClick={logout} className="px-3 py-1 rounded bg-gray-100">Sign out</button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1 rounded bg-primary text-white">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}