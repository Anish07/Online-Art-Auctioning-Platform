import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Link } from 'react-router-dom'

export default function MarketplacePage() {
  const [listings, setListings] = useState<any[]>([])
  useEffect(() => {
    api.marketplace.list().then((d) => setListings(d))
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-semibold">Marketplace</h2>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {listings.map((l) => (
          <div key={l.id} className="border rounded p-4">
            <div className="h-40 bg-gray-100 mb-2 flex items-center justify-center">Image</div>
            <h3 className="font-semibold">{l.title}</h3>
            <div>${l.price}</div>
            <Link to={`/artist/${l.artistId}`} className="text-sm text-blue-600">View artist</Link>
          </div>
        ))}
      </div>
    </div>
  )
}