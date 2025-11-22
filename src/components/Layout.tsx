import React from 'react'
import Nav from './Nav'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main className="container mx-auto p-6">{children}</main>
    </div>
  )
}