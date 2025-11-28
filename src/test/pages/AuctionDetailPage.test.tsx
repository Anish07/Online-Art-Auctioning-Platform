import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuctionDetailPage from '../../pages/AuctionDetailPage'
import { BrowserRouter } from 'react-router-dom'
import * as firestore from 'firebase/firestore'

// Mock Firestore
const { mockOnSnapshot } = vi.hoisted(() => {
    return { mockOnSnapshot: vi.fn() }
})

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore')
    return {
        ...actual,
        doc: vi.fn(),
        onSnapshot: mockOnSnapshot
    }
})

// Mock useAuction
const mockPlaceBid = vi.fn()
const mockWatchAuction = vi.fn()
const mockGetAuctionBids = vi.fn()

vi.mock('../../context/auction', () => ({
    useAuction: () => ({
        placeBid: mockPlaceBid,
        watchAuction: mockWatchAuction,
        getAuctionBids: mockGetAuctionBids,
        unwatchAuction: vi.fn(),
        withdrawBid: vi.fn(),
        cancelAuction: vi.fn()
    })
}))

// Mock useAuth
const mockUser = {
    id: 'user1',
    name: 'Test User',
    role: 'buyer',
    balance: 1000,
    heldAmount: 0
}

vi.mock('../../context/auth', () => ({
    useAuth: () => ({
        user: mockUser
    })
}))

// Mock useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useParams: () => ({ id: 'auction1' })
    }
})

describe('AuctionDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Setup default onSnapshot behavior
        mockOnSnapshot.mockImplementation((docRef: any, callback: any) => {
            callback({
                exists: () => true,
                id: 'auction1',
                data: () => ({
                    title: 'Test Auction',
                    artistId: 'artist1',
                    artistName: 'Artist One',
                    currentPrice: 100,
                    minBidIncrement: 10,
                    startTime: new Date().toISOString(),
                    endTime: new Date(Date.now() + 86400000).toISOString(), // +1 day
                    status: 'active',
                    totalBids: 0,
                    watchers: []
                })
            })
            return vi.fn() // unsubscribe
        })
        mockGetAuctionBids.mockResolvedValue([])
    })

    it('renders auction details', async () => {
        render(
            <BrowserRouter>
                <AuctionDetailPage />
            </BrowserRouter>
        )

        expect(await screen.findByText('Test Auction')).toBeInTheDocument()
        expect(screen.getByText('by Artist One')).toBeInTheDocument()
        expect(screen.getByText('$100')).toBeInTheDocument()
    })

    it('handles bidding', async () => {
        render(
            <BrowserRouter>
                <AuctionDetailPage />
            </BrowserRouter>
        )

        const bidInput = await screen.findByRole('spinbutton') // Number input
        fireEvent.change(bidInput, { target: { value: '110' } })

        const placeBidButton = screen.getByText('Place Bid')
        fireEvent.click(placeBidButton)

        await waitFor(() => {
            expect(mockPlaceBid).toHaveBeenCalledWith('auction1', 110)
        })
    })

    it('handles watching', async () => {
        render(
            <BrowserRouter>
                <AuctionDetailPage />
            </BrowserRouter>
        )

        const watchButton = await screen.findByText('☆ Watch')
        fireEvent.click(watchButton)

        await waitFor(() => {
            expect(mockWatchAuction).toHaveBeenCalledWith('auction1')
        })
    })
})
