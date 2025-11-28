import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { useAuction, Auction } from '../context/auction'

type TabType = 'active' | 'upcoming' | 'ended' | 'my-bids' | 'watching' | 'my-auctions'

export default function AuctionDashboardPage() {
  const { user } = useAuth()
  const { auctions, userBids, watchedAuctions, loading, refreshAuctions } = useAuction()
  const [activeTab, setActiveTab] = useState<TabType>('active')
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({})

  // Auto-refresh auctions
  useEffect(() => {
    const fetchAuctionsInterval = () => {
      refreshAuctions()
    }

    fetchAuctionsInterval()
    const interval = setInterval(fetchAuctionsInterval, 10000) // Auto-refresh every 10s

    return () => clearInterval(interval)
  }, [])

  // Update countdown timers
  useEffect(() => {
    const updateTimers = () => {
      const now = new Date()
      const times: Record<string, string> = {}

      auctions.forEach((auction) => {
        if (auction.status === 'active') {
          const end = new Date(auction.endTime)
          const diff = end.getTime() - now.getTime()
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            if (days > 0) {
              times[auction.id] = `${days}d ${hours}h ${minutes}m`
            } else if (hours > 0) {
              times[auction.id] = `${hours}h ${minutes}m ${seconds}s`
            } else {
              times[auction.id] = `${minutes}m ${seconds}s`
            }
          } else {
            times[auction.id] = 'Ended'
          }
        } else if (auction.status === 'scheduled') {
          const start = new Date(auction.startTime)
          const diff = start.getTime() - now.getTime()
          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            times[auction.id] = `Starts in ${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m`
          }
        }
      })

      setTimeRemaining(times)
    }

    updateTimers()
    const interval = setInterval(updateTimers, 1000)
    return () => clearInterval(interval)
  }, [auctions])

  const activeAuctions = auctions.filter((a) => a.status === 'active')
  const upcomingAuctions = auctions.filter((a) => a.status === 'scheduled')
  const endedAuctions = auctions.filter((a) => a.status === 'ended')
  const myAuctions = auctions.filter((a) => a.artistId === user?.id)
  const myBidAuctions = auctions.filter((a) => userBids.some((b) => b.auctionId === a.id))

  const getDisplayAuctions = (): Auction[] => {
    switch (activeTab) {
      case 'active':
        return activeAuctions
      case 'upcoming':
        return upcomingAuctions
      case 'ended':
        return endedAuctions
      case 'my-bids':
        return myBidAuctions
      case 'watching':
        return watchedAuctions
      case 'my-auctions':
        return myAuctions
      default:
        return activeAuctions
    }
  }

  const getUserBidStatus = (auction: Auction) => {
    const myBidsOnAuction = userBids.filter((b) => b.auctionId === auction.id)
    if (myBidsOnAuction.length === 0) return null

    const highestBid = Math.max(...myBidsOnAuction.map((b) => b.amount))
    const isWinning = auction.winnerId === user?.id

    return {
      highestBid,
      isWinning,
      bidCount: myBidsOnAuction.length,
    }
  }

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'active', label: 'Live Auctions', count: activeAuctions.length },
    { key: 'upcoming', label: 'Upcoming', count: upcomingAuctions.length },
    { key: 'ended', label: 'Ended', count: endedAuctions.length },
  ]

  if (user) {
    tabs.push(
      { key: 'my-bids', label: 'My Bids', count: myBidAuctions.length },
      { key: 'watching', label: 'Watching', count: watchedAuctions.length }
    )
    if (user.role === 'artist') {
      tabs.push({ key: 'my-auctions', label: 'My Auctions', count: myAuctions.length })
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 dark:bg-hf-bg min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-hf-text">Auction Dashboard</h1>
          <p className="text-gray-600 dark:text-hf-muted mt-1">Discover and bid on exclusive artworks</p>
        </div>
        {user?.role === 'artist' && (
          <Link
            to="/auctions/create"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Auction
          </Link>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Live Auctions</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">{activeAuctions.length}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Upcoming</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{upcomingAuctions.length}</p>
        </div>
        {user && (
          <>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400">Your Active Bids</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {userBids.filter((b) => activeAuctions.some((a) => a.id === b.auctionId)).length}
              </p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Watching</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{watchedAuctions.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b dark:border-gray-700 mb-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Auction Grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-hf-muted">Loading auctions...</div>
      ) : getDisplayAuctions().length === 0 ? (
        <div className="text-center py-12 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
          <p className="text-gray-600 dark:text-hf-muted">No auctions found in this category.</p>
          {activeTab === 'my-auctions' && user?.role === 'artist' && (
            <Link
              to="/auctions/create"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Your First Auction
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getDisplayAuctions().map((auction) => {
            const bidStatus = getUserBidStatus(auction)
            return (
              <Link
                key={auction.id}
                to={`/auctions/${auction.id}`}
                className="border dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-hf-card"
              >
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative">
                  {auction.imageUrl ? (
                    <img
                      src={auction.imageUrl}
                      alt={auction.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                  {/* Status Badge */}
                  <div
                    className={`absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded ${auction.status === 'active'
                        ? 'bg-green-500 text-white'
                        : auction.status === 'scheduled'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-500 text-white'
                      }`}
                  >
                    {auction.status === 'active'
                      ? 'LIVE'
                      : auction.status === 'scheduled'
                        ? 'UPCOMING'
                        : 'ENDED'}
                  </div>
                  {/* Bid Status */}
                  {bidStatus && (
                    <div
                      className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded ${bidStatus.isWinning ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                        }`}
                    >
                      {bidStatus.isWinning ? 'Winning' : 'Outbid'}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-lg truncate dark:text-hf-text">{auction.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-hf-muted">by {auction.artistName}</p>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-hf-muted">Current Bid</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-400">${auction.currentPrice}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-hf-muted">{auction.totalBids} bids</p>
                      {timeRemaining[auction.id] && (
                        <p
                          className={`text-sm font-medium ${auction.status === 'active' ? 'text-red-600' : 'text-blue-600'
                            }`}
                        >
                          {timeRemaining[auction.id]}
                        </p>
                      )}
                    </div>
                  </div>

                  {bidStatus && (
                    <div className="mt-3 pt-3 border-t text-sm">
                      <span className="text-gray-600 dark:text-hf-muted">Your highest bid: </span>
                      <span className="font-medium dark:text-hf-text">${bidStatus.highestBid}</span>
                      <span className="text-gray-500 dark:text-hf-muted ml-2">({bidStatus.bidCount} bids)</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
