import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'
import { useAuction, Auction, Bid } from '../context/auction'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { placeBid, withdrawBid, watchAuction, unwatchAuction, getAuctionBids, cancelAuction } = useAuction()

  const [auction, setAuction] = useState<Auction | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)
  const [error, setError] = useState('')
  const [timeRemaining, setTimeRemaining] = useState('')
  const [isWatching, setIsWatching] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)

  // Real-time auction listener
  useEffect(() => {
    if (!id) return

    const unsubscribe = onSnapshot(doc(db, 'auctions', id), (doc) => {
      if (doc.exists()) {
        const auctionData = { id: doc.id, ...doc.data() } as Auction
        setAuction(auctionData)
        setIsWatching(user?.id ? auctionData.watchers?.includes(user.id) : false)

        // Always update suggested bid amount to current price + increment
        setBidAmount(String(auctionData.currentPrice + auctionData.minBidIncrement))
      } else {
        setAuction(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [id, user?.id])

  // Fetch bids
  const fetchBids = useCallback(async () => {
    if (!id) return
    const bidList = await getAuctionBids(id)
    setBids(bidList)
  }, [id, getAuctionBids])

  useEffect(() => {
    fetchBids()
  }, [fetchBids, auction?.totalBids])

  // Countdown timer
  useEffect(() => {
    if (!auction) return

    const updateTimer = () => {
      const now = new Date()
      const targetTime =
        auction.status === 'scheduled'
          ? new Date(auction.startTime)
          : new Date(auction.endTime)
      const diff = targetTime.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeRemaining(auction.status === 'scheduled' ? 'Starting...' : 'Ended')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`)
      } else {
        setTimeRemaining(`${seconds}s`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [auction])

  const handleBid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auction || !user) return

    setError('')
    setBidding(true)

    try {
      const amount = parseFloat(bidAmount)
      if (isNaN(amount)) throw new Error('Invalid bid amount')

      await placeBid(auction.id, amount)
      setBidAmount(String(amount + auction.minBidIncrement))
      fetchBids()
    } catch (err: any) {
      setError(err.message || 'Failed to place bid')
    } finally {
      setBidding(false)
    }
  }

  const handleWatch = async () => {
    if (!auction || !user) return
    try {
      if (isWatching) {
        await unwatchAuction(auction.id)
        setIsWatching(false)
      } else {
        await watchAuction(auction.id)
        setIsWatching(true)
      }
    } catch (err) {
      console.error('Error updating watch status:', err)
    }
  }

  const quickBid = (multiplier: number) => {
    if (!auction) return
    const amount = auction.currentPrice + auction.minBidIncrement * multiplier
    setBidAmount(String(amount))
  }

  const handleCancelAuction = async () => {
    if (!auction) return
    setCancelling(true)
    try {
      await cancelAuction(auction.id)
      setShowCancelConfirm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to cancel auction')
    } finally {
      setCancelling(false)
    }
  }

  const handleWithdrawBid = async () => {
    if (!auction) return
    setWithdrawing(true)
    setError('')
    try {
      await withdrawBid(auction.id)
      setShowWithdrawConfirm(false)
      fetchBids()
    } catch (err: any) {
      setError(err.message || 'Failed to withdraw bid')
    } finally {
      setWithdrawing(false)
    }
  }

  const handleReport = () => {
    if (!auction) return
    navigate(`/support?reportType=auction&reportId=${auction.id}&reportTitle=${encodeURIComponent(auction.title)}`)
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12 text-gray-500 dark:text-hf-muted">Loading auction...</div>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-hf-muted">Auction not found</p>
          <Link to="/auctions" className="text-blue-600 hover:underline mt-2 inline-block">
            Back to Auctions
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = user?.id === auction.artistId
  const canBid = user && !isOwner && auction.status === 'active'
  const isWinning = user && user.id === auction.winnerId

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/auctions" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Auctions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
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
          </div>

          {/* Price History Chart */}
          <div className="mt-6 border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold dark:text-hf-text mb-3">Price History</h3>
            {auction.priceHistory && auction.priceHistory.length > 1 ? (
              <div className="relative h-40">
                <PriceChart priceHistory={auction.priceHistory} />
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-hf-muted">No bid history yet</p>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${auction.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : auction.status === 'scheduled'
                    ? 'bg-blue-100 text-blue-700'
                    : auction.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
              >
                {auction.status === 'active'
                  ? 'LIVE AUCTION'
                  : auction.status === 'scheduled'
                    ? 'UPCOMING'
                    : auction.status === 'cancelled'
                      ? 'CANCELLED'
                      : 'ENDED'}
              </span>
              <h1 className="text-3xl font-bold dark:text-hf-text">{auction.title}</h1>
              <Link
                to={`/artist/${auction.artistId}`}
                className="text-blue-600 hover:underline mt-1 inline-block"
              >
                by {auction.artistName}
              </Link>
            </div>
            {user && !isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={handleWatch}
                  className={`px-3 py-2 rounded border ${isWatching
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-hf-card dark:border-gray-700 dark:text-hf-text dark:hover:bg-gray-800'
                    }`}
                >
                  {isWatching ? '★ Watching' : '☆ Watch'}
                </button>
                {(user.role === 'admin' || user.role === 'csr') ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-3 py-2 rounded border bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
                  >
                    Pull Auction
                  </button>
                ) : (
                  <button
                    onClick={handleReport}
                    className="px-3 py-2 rounded border bg-gray-50 dark:bg-hf-card hover:bg-red-50 text-gray-600 dark:text-hf-text hover:text-red-600 border dark:border-gray-700"
                  >
                    Report
                  </button>
                )}
              </div>
            )}
          </div>

          {auction.description && (
            <p className="text-gray-600 dark:text-hf-muted mt-4">{auction.description}</p>
          )}

          {/* Timer */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-hf-card rounded-lg">
            <p className="text-sm text-gray-600 dark:text-hf-muted">
              {auction.status === 'scheduled' ? 'Starts in' : 'Time Remaining'}
            </p>
            <p
              className={`text-2xl font-bold ${auction.status === 'active' ? 'text-red-600' : 'text-blue-600'
                }`}
            >
              {timeRemaining}
            </p>
          </div>

          {/* Current Price */}
          <div className="mt-6 p-4 border dark:border-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-hf-muted">Current Bid</p>
                <p className="text-3xl font-bold text-green-700">${auction.currentPrice}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-hf-muted">{auction.totalBids} bids</p>
                {auction.winnerId && (
                  <p className="text-sm">
                    Leading: <span className="font-medium">{auction.winnerName}</span>
                  </p>
                )}
              </div>
            </div>

            {auction.reservePrice && auction.currentPrice < auction.reservePrice && (
              <p className="mt-2 text-sm text-orange-600">Reserve not met</p>
            )}

            {isWinning && auction.status === 'active' && (
              <div className="mt-3 p-3 bg-green-100 rounded">
                <p className="text-green-700 text-sm font-medium">You're winning this auction!</p>
                {!showWithdrawConfirm ? (
                  <button
                    onClick={() => setShowWithdrawConfirm(true)}
                    className="mt-2 text-xs text-red-600 hover:underline"
                  >
                    Withdraw my bid
                  </button>
                ) : (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="text-red-700 text-xs mb-2">
                      Are you sure? Your bid will be removed and the next highest bidder will take the lead.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleWithdrawBid}
                        disabled={withdrawing}
                        className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        {withdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                      </button>
                      <button
                        onClick={() => setShowWithdrawConfirm(false)}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 dark:text-hf-text rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {auction.status === 'ended' && auction.winnerId === user?.id && (
              <div className="mt-3 p-2 bg-green-100 text-green-700 rounded text-sm font-medium">
                Congratulations! You won this auction!
              </div>
            )}

            {auction.status === 'ended' && !auction.winnerId && auction.totalBids > 0 && (
              <div className="mt-3 p-2 bg-orange-100 text-orange-700 rounded text-sm font-medium">
                Auction ended - Reserve price was not met
              </div>
            )}

            {auction.status === 'ended' && auction.totalBids === 0 && (
              <div className="mt-3 p-2 bg-gray-100 text-gray-700 dark:text-hf-text rounded text-sm font-medium">
                Auction ended with no bids
              </div>
            )}
          </div>

          {/* Bidding Form */}
          {canBid && (() => {
            const availableBalance = (user.balance || 0) - (user.heldAmount || 0)
            return (
              <form onSubmit={handleBid} className="mt-6 p-4 border dark:border-gray-700 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold dark:text-hf-text">Place Your Bid</h3>
                  <div className="text-sm text-right">
                    <div className="text-gray-600 dark:text-hf-muted">
                      Available: <span className="font-medium text-green-600">${availableBalance.toFixed(2)}</span>
                    </div>
                    {(user.heldAmount || 0) > 0 && (
                      <div className="text-xs text-orange-600">
                        (${(user.heldAmount || 0).toFixed(2)} held in bids)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => quickBid(1)}
                    disabled={auction.currentPrice + auction.minBidIncrement > availableBalance}
                    className="px-3 py-1 text-sm border dark:border-gray-700 rounded hover:bg-white dark:bg-hf-card dark:text-hf-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +${auction.minBidIncrement}
                  </button>
                  <button
                    type="button"
                    onClick={() => quickBid(2)}
                    disabled={auction.currentPrice + auction.minBidIncrement * 2 > availableBalance}
                    className="px-3 py-1 text-sm border dark:border-gray-700 rounded hover:bg-white dark:bg-hf-card dark:text-hf-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +${auction.minBidIncrement * 2}
                  </button>
                  <button
                    type="button"
                    onClick={() => quickBid(5)}
                    disabled={auction.currentPrice + auction.minBidIncrement * 5 > availableBalance}
                    className="px-3 py-1 text-sm border dark:border-gray-700 rounded hover:bg-white dark:bg-hf-card dark:text-hf-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +${auction.minBidIncrement * 5}
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-hf-muted">$</span>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min={auction.currentPrice + auction.minBidIncrement}
                      max={availableBalance}
                      step={auction.minBidIncrement}
                      className="w-full pl-7 pr-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-hf-text"
                      disabled={bidding}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={bidding || parseFloat(bidAmount) > availableBalance}
                    className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {bidding ? 'Placing...' : 'Place Bid'}
                  </button>
                </div>

                <p className="text-xs text-gray-600 dark:text-hf-muted mt-2">
                  Minimum bid: ${auction.currentPrice + auction.minBidIncrement} (increment: $
                  {auction.minBidIncrement}) | Max bid: ${availableBalance.toFixed(2)}
                </p>

                {parseFloat(bidAmount) > availableBalance && (
                  <p className="text-orange-600 text-sm mt-2">
                    Bid exceeds your available balance. <Link to="/wallet" className="underline">Add funds</Link>
                  </p>
                )}

                {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
              </form>
            )
          })()}

          {!user && auction.status === 'active' && (
            <div className="mt-6 p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card text-center">
              <p className="text-gray-600 dark:text-hf-muted">
                <Link to="/login" className="text-blue-600 hover:underline">
                  Sign in
                </Link>{' '}
                to place a bid
              </p>
            </div>
          )}

          {isOwner && (
            <div className="mt-6 p-4 border dark:border-gray-700 rounded-lg bg-yellow-50 dark:bg-yellow-900/10">
              <p className="text-yellow-700 text-sm">
                This is your auction. You cannot bid on your own items.
              </p>
            </div>
          )}

          {(isOwner || user?.role === 'admin' || user?.role === 'csr') && (auction.status === 'active' || auction.status === 'scheduled') && (
            <div className={`mt-6 p-4 border rounded-lg ${isOwner ? 'bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30' : 'bg-red-50 dark:bg-red-900/10 dark:border-red-900/30'}`}>
              {!isOwner && (
                <p className="text-red-700 text-sm mb-3 font-medium">
                  Admin Control: You can cancel this auction.
                </p>
              )}

              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Pull Auction
                </button>
              ) : (
                <div className="p-3 bg-red-100 rounded">
                  <p className="text-red-700 text-sm font-medium mb-2">
                    Are you sure you want to cancel this auction?
                    {auction.totalBids > 0 && ' All bidders will be notified.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelAuction}
                      disabled={cancelling}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                      {cancelling ? 'Cancelling...' : 'Yes, Cancel Auction'}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300"
                    >
                      No, Keep It
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {auction.status === 'cancelled' && (
            <div className="mt-6 p-4 border border-red-200 dark:border-red-900/30 rounded-lg bg-red-50 dark:bg-red-900/10">
              <p className="text-red-700 font-medium">This auction has been cancelled</p>
              <p className="text-red-600 text-sm mt-1">
                The artist pulled this auction. No transactions will be processed.
              </p>
            </div>
          )}

          {/* Auction Details */}
          <div className="mt-6 border dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold dark:text-hf-text mb-3">Auction Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-600 dark:text-hf-muted">Starting Price</dt>
                <dd className="font-medium">${auction.startingPrice}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-hf-muted">Min Increment</dt>
                <dd className="font-medium">${auction.minBidIncrement}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-hf-muted">Start Time</dt>
                <dd className="font-medium">{new Date(auction.startTime).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-600 dark:text-hf-muted">End Time</dt>
                <dd className="font-medium">{new Date(auction.endTime).toLocaleString()}</dd>
              </div>
              {auction.reservePrice && (
                <div>
                  <dt className="text-gray-600 dark:text-hf-muted">Reserve Price</dt>
                  <dd className="font-medium">
                    {auction.currentPrice >= auction.reservePrice ? 'Met' : 'Not met'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-gray-600 dark:text-hf-muted">Watchers</dt>
                <dd className="font-medium">{auction.watchers?.length || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Bid History */}
      <div className="mt-8 border dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold dark:text-hf-text text-lg mb-4">Bid History ({bids.length})</h3>
        {bids.length === 0 ? (
          <p className="text-gray-500 dark:text-hf-muted">No bids yet. Be the first to bid!</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {bids.map((bid, idx) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between p-3 rounded ${idx === 0 ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 dark:bg-hf-card'
                  }`}
              >
                <div className="flex items-center gap-3">
                  {idx === 0 && (
                    <span className="text-green-600 text-sm font-medium">Leading</span>
                  )}
                  <span className="font-medium">{bid.bidderName}</span>
                  {bid.bidderId === user?.id && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">${bid.amount}</p>
                  <p className="text-xs text-gray-500 dark:text-hf-muted">
                    {new Date(bid.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced Price Chart Component
function PriceChart({ priceHistory }: { priceHistory: { price: number; timestamp: string }[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  if (priceHistory.length < 2) return null

  const prices = priceHistory.map((p) => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice || 1

  // Chart dimensions
  const chartWidth = 300
  const chartHeight = 120
  const paddingX = 20
  const paddingY = 15
  const innerWidth = chartWidth - paddingX * 2
  const innerHeight = chartHeight - paddingY * 2

  // Calculate points
  const getX = (index: number) => {
    if (priceHistory.length === 1) return paddingX + innerWidth / 2
    return paddingX + (index / (priceHistory.length - 1)) * innerWidth
  }

  const getY = (price: number) => {
    if (range === 0) return paddingY + innerHeight / 2
    return paddingY + innerHeight - ((price - minPrice) / range) * innerHeight
  }

  const points = priceHistory.map((p, i) => `${getX(i)},${getY(p.price)}`).join(' ')

  // Create gradient area path
  const areaPath = `M ${getX(0)},${chartHeight - paddingY} L ${points} L ${getX(priceHistory.length - 1)},${chartHeight - paddingY} Z`

  // Format time for tooltip
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate percentage increase
  const priceIncrease = ((maxPrice - minPrice) / minPrice * 100).toFixed(1)

  return (
    <div className="relative w-full">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-green-600 font-semibold">${maxPrice}</span>
          <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
            +{priceIncrease}%
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-hf-muted">{priceHistory.length} bids</span>
      </div>

      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: '120px' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Gradient for area fill */}
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>
          {/* Gradient for line */}
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y = paddingY + innerHeight * (1 - ratio)
          return (
            <line
              key={ratio}
              x1={paddingX}
              y1={y}
              x2={chartWidth - paddingX}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          )
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Main price line */}
        <polyline
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Interactive data points */}
        {priceHistory.map((p, i) => {
          const x = getX(i)
          const y = getY(p.price)
          const isHovered = hoveredPoint === i
          const isLast = i === priceHistory.length - 1

          return (
            <g key={i}>
              {/* Hover area */}
              <circle
                cx={x}
                cy={y}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHoveredPoint(i)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ cursor: 'pointer' }}
              />
              {/* Visible point */}
              <circle
                cx={x}
                cy={y}
                r={isHovered || isLast ? 5 : 3}
                fill={isLast ? '#059669' : '#10b981'}
                stroke="white"
                strokeWidth="2"
              />
              {/* Pulse effect on latest */}
              {isLast && (
                <circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  opacity="0.5"
                >
                  <animate
                    attributeName="r"
                    from="5"
                    to="15"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.6"
                    to="0"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          )
        })}

        {/* Y-axis labels */}
        <text x={paddingX - 5} y={paddingY + 4} fontSize="10" fill="#9ca3af" textAnchor="end">
          ${maxPrice}
        </text>
        <text x={paddingX - 5} y={chartHeight - paddingY + 4} fontSize="10" fill="#9ca3af" textAnchor="end">
          ${minPrice}
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg z-10"
          style={{
            left: `${((getX(hoveredPoint) / chartWidth) * 100)}%`,
            top: '30px',
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-bold text-sm">${priceHistory[hoveredPoint].price}</div>
          <div className="text-gray-300 text-xs">{formatTime(priceHistory[hoveredPoint].timestamp)}</div>
          {hoveredPoint > 0 && (
            <div className="text-green-400 text-xs mt-1">
              +${priceHistory[hoveredPoint].price - priceHistory[hoveredPoint - 1].price}
            </div>
          )}
        </div>
      )}

      {/* Bottom labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-2">
        <span>{formatTime(priceHistory[0].timestamp)}</span>
        <span>{formatTime(priceHistory[priceHistory.length - 1].timestamp)}</span>
      </div>
    </div>
  )
}
