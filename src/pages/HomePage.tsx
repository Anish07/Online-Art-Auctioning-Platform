import React from 'react'
import { Link } from 'react-router-dom'

import CommunityFeed from '../components/CommunityFeed'

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto p-6 dark:bg-hf-bg min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left 2 Columns */}
        <div className="lg:col-span-2">
          <section className="mt-10">
            <h2 className="text-3xl font-bold dark:text-hf-text">Discover & Collect</h2>
            <p className="mt-2 text-lg text-gray-600 dark:text-hf-muted">Browse original art, commission artists, or list your work.</p>
          </section>

          <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/artists" className="p-6 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card transition-colors group">
              <span className="text-3xl mb-3 block">🎨</span>
              <h3 className="text-lg font-semibold dark:text-hf-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Featured Artists</h3>
              <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">Discover talented artists and request commissions</p>
            </Link>
            <Link to="/auctions" className="p-6 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card transition-colors group">
              <span className="text-3xl mb-3 block">🔨</span>
              <h3 className="text-lg font-semibold dark:text-hf-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Live Auctions</h3>
              <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">Bid on exclusive pieces in real-time</p>
            </Link>
            <Link to="/marketplace" className="p-6 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card transition-colors group">
              <span className="text-3xl mb-3 block">🛍️</span>
              <h3 className="text-lg font-semibold dark:text-hf-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Marketplace</h3>
              <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">Buy artwork directly from artists</p>
            </Link>
            <Link to="/auctions/create" className="p-6 border dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card transition-colors group">
              <span className="text-3xl mb-3 block">➕</span>
              <h3 className="text-lg font-semibold dark:text-hf-text group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Start Selling</h3>
              <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">List your own artwork for auction or sale</p>
            </Link>
          </section>
        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-1 mt-10 lg:mt-0">
          <CommunityFeed />
        </div>
      </div>
    </div>
  )
}