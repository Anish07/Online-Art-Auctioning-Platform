import React, { useState } from 'react'

export default function SupportPage() {
  const [message, setMessage] = useState('')
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Ticket submitted (mock)')
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold">Support</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <textarea className="w-full p-2 border rounded" value={message} onChange={(e)=>setMessage(e.target.value)} />
        <button className="px-4 py-2 rounded bg-primary text-white">Submit</button>
      </form>
    </div>
  )
}