import React from 'react'

export default function Card({ children }: { children: React.ReactNode }) {
  return <div className="border rounded p-4 bg-white shadow-sm">{children}</div>
}