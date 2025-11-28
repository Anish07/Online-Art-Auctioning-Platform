import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CommunityFeed from '../../components/CommunityFeed'
import { BrowserRouter } from 'react-router-dom'
import * as auctionContext from '../../context/auction'
import * as firestore from 'firebase/firestore'

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
    db: {}
}))

// Mock Firestore functions & useAuction
const { mockGetDocs, mockUseAuction } = vi.hoisted(() => {
    return {
        mockGetDocs: vi.fn(),
        mockUseAuction: vi.fn()
    }
})

vi.mock('../../context/auction', () => ({
    useAuction: mockUseAuction
}))

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore')
    return {
        ...actual,
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        limit: vi.fn(),
        getDocs: mockGetDocs,
        orderBy: vi.fn()
    }
})

describe('CommunityFeed', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders loading state initially', () => {
        mockUseAuction.mockReturnValue({
            auctions: [],
            activeAuctions: [],
            userBids: [],
            watchedAuctions: [],
            loading: true,
            placeBid: vi.fn(),
            withdrawBid: vi.fn(),
            watchAuction: vi.fn(),
            unwatchAuction: vi.fn(),
            createAuction: vi.fn(),
            cancelAuction: vi.fn(),
            getAuction: vi.fn(),
            getAuctionBids: vi.fn(),
            refreshAuctions: vi.fn()
        })

        render(
            <BrowserRouter>
                <CommunityFeed />
            </BrowserRouter>
        )

        // Check for pulse animation elements
        const loaders = document.querySelectorAll('.animate-pulse')
        expect(loaders.length).toBeGreaterThan(0)
    })

    it('renders feed items correctly', async () => {
        // Mock Auctions
        mockUseAuction.mockReturnValue({
            auctions: [
                {
                    id: 'auction1',
                    title: 'Auction Item',
                    artistName: 'Artist One',
                    artistId: 'artist1',
                    imageUrl: 'url1',
                    currentPrice: 100,
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 86400000).toISOString(),
                    status: 'active',
                    artworkId: 'art1',
                    description: 'desc',
                    startingPrice: 50,
                    minBidIncrement: 10,
                    totalBids: 0,
                    watchers: [],
                    priceHistory: []
                }
            ],
            activeAuctions: [],
            userBids: [],
            watchedAuctions: [],
            loading: false,
            placeBid: vi.fn(),
            withdrawBid: vi.fn(),
            watchAuction: vi.fn(),
            unwatchAuction: vi.fn(),
            createAuction: vi.fn(),
            cancelAuction: vi.fn(),
            getAuction: vi.fn(),
            getAuctionBids: vi.fn(),
            refreshAuctions: vi.fn()
        })

        // Mock Marketplace Items
        const mockMarketplaceData = [
            {
                id: 'market1',
                data: () => ({
                    title: 'Market Item',
                    artistName: 'Artist Two',
                    artistId: 'artist2',
                    imageUrl: 'url2',
                    price: 200,
                    createdAt: new Date().toISOString(),
                    forSale: true
                })
            }
        ]

        mockGetDocs.mockResolvedValue({
            forEach: (callback: any) => mockMarketplaceData.forEach(callback)
        })

        render(
            <BrowserRouter>
                <CommunityFeed />
            </BrowserRouter>
        )

        expect(mockUseAuction).toHaveBeenCalled()
        expect(mockGetDocs).toHaveBeenCalled()

        expect(await screen.findByText('Auction Item')).toBeInTheDocument()
        expect(screen.getByText(/Artist One/)).toBeInTheDocument()
        expect(screen.getByText('Market Item')).toBeInTheDocument()
        expect(screen.getByText(/Artist Two/)).toBeInTheDocument()
    })

    it('handles empty state', async () => {
        mockUseAuction.mockReturnValue({
            auctions: [],
            activeAuctions: [],
            userBids: [],
            watchedAuctions: [],
            loading: false,
            placeBid: vi.fn(),
            withdrawBid: vi.fn(),
            watchAuction: vi.fn(),
            unwatchAuction: vi.fn(),
            createAuction: vi.fn(),
            cancelAuction: vi.fn(),
            getAuction: vi.fn(),
            getAuctionBids: vi.fn(),
            refreshAuctions: vi.fn()
        })

        mockGetDocs.mockResolvedValue({
            forEach: (callback: any) => [].forEach(callback)
        })

        render(
            <BrowserRouter>
                <CommunityFeed />
            </BrowserRouter>
        )

        await waitFor(() => {
            expect(screen.getByText('No recent activity')).toBeInTheDocument()
        })
    })
})
