import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Artist = {
  id: string
  name: string
  bio?: string
  location?: string
  commissionsOpen?: boolean
  followers?: string[]
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'commissions'>('all')

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'artist'))
        const snapshot = await getDocs(q)
        const artistList: Artist[] = []
        snapshot.forEach((doc) => {
          artistList.push({ id: doc.id, ...doc.data() } as Artist)
        })
        setArtists(artistList)
      } catch (err) {
        console.error('Error fetching artists:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchArtists()
  }, [])

  const filteredArtists = filter === 'commissions'
    ? artists.filter(a => a.commissionsOpen)
    : artists

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold dark:text-hf-text mb-2">Artists</h1>
      <p className="text-gray-600 dark:text-hf-muted mb-6">Discover talented artists and commission custom artwork</p>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-hf-text'
            }`}
        >
          All Artists
        </button>
        <button
          onClick={() => setFilter('commissions')}
          className={`px-4 py-2 rounded ${filter === 'commissions' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-hf-text'
            }`}
        >
          Open for Commissions
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-hf-muted">Loading artists...</p>
      ) : filteredArtists.length === 0 ? (
        <div className="text-center py-12 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
          <p className="text-gray-600 dark:text-hf-muted">
            {filter === 'commissions' ? 'No artists are currently open for commissions.' : 'No artists found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredArtists.map((artist) => (
            <Link
              key={artist.id}
              to={`/artist/${artist.id}`}
              className="border dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white dark:bg-hf-card"
            >
              <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-hf-muted mb-3">
                {artist.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="font-medium dark:text-hf-text text-center">{artist.name}</h3>
              {artist.location && (
                <p className="text-sm text-gray-500 dark:text-hf-muted text-center">{artist.location}</p>
              )}
              <p className="text-xs text-gray-500 dark:text-hf-muted text-center mt-1">
                {artist.followers?.length || 0} followers
              </p>
              {artist.commissionsOpen && (
                <div className="mt-2 text-center">
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Open for Commissions
                  </span>
                </div>
              )}
              {artist.bio && (
                <p className="text-sm text-gray-600 dark:text-hf-muted mt-2 line-clamp-2">{artist.bio}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
