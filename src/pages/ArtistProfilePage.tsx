import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'

type Artist = {
  id: string
  name: string
  email: string
  role: string
  bio?: string
  website?: string
  instagram?: string
  twitter?: string
  contactEmail?: string
  location?: string
  followers?: string[]
  commissionsOpen?: boolean
  commissionInfo?: string
}

type Artwork = {
  id: string
  title: string
  description: string
  imageUrl: string
  forSale: boolean
  price: number | null
  medium?: string
  dimensions?: string
}

export default function ArtistProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showCommissionForm, setShowCommissionForm] = useState(false)
  const [commissionTitle, setCommissionTitle] = useState('')
  const [commissionDescription, setCommissionDescription] = useState('')
  const [submittingCommission, setSubmittingCommission] = useState(false)
  const [commissionSuccess, setCommissionSuccess] = useState('')

  useEffect(() => {
    if (!id) return

    const fetchArtistData = async () => {
      setLoading(true)
      try {
        // Fetch artist info
        const artistDoc = await getDoc(doc(db, 'users', id))
        if (artistDoc.exists()) {
          const artistData = { id: artistDoc.id, ...artistDoc.data() } as Artist
          setArtist(artistData)
          // Check if current user follows this artist
          if (user?.id) {
            setIsFollowing(artistData.followers?.includes(user.id) || false)
          }
        }

        // Fetch artist's artworks (exclude sold)
        const q = query(collection(db, 'artworks'), where('artistId', '==', id))
        const snapshot = await getDocs(q)
        const arts: Artwork[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          // Only show artworks that are not sold
          if (data.sold !== true) {
            arts.push({ id: doc.id, ...data } as Artwork)
          }
        })
        setArtworks(arts)
      } catch (err) {
        console.error('Error fetching artist:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchArtistData()
  }, [id, user?.id])

  const handleFollow = async () => {
    if (!user?.id || !artist?.id) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(doc(db, 'users', artist.id), {
          followers: arrayRemove(user.id)
        })
        await updateDoc(doc(db, 'users', user.id), {
          following: arrayRemove(artist.id)
        })
        setIsFollowing(false)
        setArtist(prev => prev ? { ...prev, followers: (prev.followers || []).filter(f => f !== user.id) } : null)
      } else {
        // Follow
        await updateDoc(doc(db, 'users', artist.id), {
          followers: arrayUnion(user.id)
        })
        await updateDoc(doc(db, 'users', user.id), {
          following: arrayUnion(artist.id)
        })
        setIsFollowing(true)
        setArtist(prev => prev ? { ...prev, followers: [...(prev.followers || []), user.id] } : null)
      }
    } catch (err) {
      console.error('Error updating follow status:', err)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleCommissionRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !artist || !commissionTitle.trim() || !commissionDescription.trim()) return

    setSubmittingCommission(true)
    try {
      await addDoc(collection(db, 'commissions'), {
        artistId: artist.id,
        artistName: artist.name,
        buyerId: user.id,
        buyerName: user.name,
        buyerEmail: user.email,
        title: commissionTitle.trim(),
        description: commissionDescription.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        messages: [],
      })

      // Notify the artist about new commission request
      await addDoc(collection(db, 'notifications'), {
        userId: artist.id,
        type: 'commission_request',
        title: 'New Commission Request',
        message: `${user.name} has requested a commission: "${commissionTitle.trim()}"`,
        read: false,
        createdAt: new Date().toISOString(),
      })

      setCommissionTitle('')
      setCommissionDescription('')
      setShowCommissionForm(false)
      setCommissionSuccess('Commission request sent! The artist will review your request.')
      setTimeout(() => setCommissionSuccess(''), 5000)
    } catch (err) {
      console.error('Error submitting commission request:', err)
    } finally {
      setSubmittingCommission(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!artist) return <div className="p-6">Artist not found</div>

  const listedArtworks = artworks.filter(a => a.forSale)
  const portfolioArtworks = artworks.filter(a => !a.forSale)

  const isOwnProfile = user?.id === artist.id

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-600 dark:text-hf-muted flex-shrink-0">
          {artist.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold dark:text-hf-text">{artist.name}</h2>
              <p className="text-gray-600 dark:text-hf-muted">
                Artist{artist.location && ` • ${artist.location}`} • {artist.followers?.length || 0} followers
              </p>
            </div>
            {user && !isOwnProfile && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`px-4 py-2 rounded font-medium transition-colors ${isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
              >
                {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
          {artist.bio && (
            <p className="text-gray-700 dark:text-hf-text mt-2">{artist.bio}</p>
          )}
          {(artist.contactEmail || artist.website || artist.instagram || artist.twitter) && (
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {artist.contactEmail && (
                <a href={`mailto:${artist.contactEmail}`} className="text-blue-600 hover:underline">
                  Email
                </a>
              )}
              {artist.website && (
                <a href={artist.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Website
                </a>
              )}
              {artist.instagram && (
                <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Instagram
                </a>
              )}
              {artist.twitter && (
                <a href={`https://twitter.com/${artist.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Twitter
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Artworks for Sale */}
      {listedArtworks.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold dark:text-hf-text mb-4">Available for Purchase</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {listedArtworks.map((artwork) => (
              <div key={artwork.id} className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-medium dark:text-hf-text">{artwork.title}</h4>
                  {artwork.medium && (
                    <p className="text-xs text-gray-500 dark:text-hf-muted">{artwork.medium}</p>
                  )}
                  <p className="text-lg font-bold text-green-700 mt-1">${artwork.price}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Portfolio */}
      {portfolioArtworks.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold dark:text-hf-text mb-4">Portfolio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {portfolioArtworks.map((artwork) => (
              <div key={artwork.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-3">
                  <h4 className="font-medium dark:text-hf-text">{artwork.title}</h4>
                  {artwork.medium && (
                    <p className="text-xs text-gray-500 dark:text-hf-muted">{artwork.medium}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {artworks.length === 0 && (
        <div className="text-center py-8 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
          <p className="text-gray-600 dark:text-hf-muted">This artist hasn't uploaded any artwork yet.</p>
        </div>
      )}

      {/* Commission Section */}
      {artist.commissionsOpen && !isOwnProfile && (
        <section className="mt-8 border dark:border-gray-700 rounded-lg p-6 bg-green-50 dark:bg-green-900/20">
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">Commissions Open</h3>
          {artist.commissionInfo && (
            <p className="text-gray-700 dark:text-hf-text mb-4 whitespace-pre-wrap">{artist.commissionInfo}</p>
          )}

          {commissionSuccess && (
            <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border dark:border-green-700 rounded">
              {commissionSuccess}
            </div>
          )}

          {user ? (
            !showCommissionForm ? (
              <button
                onClick={() => setShowCommissionForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Request Commission
              </button>
            ) : (
              <form onSubmit={handleCommissionRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Commission Title *</label>
                  <input
                    type="text"
                    value={commissionTitle}
                    onChange={(e) => setCommissionTitle(e.target.value)}
                    placeholder="Brief title for your commission request"
                    className="w-full p-2 border dark:border-gray-700 rounded"
                    disabled={submittingCommission}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={commissionDescription}
                    onChange={(e) => setCommissionDescription(e.target.value)}
                    placeholder="Describe what you'd like commissioned, including any specific details, references, size, budget, etc."
                    rows={5}
                    className="w-full p-2 border dark:border-gray-700 rounded"
                    disabled={submittingCommission}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submittingCommission || !commissionTitle.trim() || !commissionDescription.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {submittingCommission ? 'Sending...' : 'Send Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCommissionForm(false)}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )
          ) : (
            <p className="text-sm text-gray-600 dark:text-hf-muted">
              <Link to="/login" className="text-blue-600 hover:underline">Log in</Link> to request a commission.
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        <Link to="/artists" className="text-blue-600 hover:underline">
          ← Back to Artists
        </Link>
      </div>
    </div>
  )
}