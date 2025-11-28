import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateAuctionPage from '../../pages/CreateAuctionPage'
import { BrowserRouter } from 'react-router-dom'

// Mock Firestore
const { mockGetDocs } = vi.hoisted(() => {
    return { mockGetDocs: vi.fn() }
})

vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore')
    return {
        ...actual,
        collection: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        getDocs: mockGetDocs
    }
})

// Mock useAuction
const mockCreateAuction = vi.fn()

vi.mock('../../context/auction', () => ({
    useAuction: () => ({
        createAuction: mockCreateAuction
    })
}))

// Mock useAuth
const { mockUser } = vi.hoisted(() => ({
    mockUser: {
        id: 'artist1',
        name: 'Artist User',
        role: 'artist'
    }
}))

vi.mock('../../context/auth', () => ({
    useAuth: () => ({
        user: mockUser
    })
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

describe('CreateAuctionPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetDocs.mockResolvedValue({
            forEach: (callback: any) => [].forEach(callback)
        })
    })

    it('renders form', async () => {
        render(
            <BrowserRouter>
                <CreateAuctionPage />
            </BrowserRouter>
        )

        expect(screen.getByText('Create New Auction')).toBeInTheDocument()
        expect(screen.getByText('Auction Title *')).toBeInTheDocument()
    })

    it('submits new auction', async () => {
        mockCreateAuction.mockResolvedValue('new-auction-id')
        const { container } = render(
            <BrowserRouter>
                <CreateAuctionPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Enter auction title'), { target: { value: 'New Auction' } })
        fireEvent.change(screen.getByPlaceholderText('https://example.com/image.jpg'), { target: { value: 'url' } })

        // Fill required fields
        const inputs = screen.getAllByRole('spinbutton') // Price inputs
        fireEvent.change(inputs[0], { target: { value: '100' } }) // Starting Price
        fireEvent.change(inputs[1], { target: { value: '150' } }) // Reserve Price
        fireEvent.change(inputs[2], { target: { value: '10' } }) // Increment

        // Set dates
        const dateInputs = container.querySelectorAll('input[type="datetime-local"]')
        const startInput = dateInputs[0] as HTMLInputElement
        const endInput = dateInputs[1] as HTMLInputElement

        fireEvent.change(startInput, { target: { value: '2025-12-01T10:00' } })
        fireEvent.change(endInput, { target: { value: '2025-12-08T10:00' } })

        const form = container.querySelector('form')
        fireEvent.submit(form!)

        await waitFor(() => {
            expect(mockCreateAuction).toHaveBeenCalled()
            expect(mockNavigate).toHaveBeenCalledWith('/auctions/new-auction-id')
        })
    })
})
