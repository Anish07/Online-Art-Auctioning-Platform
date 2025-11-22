import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">ArtX</h1>
        <nav>
          <Link className="mr-4" to="/marketplace">Marketplace</Link>
          <Link to="/login">Sign in</Link>
        </nav>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Discover & Collect</h2>
        <p className="mt-2 text-gray-600">Browse original art, commission artists, or list your work.</p>
      </section>

      <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">Featured Artist</div>
        <div className="p-4 border rounded">Top Auctions</div>
        <div className="p-4 border rounded">New Listings</div>
      </section>
    </div>
  )
}