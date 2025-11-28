import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/auth'

export default function RegisterPage() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'artist' | 'buyer'>('buyer')
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setSuccess(null)
    try {
      await register(email, password, name, role)
      if (role === 'artist') {
        setSuccess('Your artist application has been submitted! An admin will review your request. You can use the platform as a buyer in the meantime.')
      } else {
        nav('/')
      }
    } catch (e: any) {
      setErr(e?.message || 'Registration failed')
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold dark:text-hf-text">Create account</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-hf-text rounded" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        <input className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-hf-text rounded" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-hf-text rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-hf-text">I want to:</label>
          <select
            className="w-full p-2 border dark:border-gray-700 dark:bg-gray-800 dark:text-hf-text rounded"
            value={role}
            onChange={(e) => setRole(e.target.value as 'artist' | 'buyer')}
          >
            <option value="buyer">Buy artwork</option>
            <option value="artist">Sell my artwork</option>
          </select>
        </div>
        {role === 'artist' && (
          <p className="text-sm text-gray-600 dark:text-hf-muted bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            Note: Artist accounts require admin approval. You'll be able to use the platform as a buyer until approved.
          </p>
        )}
        {err && <div className="text-red-600">{err}</div>}
        {success && (
          <div className="text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 p-3 rounded">
            {success}
            <Link to="/" className="block mt-2 text-blue-600 dark:text-blue-400 underline">Go to Home</Link>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button className="px-4 py-2 rounded bg-primary text-white">Create account</button>
          <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400">Already have an account?</Link>
        </div>
      </form>
    </div>
  )
}