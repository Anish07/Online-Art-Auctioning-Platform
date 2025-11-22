import React, { useState } from 'react'

export default function UploadArtworkPage() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Mock upload — replace with API call')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-semibold">Upload artwork</h2>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="w-full p-2 border rounded" />
        <input value={price} onChange={(e)=>setPrice(e.target.value)} placeholder="Price (USD)" className="w-full p-2 border rounded" />
        <input type="file" className="w-full" />
        <button className="px-4 py-2 rounded bg-primary text-white">Upload</button>
      </form>
    </div>
  )
}