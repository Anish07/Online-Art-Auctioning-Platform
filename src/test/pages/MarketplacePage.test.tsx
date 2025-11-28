import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MarketplacePage from '../../pages/MarketplacePage'
import { BrowserRouter } from 'react-router-dom'
import * as firestore from 'firebase/firestore'

// Mock Firestore
const { mockGetDocs, mockUpdateDoc, mockDoc, mockGetDoc } = vi.hoisted(() => {
    return {
        mockGetDocs: vi.fn(),
        mockUpdateDoc: vi.fn(),
        mockDoc: vi.fn(),
        mockGetDoc: vi.fn()
    }
})

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore')
    return {
        ...actual,
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        getDocs: mockGetDocs,
        doc: mockDoc,
        getDoc: mockGetDoc,
        updateDoc: mockUpdateDoc,
        arrayUnion: vi.fn(),
        arrayRemove: vi.fn(),
        addDoc: vi.fn(),
        increment: vi.fn()
    }
})

// Mock useAuth
const mockUser = {
    id: 'user1',
    name: 'Test User',
    role: 'buyer',
    balance: 1000,
    heldAmount: 0,
    watchlist: []
}

vi.mock('../../context/auth', () => ({
    useAuth: () => ({
        user: mockUser
    })
}))

const mockArtworks = [
    {
        id: 'art1',
        title: 'Digital Art',
        artistId: 'artist1',
        artistName: 'Artist One',
        price: 100,
        imageUrl: 'url1',
        artworkType: 'digital',
        forSale: true,
        quantity: 1
    },
    {
        id: 'art2',
        title: 'Physical Art',
        artistId: 'artist2',
        artistName: 'Artist Two',
        price: 200,
        imageUrl: 'url2',
        artworkType: 'physical',
        forSale: true,
        quantity: 1
    }
]

describe('MarketplacePage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetDocs.mockResolvedValue({
            forEach: (callback: any) => mockArtworks.forEach(art => callback({
                id: art.id,
                data: () => art
            }))
        })
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({ watchlist: [] })
        })
    })

    it('renders marketplace items', async () => {
        render(
            <BrowserRouter>
                <MarketplacePage />
            </BrowserRouter>
        )

        expect(await screen.findByText('Digital Art')).toBeInTheDocument()
        expect(screen.getByText('Physical Art')).toBeInTheDocument()
        expect(screen.getByText(/Artist One/)).toBeInTheDocument()
        expect(screen.getByText('$100')).toBeInTheDocument()
    })

    it('handles empty state', async () => {
        mockGetDocs.mockResolvedValue({
            forEach: (callback: any) => [].forEach(callback)
        })

        render(
            <BrowserRouter>
                <MarketplacePage />
            </BrowserRouter>
        )

        expect(await screen.findByText('No artworks available for sale yet.')).toBeInTheDocument()
    })

    it('handles buy now', async () => {
        // Mock window.alert
        vi.spyOn(window, 'alert').mockImplementation(() => { })

        render(
            <BrowserRouter>
                <MarketplacePage />
            </BrowserRouter>
        )

        const buyButtons = await screen.findAllByText('Buy Now')
        fireEvent.click(buyButtons[0])

        await waitFor(() => {
            expect(mockUpdateDoc).toHaveBeenCalled()
        })
    })

    it('handles watch toggle', async () => {
        render(
            <BrowserRouter>
                <MarketplacePage />
            </BrowserRouter>
        )

        const watchButtons = await screen.findAllByText('☆ Watch')
        fireEvent.click(watchButtons[0])

        await waitFor(() => {
            expect(mockUpdateDoc).toHaveBeenCalled()
        })
    })

    it('handles report', async () => {
        vi.spyOn(window, 'alert').mockImplementation(() => { })

        render(
            <BrowserRouter>
                <MarketplacePage />
            </BrowserRouter>
        )

        const reportButtons = await screen.findAllByTitle('Report this artwork')
        fireEvent.click(reportButtons[0])

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Reported artwork'))
    })
})
