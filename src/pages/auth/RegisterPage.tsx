import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.auth.register({ name, email, password })
      nav('/login')
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-semibold">Create account</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input className="w-full p-2 border rounded" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Full name" />
        <input className="w-full p-2 border rounded" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" />
        <input className="w-full p-2 border rounded" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Password" type="password" />
        <button className="px-4 py-2 rounded bg-primary text-white">Create account</button>
      </form>
    </div>
  )
}