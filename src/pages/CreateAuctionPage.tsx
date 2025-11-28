import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'
import { useAuction } from '../context/auction'

type Artwork = {
  id: string
  title: string
  imageUrl: string
  description?: string
}

export default function CreateAuctionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createAuction } = useAuction()

  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startingPrice, setStartingPrice] = useState('100')
  const [reservePrice, setReservePrice] = useState('')
  const [minBidIncrement, setMinBidIncrement] = useState('10')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'artist') {
      navigate('/auctions')
      return
    }

    const fetchArtworks = async () => {
      try {
        const q = query(
          collection(db, 'artworks'),
          where('artistId', '==', user.id)
        )
        const snapshot = await getDocs(q)
        const arts: Artwork[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Show artworks that:
          // - Are not currently listed for sale (forSale !== true)
          // - Are not sold (sold !== true)
          // - Are not already in an active auction (inAuction !== true)
          const isForSale = data.forSale === true
          const isSold = data.sold === true
          const isInAuction = data.inAuction === true

          if (!isForSale && !isSold && !isInAuction) {
            arts.push({ id: doc.id, ...data } as Artwork)
          }
        })
        setArtworks(arts)
      } catch (err) {
        console.error('Error fetching artworks:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchArtworks()

    // Set default times
    const now = new Date()
    const startDefault = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const endDefault = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now

    setStartTime(formatDateTimeLocal(startDefault))
    setEndTime(formatDateTimeLocal(endDefault))
  }, [user, navigate])

  const formatDateTimeLocal = (date: Date) => {
    return date.toISOString().slice(0, 16)
  }

  const handleArtworkSelect = (artwork: Artwork) => {
    setSelectedArtwork(artwork)
    setTitle(artwork.title)
    setDescription(artwork.description || '')
    setImageUrl(artwork.imageUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError('')
    setSubmitting(true)

    try {
      const startingPriceNum = parseFloat(startingPrice)
      const reservePriceNum = parseFloat(reservePrice)
      const minIncrementNum = parseFloat(minBidIncrement)

      if (isNaN(startingPriceNum) || startingPriceNum <= 0) {
        throw new Error('Starting price must be a positive number')
      }
      if (isNaN(reservePriceNum) || reservePriceNum <= 0) {
        throw new Error('Reserve price must be a positive number')
      }
      if (isNaN(minIncrementNum) || minIncrementNum <= 0) {
        throw new Error('Minimum bid increment must be a positive number')
      }
      if (reservePriceNum < startingPriceNum) {
        throw new Error('Reserve price must be greater than or equal to starting price')
      }

      const startDate = new Date(startTime)
      const endDate = new Date(endTime)

      if (endDate <= startDate) {
        throw new Error('End time must be after start time')
      }

      const auctionData = {
        artworkId: selectedArtwork?.id || '',
        title,
        description,
        imageUrl,
        artistId: user.id,
        artistName: user.name,
        startingPrice: startingPriceNum,
        reservePrice: reservePriceNum,
        minBidIncrement: minIncrementNum,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      }

      const auctionId = await createAuction(auctionData)
      navigate(`/auctions/${auctionId}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create auction')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || user.role !== 'artist') {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold dark:text-hf-text mb-6">Create New Auction</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Artwork Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Select from your artworks (optional)
          </label>
          {loading ? (
            <p className="text-gray-500 dark:text-hf-muted">Loading your artworks...</p>
          ) : artworks.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {artworks.map((artwork) => (
                <button
                  key={artwork.id}
                  type="button"
                  onClick={() => handleArtworkSelect(artwork)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedArtwork?.id === artwork.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-hf-muted text-sm">No artworks available. Upload artwork first or your artworks may already be sold/in auction.</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Auction Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter auction title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the artwork being auctioned"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium mb-2">Image URL *</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            required
            className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
          {imageUrl && (
            <div className="mt-2 w-32 h-32 bg-gray-100 rounded overflow-hidden">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Starting Price ($) *</label>
            <input
              type="number"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reserve Price ($) *</label>
            <input
              type="number"
              value={reservePrice}
              onChange={(e) => setReservePrice(e.target.value)}
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">Minimum price to sell</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Bid Increment ($) *</label>
            <input
              type="number"
              value={minBidIncrement}
              onChange={(e) => setMinBidIncrement(e.target.value)}
              required
              min="1"
              step="0.01"
              className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Time *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Time *</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/auctions')}
            className="px-4 py-2 border dark:border-gray-700 rounded hover:bg-gray-50 dark:bg-hf-card"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Auction'}
          </button>
        </div>
      </form>
    </div>
  )
}
