import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, increment } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'

type Artwork = {
  id: string
  title: string
  description: string
  imageUrl: string
  artistId: string
  artistName: string
  price: number
  medium?: string
  dimensions?: string
  artworkType?: 'physical' | 'digital' | 'print'
  quantity?: number
}

export default function MarketplacePage() {
  const { user } = useAuth()
  const [listings, setListings] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, 'artworks'), where('forSale', '==', true))
        const snapshot = await getDocs(q)
        const arts: Artwork[] = []
        snapshot.forEach((doc) => {
          arts.push({ id: doc.id, ...doc.data() } as Artwork)
        })
        setListings(arts)
      } catch (err) {
        console.error('Error fetching listings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchListings()
  }, [])

  useEffect(() => {
    const fetchWatchlist = async () => {
      if (!user?.id) return
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id))
        if (userDoc.exists()) {
          setWatchlist(userDoc.data().watchlist || [])
        }
      } catch (err) {
        console.error('Error fetching watchlist:', err)
      }
    }
    fetchWatchlist()
  }, [user?.id])

  const toggleWatchlist = async (artworkId: string) => {
    if (!user?.id) return
    try {
      const isWatched = watchlist.includes(artworkId)
      await updateDoc(doc(db, 'users', user.id), {
        watchlist: isWatched ? arrayRemove(artworkId) : arrayUnion(artworkId)
      })
      setWatchlist(isWatched
        ? watchlist.filter(id => id !== artworkId)
        : [...watchlist, artworkId]
      )
    } catch (err) {
      console.error('Error updating watchlist:', err)
    }
  }

  const handlePurchase = async (artwork: Artwork) => {
    if (!user?.id) return

    // Check if user has sufficient available balance (balance minus held amount)
    const userBalance = user.balance || 0
    const userHeldAmount = (user as any).heldAmount || 0
    const availableBalance = userBalance - userHeldAmount
    if (availableBalance < artwork.price) {
      alert(`Insufficient available balance. You need $${artwork.price} but only have $${availableBalance.toFixed(2)} available${userHeldAmount > 0 ? ` ($${userHeldAmount.toFixed(2)} held in auction bids)` : ''}. Please add funds to your wallet.`)
      return
    }

    setPurchasing(artwork.id)
    try {
      const currentQuantity = artwork.quantity || 1
      const newQuantity = currentQuantity - 1

      // Calculate commission (15%)
      const commission = artwork.price * 0.15
      const artistEarnings = artwork.price - commission

      // Deduct from buyer's balance
      await updateDoc(doc(db, 'users', user.id), {
        balance: increment(-artwork.price),
        purchases: arrayUnion({
          artworkId: artwork.id,
          title: artwork.title,
          artistName: artwork.artistName,
          artistId: artwork.artistId,
          price: artwork.price,
          imageUrl: artwork.imageUrl,
          artworkType: artwork.artworkType || 'physical',
          purchasedAt: new Date().toISOString()
        })
      })

      // Add to artist's balance (minus commission) and sales history
      await updateDoc(doc(db, 'users', artwork.artistId), {
        balance: increment(artistEarnings),
        sales: arrayUnion({
          artworkId: artwork.id,
          title: artwork.title,
          buyerId: user.id,
          buyerName: user.name,
          price: artwork.price,
          commission: commission,
          earnings: artistEarnings,
          imageUrl: artwork.imageUrl,
          artworkType: artwork.artworkType || 'physical',
          soldAt: new Date().toISOString()
        })
      })

      // Record transactions
      await addDoc(collection(db, 'transactions'), {
        userId: user.id,
        type: 'purchase',
        amount: -artwork.price,
        description: `Purchased "${artwork.title}"`,
        artworkId: artwork.id,
        createdAt: new Date().toISOString()
      })

      await addDoc(collection(db, 'transactions'), {
        userId: artwork.artistId,
        type: 'sale',
        amount: artistEarnings,
        description: `Sold "${artwork.title}" (after 15% commission)`,
        artworkId: artwork.id,
        commission: commission,
        createdAt: new Date().toISOString()
      })

      // Create notification for artist
      await addDoc(collection(db, 'notifications'), {
        userId: artwork.artistId,
        type: 'sale',
        title: 'Artwork Sold!',
        message: `Your artwork "${artwork.title}" was purchased by ${user.name} for $${artwork.price}. You earned $${artistEarnings.toFixed(2)} (after 15% commission).`,
        artworkId: artwork.id,
        artworkTitle: artwork.title,
        buyerName: user.name,
        price: artwork.price,
        earnings: artistEarnings,
        read: false,
        createdAt: new Date().toISOString()
      })

      // Update artwork - decrement quantity or mark as sold
      if (newQuantity <= 0) {
        await updateDoc(doc(db, 'artworks', artwork.id), {
          forSale: false,
          sold: true,
          soldTo: user.id,
          soldAt: new Date().toISOString(),
          quantity: 0
        })
        // Remove from listings
        setListings(listings.filter(l => l.id !== artwork.id))
      } else {
        await updateDoc(doc(db, 'artworks', artwork.id), {
          quantity: newQuantity
        })
        // Update quantity in listings
        setListings(listings.map(l => l.id === artwork.id ? { ...l, quantity: newQuantity } : l))
      }

      // Remove from watchlist if present
      if (watchlist.includes(artwork.id)) {
        await updateDoc(doc(db, 'users', user.id), {
          watchlist: arrayRemove(artwork.id)
        })
        setWatchlist(watchlist.filter(id => id !== artwork.id))
      }
      alert(`Successfully purchased "${artwork.title}" for $${artwork.price}!`)
    } catch (err) {
      console.error('Error purchasing artwork:', err)
      alert('Failed to complete purchase. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  const handleReport = (artworkId: string) => {
    alert(`Reported artwork ${artworkId}. Thank you for helping keep our community safe.`)
  }

  const handlePull = async (artwork: Artwork) => {
    if (!confirm(`Are you sure you want to pull "${artwork.title}" from the marketplace?`)) return
    try {
      await updateDoc(doc(db, 'artworks', artwork.id), {
        forSale: false,
        status: 'portfolio' // Return to portfolio
      })
      setListings(listings.filter(l => l.id !== artwork.id))
      alert('Listing pulled successfully.')
    } catch (err) {
      console.error('Error pulling listing:', err)
      alert('Failed to pull listing.')
    }
  }
  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'digital': return 'Digital'
      case 'print': return 'Print'
      default: return 'Physical'
    }
  }

  const getTypeBadgeColor = (type?: string) => {
    switch (type) {
      case 'digital': return 'bg-purple-100 text-purple-700'
      case 'print': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 dark:bg-hf-bg min-h-screen">
      <div>
        <h2 className="text-2xl font-semibold dark:text-hf-text">Marketplace</h2>
        <p className="text-gray-600 dark:text-hf-muted mt-1">Discover and purchase original artwork</p>
      </div>


      {
        loading ? (
          <p className="mt-4 text-gray-500 dark:text-hf-muted">Loading artworks...</p>
        ) : listings.length === 0 ? (
          <div className="mt-8 text-center py-12 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
            <p className="text-gray-600 dark:text-hf-muted">No artworks available for sale yet.</p>
            <p className="text-sm text-gray-500 dark:text-hf-muted mt-1">Check back later for new listings!</p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {listings.map((artwork) => (
              <div key={artwork.id} className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-hf-card">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative group cursor-pointer">
                  <Link to={`/marketplace/${artwork.id}`}>
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/marketplace/${artwork.id}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <h3 className="font-semibold text-lg dark:text-hf-text">{artwork.title}</h3>
                    </Link>
                    <span className={`text-xs px-2 py-1 rounded ${getTypeBadgeColor(artwork.artworkType)}`}>
                      {getTypeLabel(artwork.artworkType)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">by {artwork.artistName}</p>
                  {artwork.medium && (
                    <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">{artwork.medium}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-hf-muted">
                    <span>Qty: {artwork.quantity || 1} available</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">${artwork.price}</span>
                    <Link
                      to={`/artist/${artwork.artistId}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View artist
                    </Link>
                  </div>
                  {user && user.role !== 'artist' && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggleWatchlist(artwork.id)}
                        className={`flex-1 text-sm px-3 py-2 rounded border ${watchlist.includes(artwork.id)
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-hf-text'
                          }`}
                      >
                        {watchlist.includes(artwork.id) ? '★ Watch' : '☆ Watch'}
                      </button>
                      <button
                        onClick={() => handlePurchase(artwork)}
                        disabled={purchasing === artwork.id}
                        className="flex-1 text-sm px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {purchasing === artwork.id ? 'Buying...' : 'Buy Now'}
                      </button>
                      {(user.role === 'admin' || user.role === 'csr') ? (
                        <button
                          onClick={() => handlePull(artwork)}
                          className="px-3 py-2 rounded border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          title="Pull Listing"
                        >
                          Pull
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReport(artwork.id)}
                          className="px-3 py-2 rounded border bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Report this artwork"
                        >
                          🚩
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div >
  )
}