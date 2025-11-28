import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      nav('/')
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold dark:text-hf-text">Sign in</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input className="w-full p-2 border dark:border dark:border dark:bg-gray-800 dark:text-hf-text-gray-700-gray-700 rounded" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full p-2 border dark:border dark:border dark:bg-gray-800 dark:text-hf-text-gray-700-gray-700 rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        {err && <div className="text-red-600">{err}</div>}
        <div className="flex items-center justify-between">
          <button className="px-4 py-2 rounded bg-primary text-white">Sign in</button>
          <Link to="/register" className="text-sm text-blue-600">Create account</Link>
        </div>
      </form>
    </div>
  )
}