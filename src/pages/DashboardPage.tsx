import React from 'react'
import { useAuth } from '../context/auth'

export default function DashboardPage() {
  const { user } = useAuth()
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-semibold">Dashboard</h2>
      <p className="mt-2">Welcome back, {user?.name}</p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">My Listings</div>
        <div className="p-4 border rounded">Commissions</div>
        <div className="p-4 border rounded">Settings</div>
      </div>
    </div>
  )
}