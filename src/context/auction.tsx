import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './auth'

export type Auction = {
  id: string
  artworkId: string
  title: string
  description: string
  imageUrl: string
  artistId: string
  artistName: string
  startingPrice: number
  currentPrice: number
  reservePrice?: number
  minBidIncrement: number
  startTime: string
  endTime: string
  status: 'scheduled' | 'active' | 'ended' | 'cancelled'
  winnerId?: string
  winnerName?: string
  totalBids: number
  watchers: string[]
  priceHistory: PricePoint[]
}

export type Bid = {
  id: string
  auctionId: string
  bidderId: string
  bidderName: string
  amount: number
  timestamp: string
  isAutoBid: boolean
}

export type PricePoint = {
  price: number
  timestamp: string
}

export type AuctionNotification = {
  id: string
  userId: string
  auctionId: string
  type: 'outbid' | 'auction_ending' | 'auction_won' | 'auction_lost' | 'new_bid' | 'auction_started'
  title: string
  message: string
  read: boolean
  createdAt: string
}

type AuctionContextType = {
  auctions: Auction[]
  activeAuctions: Auction[]
  userBids: Bid[]
  watchedAuctions: Auction[]
  loading: boolean
  placeBid: (auctionId: string, amount: number) => Promise<void>
  withdrawBid: (auctionId: string) => Promise<void>
  watchAuction: (auctionId: string) => Promise<void>
  unwatchAuction: (auctionId: string) => Promise<void>
  createAuction: (auctionData: Omit<Auction, 'id' | 'currentPrice' | 'status' | 'totalBids' | 'watchers' | 'priceHistory'>) => Promise<string>
  cancelAuction: (auctionId: string) => Promise<void>
  getAuction: (auctionId: string) => Promise<Auction | null>
  getAuctionBids: (auctionId: string) => Promise<Bid[]>
  refreshAuctions: () => Promise<void>
}

const AuctionContext = createContext<AuctionContextType | null>(null)

export const AuctionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const [auctions, setAuctions] = useState<Auction[]>([])
  const [userBids, setUserBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAuctions = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'auctions'))
      const auctionList: Auction[] = []
      snapshot.forEach((doc) => {
        auctionList.push({ id: doc.id, ...doc.data() } as Auction)
      })
      setAuctions(auctionList)
    } catch (err) {
      console.error('Error fetching auctions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check and update auction statuses based on time
  const updateAuctionStatuses = useCallback(async () => {
    const now = new Date()

    for (const auction of auctions) {
      const startTime = new Date(auction.startTime)
      const endTime = new Date(auction.endTime)

      let newStatus: Auction['status'] | null = null

      if (auction.status === 'scheduled' && startTime <= now) {
        newStatus = 'active'
      } else if (auction.status === 'active' && endTime <= now) {
        newStatus = 'ended'
      }

      if (newStatus) {
        try {
          await updateDoc(doc(db, 'auctions', auction.id), { status: newStatus })

          // Send notifications when auction ends
          if (newStatus === 'ended') {
            // Check if reserve price was met
            const reserveMet = !auction.reservePrice || auction.currentPrice >= auction.reservePrice
            const hasValidWinner = auction.winnerId && reserveMet

            if (hasValidWinner && auction.winnerId) {
              const winnerId = auction.winnerId
              // Calculate commission (15%)
              const salePrice = auction.currentPrice
              const commission = salePrice * 0.15
              const artistEarnings = salePrice - commission

              // Deduct from winner's balance and release held amount
              const winnerDoc = await getDoc(doc(db, 'users', winnerId))
              if (winnerDoc.exists()) {
                const winnerBalance = winnerDoc.data().balance || 0
                const winnerHeldAmount = winnerDoc.data().heldAmount || 0
                const purchasedArtwork = winnerDoc.data().purchasedArtwork || []

                // Add purchased artwork to winner's profile
                purchasedArtwork.push({
                  auctionId: auction.id,
                  artworkId: auction.artworkId,
                  title: auction.title,
                  imageUrl: auction.imageUrl,
                  artistId: auction.artistId,
                  artistName: auction.artistName,
                  price: salePrice,
                  purchasedAt: new Date().toISOString(),
                })

                await updateDoc(doc(db, 'users', winnerId), {
                  balance: winnerBalance - salePrice,
                  heldAmount: Math.max(0, winnerHeldAmount - salePrice), // Release the held amount
                  purchasedArtwork: purchasedArtwork,
                })

                // Record buyer transaction
                await addDoc(collection(db, 'transactions'), {
                  userId: auction.winnerId,
                  type: 'purchase',
                  amount: -salePrice,
                  description: `Won auction: "${auction.title}"`,
                  auctionId: auction.id,
                  createdAt: new Date().toISOString(),
                })
              }

              // Add to artist's balance (minus commission)
              const artistDoc = await getDoc(doc(db, 'users', auction.artistId))
              if (artistDoc.exists()) {
                const artistBalance = artistDoc.data().balance || 0
                const saleHistory = artistDoc.data().saleHistory || []

                // Add to artist's sale history
                saleHistory.push({
                  auctionId: auction.id,
                  artworkId: auction.artworkId,
                  title: auction.title,
                  imageUrl: auction.imageUrl,
                  buyerId: auction.winnerId,
                  buyerName: auction.winnerName,
                  salePrice: salePrice,
                  earnings: artistEarnings,
                  commission: commission,
                  soldAt: new Date().toISOString(),
                })

                await updateDoc(doc(db, 'users', auction.artistId), {
                  balance: artistBalance + artistEarnings,
                  saleHistory: saleHistory,
                })

                // Record artist transaction
                await addDoc(collection(db, 'transactions'), {
                  userId: auction.artistId,
                  type: 'auction_sale',
                  amount: artistEarnings,
                  description: `Auction sold: "${auction.title}" (after 15% commission)`,
                  auctionId: auction.id,
                  commission: commission,
                  createdAt: new Date().toISOString(),
                })
              }

              // Notify winner only if reserve was met
              await addDoc(collection(db, 'notifications'), {
                userId: auction.winnerId,
                auctionId: auction.id,
                type: 'auction_won',
                title: 'Congratulations! You won the auction!',
                message: `You won "${auction.title}" with a bid of $${salePrice}. Your account has been charged.`,
                read: false,
                createdAt: new Date().toISOString(),
              })

              // Add to artist's auction history
              const artistDoc2 = await getDoc(doc(db, 'users', auction.artistId))
              if (artistDoc2.exists()) {
                const auctionHistory = artistDoc2.data().auctionHistory || []
                auctionHistory.push({
                  auctionId: auction.id,
                  artworkId: auction.artworkId,
                  title: auction.title,
                  imageUrl: auction.imageUrl,
                  startingPrice: auction.startingPrice,
                  finalPrice: salePrice,
                  winnerId: auction.winnerId,
                  winnerName: auction.winnerName,
                  status: 'sold',
                  endedAt: new Date().toISOString(),
                })
                await updateDoc(doc(db, 'users', auction.artistId), {
                  auctionHistory: auctionHistory,
                })
              }

              // Notify artist of successful sale
              await addDoc(collection(db, 'notifications'), {
                userId: auction.artistId,
                auctionId: auction.id,
                type: 'auction_ended',
                title: 'Your auction has ended',
                message: `"${auction.title}" sold for $${salePrice} to ${auction.winnerName}. You earned $${artistEarnings.toFixed(2)} (after 15% commission).`,
                read: false,
                createdAt: new Date().toISOString(),
              })
            } else {
              // Reserve not met - release held amount and notify highest bidder they didn't win
              if (auction.winnerId) {
                // Release the held amount since auction failed
                const bidderDoc = await getDoc(doc(db, 'users', auction.winnerId))
                if (bidderDoc.exists()) {
                  const bidderHeldAmount = bidderDoc.data().heldAmount || 0
                  await updateDoc(doc(db, 'users', auction.winnerId), {
                    heldAmount: Math.max(0, bidderHeldAmount - auction.currentPrice),
                  })
                }

                await addDoc(collection(db, 'notifications'), {
                  userId: auction.winnerId,
                  auctionId: auction.id,
                  type: 'auction_lost',
                  title: 'Auction ended - Reserve not met',
                  message: `The auction "${auction.title}" ended but the reserve price was not met. Your bid of $${auction.currentPrice} was not accepted and your funds have been released.`,
                  read: false,
                  createdAt: new Date().toISOString(),
                })
              }

              // Add to artist's auction history for failed auction
              const artistDoc3 = await getDoc(doc(db, 'users', auction.artistId))
              if (artistDoc3.exists()) {
                const auctionHistory = artistDoc3.data().auctionHistory || []
                auctionHistory.push({
                  auctionId: auction.id,
                  artworkId: auction.artworkId,
                  title: auction.title,
                  imageUrl: auction.imageUrl,
                  startingPrice: auction.startingPrice,
                  finalPrice: auction.currentPrice,
                  highestBidderId: auction.winnerId || null,
                  highestBidderName: auction.winnerName || null,
                  status: auction.winnerId ? 'reserve_not_met' : 'no_bids',
                  endedAt: new Date().toISOString(),
                })
                await updateDoc(doc(db, 'users', auction.artistId), {
                  auctionHistory: auctionHistory,
                })
              }

              // Notify artist that reserve wasn't met
              await addDoc(collection(db, 'notifications'), {
                userId: auction.artistId,
                auctionId: auction.id,
                type: 'auction_ended',
                title: 'Your auction has ended',
                message: auction.winnerId
                  ? `"${auction.title}" ended but reserve price was not met. Highest bid was $${auction.currentPrice}.`
                  : `"${auction.title}" ended with no bids.`,
                read: false,
                createdAt: new Date().toISOString(),
              })

              // Clear the winner since reserve wasn't met
              await updateDoc(doc(db, 'auctions', auction.id), {
                winnerId: null,
                winnerName: null,
                reserveMet: false,
              })
            }
          }
        } catch (err) {
          console.error('Error updating auction status:', err)
        }
      }
    }
  }, [auctions])

  useEffect(() => {
    fetchAuctions()

    // Real-time listener for all auctions (active, scheduled, and ended)
    const q = query(collection(db, 'auctions'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAuctions((prev) => {
        const updated = [...prev]
        snapshot.docChanges().forEach((change) => {
          const auctionData = { id: change.doc.id, ...change.doc.data() } as Auction
          const idx = updated.findIndex((a) => a.id === auctionData.id)
          if (change.type === 'added' && idx === -1) {
            updated.push(auctionData)
          } else if (change.type === 'modified' && idx !== -1) {
            updated[idx] = auctionData
          } else if (change.type === 'removed' && idx !== -1) {
            updated.splice(idx, 1)
          }
        })
        return updated
      })
    })

    return () => unsubscribe()
  }, [fetchAuctions])

  // Periodically check and update auction statuses
  useEffect(() => {
    updateAuctionStatuses()
    const interval = setInterval(updateAuctionStatuses, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [updateAuctionStatuses])

  useEffect(() => {
    if (!user?.id) {
      setUserBids([])
      return
    }

    const fetchUserBids = async () => {
      try {
        const q = query(collection(db, 'bids'), where('bidderId', '==', user.id))
        const snapshot = await getDocs(q)
        const bids: Bid[] = []
        snapshot.forEach((doc) => {
          bids.push({ id: doc.id, ...doc.data() } as Bid)
        })
        setUserBids(bids)
      } catch (err) {
        console.error('Error fetching user bids:', err)
      }
    }
    fetchUserBids()
  }, [user?.id])

  const activeAuctions = auctions.filter((a) => a.status === 'active')

  const watchedAuctions = auctions.filter((a) => user?.id && a.watchers?.includes(user.id))

  const placeBid = async (auctionId: string, amount: number) => {
    if (!user?.id) throw new Error('Must be logged in to bid')

    const auctionRef = doc(db, 'auctions', auctionId)
    const auctionDoc = await getDoc(auctionRef)

    if (!auctionDoc.exists()) throw new Error('Auction not found')

    const auction = { id: auctionDoc.id, ...auctionDoc.data() } as Auction

    if (auction.status !== 'active') throw new Error('Auction is not active')
    if (new Date(auction.endTime) < new Date()) throw new Error('Auction has ended')
    if (amount <= auction.currentPrice) throw new Error('Bid must be higher than current price')
    if (amount < auction.currentPrice + auction.minBidIncrement) {
      throw new Error(`Minimum bid increment is $${auction.minBidIncrement}`)
    }

    // Check user's available balance (balance minus held amount)
    const userDocSnap = await getDoc(doc(db, 'users', user.id))
    const userBalance = userDocSnap.exists() ? (userDocSnap.data().balance || 0) : 0
    const userHeldAmount = userDocSnap.exists() ? (userDocSnap.data().heldAmount || 0) : 0
    const availableBalance = userBalance - userHeldAmount

    if (amount > availableBalance) {
      throw new Error(`Insufficient available balance. You have $${availableBalance.toFixed(2)} available but trying to bid $${amount}. Please add funds to your wallet.`)
    }

    const previousHighBidderId = auction.winnerId
    const previousHighBidAmount = auction.currentPrice

    // Create bid record
    const bidData: Omit<Bid, 'id'> = {
      auctionId,
      bidderId: user.id,
      bidderName: user.name,
      amount,
      timestamp: new Date().toISOString(),
      isAutoBid: false,
    }

    await addDoc(collection(db, 'bids'), bidData)

    // calculate how much money should be added to the held amount, it should be new bid minus previous bid if user is already highest bidder
    const additionalHoldAmount = previousHighBidderId === user.id ? (amount - previousHighBidAmount) : amount

    // Hold the new bidder's amount
    await updateDoc(doc(db, 'users', user.id), {
      heldAmount: userHeldAmount + additionalHoldAmount,
    })

    // Release the previous bidder's held amount if they exist and are different from current bidder
    if (previousHighBidderId && previousHighBidderId !== user.id) {
      const prevBidderDoc = await getDoc(doc(db, 'users', previousHighBidderId))
      if (prevBidderDoc.exists()) {
        const prevHeldAmount = prevBidderDoc.data().heldAmount || 0
        // Release the previous bid amount
        await updateDoc(doc(db, 'users', previousHighBidderId), {
          heldAmount: Math.max(0, prevHeldAmount - previousHighBidAmount),
        })
      }
    }

    // Update auction
    const newPriceHistory = [
      ...(auction.priceHistory || []),
      { price: amount, timestamp: new Date().toISOString() },
    ]

    await updateDoc(auctionRef, {
      currentPrice: amount,
      winnerId: user.id,
      winnerName: user.name,
      totalBids: (auction.totalBids || 0) + 1,
      priceHistory: newPriceHistory,
    })

    // Notify previous high bidder they've been outbid
    if (previousHighBidderId && previousHighBidderId !== user.id) {
      await addDoc(collection(db, 'notifications'), {
        userId: previousHighBidderId,
        auctionId,
        type: 'outbid',
        title: 'You\'ve been outbid!',
        message: `Someone placed a higher bid of $${amount} on "${auction.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    // Notify artist of new bid
    await addDoc(collection(db, 'notifications'), {
      userId: auction.artistId,
      auctionId,
      type: 'new_bid',
      title: 'New bid on your auction!',
      message: `${user.name} placed a bid of $${amount} on "${auction.title}"`,
      read: false,
      createdAt: new Date().toISOString(),
    })

    // Notify watchers
    const watchersToNotify = (auction.watchers || []).filter(
      (w) => w !== user.id && w !== previousHighBidderId && w !== auction.artistId
    )
    for (const watcherId of watchersToNotify) {
      await addDoc(collection(db, 'notifications'), {
        userId: watcherId,
        auctionId,
        type: 'new_bid',
        title: 'New bid on watched auction',
        message: `New bid of $${amount} on "${auction.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    // Refresh user bids
    setUserBids((prev) => [...prev, { ...bidData, id: 'temp-' + Date.now() }])
  }

  const withdrawBid = async (auctionId: string) => {
    if (!user?.id) throw new Error('Must be logged in to withdraw bid')

    const auctionRef = doc(db, 'auctions', auctionId)
    const auctionDoc = await getDoc(auctionRef)

    if (!auctionDoc.exists()) throw new Error('Auction not found')

    const auction = { id: auctionDoc.id, ...auctionDoc.data() } as Auction

    if (auction.status !== 'active') throw new Error('Auction is not active')
    if (auction.winnerId !== user.id) throw new Error('You are not the current highest bidder')

    // Get all bids for this auction sorted by amount descending
    const bidsQuery = query(collection(db, 'bids'), where('auctionId', '==', auctionId))
    const bidsSnapshot = await getDocs(bidsQuery)
    const allBids: Bid[] = []
    bidsSnapshot.forEach((doc) => {
      allBids.push({ id: doc.id, ...doc.data() } as Bid)
    })
    allBids.sort((a, b) => b.amount - a.amount)

    // Find current user's highest bid (should be the top one)
    const userBid = allBids.find(b => b.bidderId === user.id)
    if (!userBid) throw new Error('No bid found to withdraw')

    // Release user's held amount
    // withdraw the full amount of their current highest bid, if the user has another below the highest bid, that amount will be held
    // edge case, the second highest bid is held from another user, but the bid below that is held by the user
    const userDoc = await getDoc(doc(db, 'users', user.id))
    if (userDoc.exists()) {
      const userHeldAmount = userDoc.data().heldAmount || 0
      await updateDoc(doc(db, 'users', user.id), {
        heldAmount: Math.max(0, userHeldAmount - userBid.amount),
      })
    }

    // Delete the user's bid
    await updateDoc(doc(db, 'bids', userBid.id), { withdrawn: true })

    // Find next highest bid (not from the withdrawing user and not withdrawn)
    const remainingBids = allBids.filter(b => b.bidderId !== user.id && !(b as any).withdrawn)

    if (remainingBids.length > 0) {
      const nextHighestBid = remainingBids[0]

      // Hold the next highest bidder's amount
      const nextBidderDoc = await getDoc(doc(db, 'users', nextHighestBid.bidderId))
      if (nextBidderDoc.exists()) {
        const nextBidderHeldAmount = nextBidderDoc.data().heldAmount || 0
        await updateDoc(doc(db, 'users', nextHighestBid.bidderId), {
          heldAmount: nextBidderHeldAmount + nextHighestBid.amount,
        })
      }

      // Update auction with next highest bidder
      const newPriceHistory = auction.priceHistory.filter(p => p.price !== userBid.amount)
      await updateDoc(auctionRef, {
        currentPrice: nextHighestBid.amount,
        winnerId: nextHighestBid.bidderId,
        winnerName: nextHighestBid.bidderName,
        totalBids: auction.totalBids - 1,
        priceHistory: newPriceHistory,
      })

      // Notify the next highest bidder they're now winning
      await addDoc(collection(db, 'notifications'), {
        userId: nextHighestBid.bidderId,
        auctionId,
        type: 'now_winning',
        title: 'You\'re now the highest bidder!',
        message: `The previous high bidder withdrew. You're now winning "${auction.title}" with $${nextHighestBid.amount}!`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    } else {
      // No other bids - reset to starting price
      await updateDoc(auctionRef, {
        currentPrice: auction.startingPrice,
        winnerId: null,
        winnerName: null,
        totalBids: 0,
        priceHistory: [{ price: auction.startingPrice, timestamp: new Date().toISOString() }],
      })
    }

    // Notify the artist
    await addDoc(collection(db, 'notifications'), {
      userId: auction.artistId,
      auctionId,
      type: 'bid_withdrawn',
      title: 'Bid withdrawn from your auction',
      message: `${user.name} withdrew their bid of $${userBid.amount} from "${auction.title}".`,
      read: false,
      createdAt: new Date().toISOString(),
    })
  }

  const watchAuction = async (auctionId: string) => {
    if (!user?.id) throw new Error('Must be logged in')

    const auctionRef = doc(db, 'auctions', auctionId)
    const auctionDoc = await getDoc(auctionRef)

    if (!auctionDoc.exists()) throw new Error('Auction not found')

    const auction = auctionDoc.data() as Auction
    const watchers = auction.watchers || []

    if (!watchers.includes(user.id)) {
      await updateDoc(auctionRef, {
        watchers: [...watchers, user.id],
      })
    }
  }

  const unwatchAuction = async (auctionId: string) => {
    if (!user?.id) throw new Error('Must be logged in')

    const auctionRef = doc(db, 'auctions', auctionId)
    const auctionDoc = await getDoc(auctionRef)

    if (!auctionDoc.exists()) throw new Error('Auction not found')

    const auction = auctionDoc.data() as Auction
    const watchers = (auction.watchers || []).filter((w) => w !== user.id)

    await updateDoc(auctionRef, { watchers })
  }

  const createAuction = async (
    auctionData: Omit<Auction, 'id' | 'currentPrice' | 'status' | 'totalBids' | 'watchers' | 'priceHistory'>
  ): Promise<string> => {
    if (!user?.id) throw new Error('Must be logged in')
    if (user.role !== 'artist') throw new Error('Only artists can create auctions')

    // Check for $10 auction hosting fee
    const AUCTION_FEE = 10
    const userDoc = await getDoc(doc(db, 'users', user.id))
    const currentBalance = userDoc.exists() ? (userDoc.data().balance || 0) : 0

    if (currentBalance < AUCTION_FEE) {
      throw new Error(`Insufficient balance. You need $${AUCTION_FEE} to create an auction but only have $${currentBalance.toFixed(2)}. Please add funds to your wallet.`)
    }

    // Deduct auction fee
    await updateDoc(doc(db, 'users', user.id), {
      balance: currentBalance - AUCTION_FEE,
    })

    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      userId: user.id,
      type: 'auction_fee',
      amount: -AUCTION_FEE,
      description: `Auction hosting fee for "${auctionData.title}"`,
      createdAt: new Date().toISOString(),
    })

    const now = new Date()
    const startTime = new Date(auctionData.startTime)
    const status = startTime <= now ? 'active' : 'scheduled'

    // Build auction object, excluding undefined values
    const newAuction: Record<string, any> = {
      artworkId: auctionData.artworkId,
      title: auctionData.title,
      description: auctionData.description,
      imageUrl: auctionData.imageUrl,
      artistId: auctionData.artistId,
      artistName: auctionData.artistName,
      startingPrice: auctionData.startingPrice,
      currentPrice: auctionData.startingPrice,
      minBidIncrement: auctionData.minBidIncrement,
      startTime: auctionData.startTime,
      endTime: auctionData.endTime,
      status,
      totalBids: 0,
      watchers: [],
      priceHistory: [{ price: auctionData.startingPrice, timestamp: new Date().toISOString() }],
    }

    // Only add reservePrice if it's defined
    if (auctionData.reservePrice !== undefined) {
      newAuction.reservePrice = auctionData.reservePrice
    }

    const docRef = await addDoc(collection(db, 'auctions'), newAuction)
    return docRef.id
  }

  const cancelAuction = async (auctionId: string): Promise<void> => {
    if (!user?.id) throw new Error('Must be logged in')

    const auctionRef = doc(db, 'auctions', auctionId)
    const auctionDoc = await getDoc(auctionRef)

    if (!auctionDoc.exists()) throw new Error('Auction not found')

    const auction = { id: auctionDoc.id, ...auctionDoc.data() } as Auction

    if (auction.artistId !== user.id && user.role !== 'admin' && user.role !== 'csr') {
      throw new Error('Only the auction owner or admins can cancel')
    }
    if (auction.status === 'ended') throw new Error('Cannot cancel an ended auction')
    if (auction.status === 'cancelled') throw new Error('Auction is already cancelled')

    const isAdminCancel = user.role === 'admin' || user.role === 'csr'

    // Release held amount for current highest bidder
    if (auction.winnerId) {
      const bidderDoc = await getDoc(doc(db, 'users', auction.winnerId))
      if (bidderDoc.exists()) {
        const bidderHeldAmount = bidderDoc.data().heldAmount || 0
        await updateDoc(doc(db, 'users', auction.winnerId), {
          heldAmount: Math.max(0, bidderHeldAmount - auction.currentPrice),
        })
      }
    }

    await updateDoc(auctionRef, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancelledBy: user.id,
    })

    // Notify all bidders that the auction was cancelled
    if (auction.totalBids > 0) {
      const bidsQuery = query(collection(db, 'bids'), where('auctionId', '==', auctionId))
      const bidsSnapshot = await getDocs(bidsQuery)
      const bidderIds = new Set<string>()
      bidsSnapshot.forEach((doc) => {
        bidderIds.add(doc.data().bidderId)
      })

      const message = isAdminCancel
        ? `The auction "${auction.title}" has been cancelled by an administrator. Your held funds have been released.`
        : `The auction "${auction.title}" has been cancelled by the artist. Your held funds have been released.`

      for (const bidderId of bidderIds) {
        await addDoc(collection(db, 'notifications'), {
          userId: bidderId,
          auctionId,
          type: 'auction_cancelled',
          title: 'Auction Cancelled',
          message,
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    }

    // Notify watchers
    for (const watcherId of auction.watchers || []) {
      await addDoc(collection(db, 'notifications'), {
        userId: watcherId,
        auctionId,
        type: 'auction_cancelled',
        title: 'Watched Auction Cancelled',
        message: isAdminCancel
          ? `The auction "${auction.title}" you were watching has been cancelled by an administrator.`
          : `The auction "${auction.title}" you were watching has been cancelled by the artist.`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    // Notify artist if cancelled by admin
    if (isAdminCancel) {
      await addDoc(collection(db, 'notifications'), {
        userId: auction.artistId,
        auctionId,
        type: 'auction_cancelled',
        title: 'Your Auction Was Cancelled',
        message: `Your auction "${auction.title}" has been cancelled by an administrator. Please contact support for more information.`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }
  }

  const getAuction = async (auctionId: string): Promise<Auction | null> => {
    try {
      const auctionDoc = await getDoc(doc(db, 'auctions', auctionId))
      if (!auctionDoc.exists()) return null
      return { id: auctionDoc.id, ...auctionDoc.data() } as Auction
    } catch (err) {
      console.error('Error fetching auction:', err)
      return null
    }
  }

  const getAuctionBids = async (auctionId: string): Promise<Bid[]> => {
    try {
      const q = query(
        collection(db, 'bids'),
        where('auctionId', '==', auctionId)
      )
      const snapshot = await getDocs(q)
      const bids: Bid[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        // Filter out withdrawn bids
        if (!data.withdrawn) {
          bids.push({ id: docSnap.id, ...data } as Bid)
        }
      })
      // Sort by timestamp descending (newest first)
      return bids.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (err) {
      console.error('Error fetching bids:', err)
      return []
    }
  }

  const refreshAuctions = async () => {
    setLoading(true)
    await fetchAuctions()
  }

  return (
    <AuctionContext.Provider
      value={{
        auctions,
        activeAuctions,
        userBids,
        watchedAuctions,
        loading,
        placeBid,
        withdrawBid,
        watchAuction,
        unwatchAuction,
        createAuction,
        cancelAuction,
        getAuction,
        getAuctionBids,
        refreshAuctions,
      }}
    >
      {children}
    </AuctionContext.Provider>
  )
}

export const useAuction = () => {
  const context = useContext(AuctionContext)
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider')
  }
  return context
}
