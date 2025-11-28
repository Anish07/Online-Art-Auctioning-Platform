import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { collection, query, where, getDocs, doc, updateDoc, getDoc, arrayRemove } from 'firebase/firestore'
import { db } from '../lib/firebase'
import CommunityFeed from '../components/CommunityFeed'

type Artwork = {
  id: string
  title: string
  description: string
  imageUrl: string
  status: 'portfolio' | 'listed'
  forSale: boolean
  price: number | null
  createdAt: string
  artistId?: string
  artistName?: string
}

type Purchase = {
  artworkId: string
  title: string
  artistName: string
  artistId: string
  price: number
  imageUrl: string
  purchasedAt: string
  artworkType?: string
}

type Sale = {
  artworkId: string
  title: string
  buyerId: string
  buyerName: string
  price: number
  imageUrl: string
  soldAt: string
  artworkType?: string
}

type WatchlistArtwork = Artwork & {
  artistName: string
  artistId: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loadingArt, setLoadingArt] = useState(false)
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [price, setPrice] = useState('')
  const [artworkType, setArtworkType] = useState<'physical' | 'digital' | 'print'>('physical')
  const [quantity, setQuantity] = useState('1')
  const [updating, setUpdating] = useState(false)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistArtwork[]>([])
  const [loadingBuyer, setLoadingBuyer] = useState(false)
  const [sales, setSales] = useState<Sale[]>([])
  const [loadingArtistData, setLoadingArtistData] = useState(false)

  useEffect(() => {
    if (user?.role === 'artist') {
      const fetchArtworks = async () => {
        setLoadingArt(true)
        try {
          const q = query(collection(db, 'artworks'), where('artistId', '==', user.id))
          const snapshot = await getDocs(q)
          const arts: Artwork[] = []
          snapshot.forEach((doc) => {
            const data = doc.data()
            if (data.sold !== true) {
              arts.push({ id: doc.id, ...data } as Artwork)
            }
          })
          setArtworks(arts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
        } catch (err) {
          console.error('Error fetching artworks:', err)
        } finally {
          setLoadingArt(false)
        }
      }
      fetchArtworks()

      const fetchArtistData = async () => {
        setLoadingArtistData(true)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id))
          if (userDoc.exists()) {
            setSales(userDoc.data().sales || [])
          }
        } catch (err) {
          console.error('Error fetching artist data:', err)
        } finally {
          setLoadingArtistData(false)
        }
      }
      fetchArtistData()
    }
  }, [user])

  useEffect(() => {
    if (user?.role === 'buyer' || (user && user.role !== 'artist')) {
      const fetchBuyerData = async () => {
        setLoadingBuyer(true)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id))
          if (userDoc.exists()) {
            const data = userDoc.data()
            setPurchases(data.purchases || [])

            const watchlistIds: string[] = data.watchlist || []
            if (watchlistIds.length > 0) {
              const watchlistArts: WatchlistArtwork[] = []
              for (const artId of watchlistIds) {
                const artDoc = await getDoc(doc(db, 'artworks', artId))
                if (artDoc.exists()) {
                  watchlistArts.push({ id: artDoc.id, ...artDoc.data() } as WatchlistArtwork)
                }
              }
              setWatchlist(watchlistArts)
            }
          }
        } catch (err) {
          console.error('Error fetching buyer data:', err)
        } finally {
          setLoadingBuyer(false)
        }
      }
      fetchBuyerData()
    }
  }, [user])

  const removeFromWatchlist = async (artworkId: string) => {
    if (!user?.id) return
    try {
      await updateDoc(doc(db, 'users', user.id), {
        watchlist: arrayRemove(artworkId)
      })
      setWatchlist(watchlist.filter(a => a.id !== artworkId))
    } catch (err) {
      console.error('Error removing from watchlist:', err)
    }
  }

  const openListModal = (artwork: Artwork) => {
    setSelectedArtwork(artwork)
    setPrice(artwork.price?.toString() || '')
    setArtworkType((artwork as any).artworkType || 'physical')
    setQuantity((artwork as any).quantity?.toString() || '1')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedArtwork(null)
    setPrice('')
    setArtworkType('physical')
    setQuantity('1')
  }

  const handleListForSale = async () => {
    if (!selectedArtwork || !price) return
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'artworks', selectedArtwork.id), {
        forSale: true,
        price: parseFloat(price),
        artworkType,
        quantity: parseInt(quantity) || 1,
        status: 'listed',
      })
      setArtworks(artworks.map(a =>
        a.id === selectedArtwork.id
          ? { ...a, forSale: true, price: parseFloat(price), status: 'listed' as const }
          : a
      ))
      closeModal()
    } catch (err) {
      console.error('Error listing artwork:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleRemoveFromSale = async (artwork: Artwork) => {
    try {
      await updateDoc(doc(db, 'artworks', artwork.id), {
        forSale: false,
        price: null,
        status: 'portfolio',
      })
      setArtworks(artworks.map(a =>
        a.id === artwork.id
          ? { ...a, forSale: false, price: null, status: 'portfolio' as const }
          : a
      ))
    } catch (err) {
      console.error('Error removing from sale:', err)
    }
  }

  return (
    <div className="container mx-auto p-4 dark:bg-hf-bg min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-6 dark:text-hf-text">Dashboard</h1>
          <p className="mt-2 dark:text-hf-muted">Welcome back, {user?.name}</p>

          {user?.artistStatus === 'pending' && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-400">Artist Application Pending</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Your application to become an artist is under review.
              </p>
            </div>
          )}

          {user?.artistStatus === 'rejected' && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h3 className="font-medium text-red-800 dark:text-red-400">Artist Application Rejected</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Unfortunately, your artist application was not approved.
              </p>
            </div>
          )}

          {user?.role === 'artist' && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-800 dark:text-green-400">Verified Artist</h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                You're approved to sell artwork on ArtX!
              </p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {user?.role === 'artist' && (
              <>
                <Link to="/upload" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">Upload Artwork</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">Add artwork to portfolio</p>
                </Link>
                <a href="#my-listings" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">My Listings</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">{artworks.filter(a => a.forSale).length} active listings</p>
                </a>
                <a href="#sales-history" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">Sales History</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">{sales.length} total sales</p>
                </a>
                <Link to="/commissions" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">Commissions</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">View commission requests</p>
                </Link>
              </>
            )}
            {user?.role === 'buyer' && (
              <>
                <a href="#my-purchases" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">My Purchases</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">{purchases.length} purchased artwork{purchases.length !== 1 ? 's' : ''}</p>
                </a>
                <a href="#my-watchlist" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">Watchlist</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">{watchlist.length} artwork{watchlist.length !== 1 ? 's' : ''} watching</p>
                </a>
                <Link to="/marketplace" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                  <h3 className="font-medium dark:text-hf-text">Browse Art</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">Discover new pieces</p>
                </Link>
              </>
            )}
            {user?.role === 'artist' ? (
              <Link to="/artist-settings" className="p-4 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-hf-card">
                <h3 className="font-medium dark:text-hf-text">Profile Settings</h3>
                <p className="text-sm text-gray-600 dark:text-hf-muted">Edit contact info & bio</p>
              </Link>
            ) : (
              <div className="p-4 border dark:border-gray-700 rounded dark:bg-hf-card">
                <h3 className="font-medium dark:text-hf-text">Settings</h3>
                <p className="text-sm text-gray-600 dark:text-hf-muted">Account preferences</p>
              </div>
            )}
          </div>

          {user?.role === 'artist' && (
            <div className="mt-8" id="my-listings">
              <h3 className="text-xl font-semibold mb-4 dark:text-hf-text">My Listings</h3>
              {artworks.filter(a => a.forSale).length === 0 ? (
                <div className="text-center py-6 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
                  <p className="text-gray-600 dark:text-hf-muted">You don't have any active listings.</p>
                  <p className="text-sm text-gray-500 dark:text-hf-muted mt-1">List artwork from your portfolio below.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {artworks.filter(a => a.forSale).map((artwork) => (
                    <div key={artwork.id} className="border dark:border-gray-700 rounded-lg overflow-hidden bg-green-50 dark:bg-green-900/20">
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium truncate dark:text-hf-text">{artwork.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-hf-muted">by {user?.name}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-green-700 dark:text-green-400">${artwork.price}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveFromSale(artwork)}
                          className="mt-2 w-full text-xs px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                        >
                          Remove from Sale
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {user?.role === 'buyer' && (
            <div className="mt-8" id="my-watchlist">
              <h3 className="text-xl font-semibold mb-4 dark:text-hf-text">My Watchlist</h3>
              {watchlist.length === 0 ? (
                <div className="text-center py-6 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
                  <p className="text-gray-600 dark:text-hf-muted">Your watchlist is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {watchlist.filter(a => a.forSale).map((artwork) => (
                    <div key={artwork.id} className="border dark:border-gray-700 rounded-lg overflow-hidden bg-green-50 dark:bg-green-900/20">
                      <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.title}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="p-3">
                        <h4 className="font-medium truncate dark:text-hf-text">{artwork.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-hf-muted">by {artwork.artistName}</p>
                        <div className="flex items-center justify-between mt-2">
                          {artwork.forSale ? (
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">${artwork.price}</span>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-hf-muted">Not for sale</span>
                          )}
                          <Link
                            to={`/artist/${artwork.artistId}`}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View artist
                          </Link>
                        </div>
                        <button
                          onClick={() => removeFromWatchlist(artwork.id)}
                          className="mt-2 w-full text-xs px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/40"
                        >
                          Remove from Watchlist
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 shrink-0 space-y-6">
          <CommunityFeed />
        </div>
      </div>

      {showModal && selectedArtwork && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-hf-card rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-hf-text">List for Sale</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-hf-muted">Artwork: {selectedArtwork.title}</p>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-hf-text">Artwork Type *</label>
                <select
                  value={artworkType}
                  onChange={(e) => setArtworkType(e.target.value as any)}
                  className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-hf-text"
                >
                  <option value="physical">Physical Original</option>
                  <option value="digital">Digital Artwork</option>
                  <option value="print">Print / Reproduction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-hf-text">Quantity Available *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-hf-text"
                  min="1"
                />
                <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">
                  {artworkType === 'physical' ? 'Usually 1 for originals' : 'Number of copies available'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-hf-text">Price (USD) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Enter price"
                  className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-800 dark:text-hf-text"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-hf-text"
              >
                Cancel
              </button>
              <button
                onClick={handleListForSale}
                disabled={!price || !quantity || updating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Listing...' : 'List for Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}