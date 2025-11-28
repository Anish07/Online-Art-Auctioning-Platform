import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuction, Auction } from '../context/auction'

type FeedItem = {
    id: string
    type: 'auction' | 'marketplace'
    title: string
    artistName: string
    artistId: string
    imageUrl: string
    price: number
    date: string // Created at or Start time
    status?: string // For auctions
    link: string
}

export default function CommunityFeed() {
    const { auctions } = useAuction()
    const [feedItems, setFeedItems] = useState<FeedItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'auction' | 'marketplace'>('all')

    useEffect(() => {
        const fetchMarketplaceItems = async () => {
            try {
                // Fetch recent marketplace items
                // Note: In a real app we'd want an index on createdAt, but for now we'll just fetch forSale items
                const q = query(collection(db, 'artworks'), where('forSale', '==', true), limit(10))
                const snapshot = await getDocs(q)

                const marketplaceItems: FeedItem[] = []
                snapshot.forEach((doc) => {
                    const data = doc.data()
                    marketplaceItems.push({
                        id: doc.id,
                        type: 'marketplace',
                        title: data.title,
                        artistName: data.artistName,
                        artistId: data.artistId,
                        imageUrl: data.imageUrl,
                        price: data.price,
                        date: data.createdAt || new Date().toISOString(), // Fallback if createdAt missing
                        link: `/marketplace/${doc.id}`
                    })
                })
                return marketplaceItems
            } catch (err) {
                console.error('Error fetching marketplace items:', err)
                return []
            }
        }

        const processAuctions = () => {
            // Filter for active and upcoming auctions
            const relevantAuctions = auctions.filter(a => a.status === 'active' || a.status === 'scheduled')

            return relevantAuctions.map(a => ({
                id: a.id,
                type: 'auction' as const,
                title: a.title,
                artistName: a.artistName,
                artistId: a.artistId,
                imageUrl: a.imageUrl,
                price: a.currentPrice,
                date: a.startTime,
                status: a.status,
                link: `/auctions/${a.id}`
            }))
        }

        const loadFeed = async () => {
            setLoading(true)
            const marketplaceItems = await fetchMarketplaceItems()
            const auctionItems = processAuctions()

            // Combine and sort by date (newest first)
            const combined = [...marketplaceItems, ...auctionItems].sort((a, b) => {
                return new Date(b.date).getTime() - new Date(a.date).getTime()
            })

            setFeedItems(combined)
            setLoading(false)
        }

        loadFeed()
    }, [auctions])

    const filteredItems = feedItems
        .filter(item => filter === 'all' || item.type === filter)
        .slice(0, 10)

    if (loading) {
        return <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
            ))}
        </div>
    }

    return (
        <div className="space-y-4 border dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold dark:text-hf-text flex items-center gap-2">
                    <span className="text-xl">📰</span> Latest Activity
                </h2>
                <div className="relative">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'all' | 'auction' | 'marketplace')}
                        className="appearance-none bg-white dark:bg-hf-card border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-hf-text py-1 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                        <option value="all">All Activity</option>
                        <option value="auction">Auctions</option>
                        <option value="marketplace">Marketplace</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                    </div>
                </div>
            </div>



            <div className="space-y-3">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-hf-muted bg-gray-50 dark:bg-hf-card rounded-lg border dark:border-gray-700">
                        No recent activity
                    </div>
                ) : (
                    filteredItems.map((item) => (
                        <Link
                            key={`${item.type}-${item.id}`}
                            to={item.link}
                            className="block group"
                        >
                            <div className="flex gap-4 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-hf-card hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:shadow-sm">
                                {/* Thumbnail */}
                                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                                    {item.imageUrl ? (
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                            No Image
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-hf-text truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${item.type === 'auction'
                                            ? item.status === 'active'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            }`}>
                                            {item.type === 'auction' ? (item.status === 'active' ? 'Live' : 'Upcoming') : 'Market'}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-500 dark:text-hf-muted truncate mt-0.5">
                                        by {item.artistName}
                                    </p>

                                    <div className="flex items-center gap-3 mt-2 text-xs">
                                        <span className="font-medium text-gray-900 dark:text-gray-300">
                                            {item.type === 'auction' ? 'Bid' : 'Price'}: <span className="text-green-600 dark:text-green-400">${item.price}</span>
                                        </span>
                                        <span className="text-gray-400 dark:text-gray-600">•</span>
                                        <span className="text-gray-500 dark:text-hf-muted">
                                            {new Date(item.date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
