import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterPage from '../../../pages/auth/RegisterPage'
import { BrowserRouter } from 'react-router-dom'

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

// Mock useAuth
const mockRegister = vi.fn()
vi.mock('../../../context/auth', () => ({
    useAuth: () => ({
        register: mockRegister
    })
}))

describe('RegisterPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders registration form', () => {
        render(
            <BrowserRouter>
                <RegisterPage />
            </BrowserRouter>
        )
        expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('handles input changes', () => {
        render(
            <BrowserRouter>
                <RegisterPage />
            </BrowserRouter>
        )
        const nameInput = screen.getByPlaceholderText('Full name')
        const emailInput = screen.getByPlaceholderText('Email')
        const passwordInput = screen.getByPlaceholderText('Password')

        fireEvent.change(nameInput, { target: { value: 'Test User' } })
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        expect(nameInput).toHaveValue('Test User')
        expect(emailInput).toHaveValue('test@example.com')
        expect(passwordInput).toHaveValue('password123')
    })

    it('calls register on submit (buyer)', async () => {
        mockRegister.mockResolvedValue({})
        render(
            <BrowserRouter>
                <RegisterPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Test User' } })
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User', 'buyer')
            expect(mockNavigate).toHaveBeenCalledWith('/')
        })
    })

    it('calls register on submit (artist)', async () => {
        mockRegister.mockResolvedValue({})
        render(
            <BrowserRouter>
                <RegisterPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Artist User' } })
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'artist@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })

        // Select artist role
        fireEvent.change(screen.getByRole('combobox'), { target: { value: 'artist' } })

        fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

        await waitFor(() => {
            expect(mockRegister).toHaveBeenCalledWith('artist@example.com', 'password123', 'Artist User', 'artist')
            expect(screen.getByText(/Your artist application has been submitted/)).toBeInTheDocument()
        })
    })

    it('displays error on failure', async () => {
        mockRegister.mockRejectedValue({ message: 'Registration failed' })
        render(
            <BrowserRouter>
                <RegisterPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Test User' } })
        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

        await waitFor(() => {
            expect(screen.getByText('Registration failed')).toBeInTheDocument()
        })
    })
})
