import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, increment, collection } from 'firebase/firestore'
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
    forSale: boolean
}

export default function MarketplaceItemPage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const navigate = useNavigate()
    const [artwork, setArtwork] = useState<Artwork | null>(null)
    const [loading, setLoading] = useState(true)
    const [watchlist, setWatchlist] = useState<string[]>([])
    const [purchasing, setPurchasing] = useState(false)

    useEffect(() => {
        const fetchArtwork = async () => {
            if (!id) return
            try {
                const docRef = doc(db, 'artworks', id)
                const docSnap = await getDoc(docRef)
                if (docSnap.exists()) {
                    setArtwork({ id: docSnap.id, ...docSnap.data() } as Artwork)
                } else {
                    console.error('Artwork not found')
                }
            } catch (err) {
                console.error('Error fetching artwork:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchArtwork()
    }, [id])

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

    const toggleWatchlist = async () => {
        if (!user?.id || !artwork) return
        try {
            const isWatched = watchlist.includes(artwork.id)
            await updateDoc(doc(db, 'users', user.id), {
                watchlist: isWatched ? arrayRemove(artwork.id) : arrayUnion(artwork.id)
            })
            setWatchlist(isWatched
                ? watchlist.filter(wid => wid !== artwork.id)
                : [...watchlist, artwork.id]
            )
        } catch (err) {
            console.error('Error updating watchlist:', err)
        }
    }

    const handlePurchase = async () => {
        if (!user?.id || !artwork) return

        const userBalance = user.balance || 0
        const userHeldAmount = (user as any).heldAmount || 0
        const availableBalance = userBalance - userHeldAmount
        if (availableBalance < artwork.price) {
            alert(`Insufficient available balance. You need $${artwork.price} but only have $${availableBalance.toFixed(2)} available. Please add funds.`)
            return
        }

        setPurchasing(true)
        try {
            const currentQuantity = artwork.quantity || 1
            const newQuantity = currentQuantity - 1
            const commission = artwork.price * 0.15
            const artistEarnings = artwork.price - commission

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

            await addDoc(collection(db, 'notifications'), {
                userId: artwork.artistId,
                type: 'sale',
                title: 'Artwork Sold!',
                message: `Your artwork "${artwork.title}" was purchased by ${user.name} for $${artwork.price}.`,
                artworkId: artwork.id,
                read: false,
                createdAt: new Date().toISOString()
            })

            if (newQuantity <= 0) {
                await updateDoc(doc(db, 'artworks', artwork.id), {
                    forSale: false,
                    sold: true,
                    soldTo: user.id,
                    soldAt: new Date().toISOString(),
                    quantity: 0
                })
                setArtwork({ ...artwork, forSale: false, quantity: 0 })
            } else {
                await updateDoc(doc(db, 'artworks', artwork.id), {
                    quantity: newQuantity
                })
                setArtwork({ ...artwork, quantity: newQuantity })
            }

            if (watchlist.includes(artwork.id)) {
                await updateDoc(doc(db, 'users', user.id), {
                    watchlist: arrayRemove(artwork.id)
                })
                setWatchlist(watchlist.filter(wid => wid !== artwork.id))
            }
            alert(`Successfully purchased "${artwork.title}"!`)
        } catch (err) {
            console.error('Error purchasing artwork:', err)
            alert('Failed to complete purchase.')
        } finally {
            setPurchasing(false)
        }
    }

    const handlePull = async () => {
        if (!artwork || !confirm(`Pull "${artwork.title}" from marketplace?`)) return
        try {
            await updateDoc(doc(db, 'artworks', artwork.id), {
                forSale: false,
                status: 'portfolio'
            })
            alert('Listing pulled successfully.')
            navigate('/marketplace')
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

    if (loading) return <div className="p-6 text-center dark:text-hf-text">Loading...</div>
    if (!artwork) return <div className="p-6 text-center dark:text-hf-text">Artwork not found.</div>

    return (
        <div className="max-w-6xl mx-auto p-6 dark:bg-hf-bg min-h-screen">
            <Link to="/marketplace" className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block">&larr; Back to Marketplace</Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                {/* Image Section */}
                <div className="bg-white dark:bg-hf-card rounded-lg overflow-hidden border dark:border-gray-700 shadow-sm">
                    <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                        <img
                            src={artwork.imageUrl}
                            alt={artwork.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold dark:text-hf-text">{artwork.title}</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-lg text-gray-600 dark:text-hf-muted">by</span>
                            <Link to={`/artist/${artwork.artistId}`} className="text-lg text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                {artwork.artistName}
                            </Link>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                            {getTypeLabel(artwork.artworkType)}
                        </span>
                        {artwork.medium && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                                {artwork.medium}
                            </span>
                        )}
                        {artwork.dimensions && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                                {artwork.dimensions}
                            </span>
                        )}
                    </div>

                    <div className="bg-white dark:bg-hf-card p-6 rounded-lg border dark:border-gray-700 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl font-bold text-green-700 dark:text-green-400">${artwork.price}</span>
                            <span className="text-sm text-gray-500 dark:text-hf-muted">
                                {artwork.quantity || 1} available
                            </span>
                        </div>

                        {user && user.role !== 'artist' && artwork.forSale && (
                            <div className="space-y-3">
                                <button
                                    onClick={handlePurchase}
                                    disabled={purchasing}
                                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg transition-colors"
                                >
                                    {purchasing ? 'Processing...' : 'Buy Now'}
                                </button>
                                <button
                                    onClick={toggleWatchlist}
                                    className={`w-full py-3 rounded-lg border font-medium transition-colors ${watchlist.includes(artwork.id)
                                        ? 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400'
                                        : 'bg-white dark:bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {watchlist.includes(artwork.id) ? '★ Remove from Watchlist' : '☆ Add to Watchlist'}
                                </button>
                            </div>
                        )}

                        {(!user || user.role === 'artist') && artwork.forSale && (
                            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-600 dark:text-gray-400">
                                {user?.role === 'artist' ? 'Artists cannot buy artworks.' : 'Please log in to purchase.'}
                            </div>
                        )}

                        {!artwork.forSale && (
                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded text-red-600 dark:text-red-400 font-medium">
                                This item is no longer for sale.
                            </div>
                        )}

                        {user && (user.role === 'admin' || user.role === 'csr') && (
                            <div className="mt-4 pt-4 border-t dark:border-gray-700">
                                <button
                                    onClick={handlePull}
                                    className="w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors text-sm"
                                >
                                    Admin: Pull Listing
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold dark:text-hf-text mb-2">Description</h3>
                        <p className="text-gray-600 dark:text-hf-muted whitespace-pre-wrap leading-relaxed">
                            {artwork.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
