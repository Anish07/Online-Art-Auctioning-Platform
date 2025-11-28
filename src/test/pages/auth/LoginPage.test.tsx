import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LoginPage from '../../../pages/auth/LoginPage'
import { BrowserRouter } from 'react-router-dom'
import * as authContext from '../../../context/auth'

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
const mockLogin = vi.fn()
vi.mock('../../../context/auth', () => ({
    useAuth: () => ({
        login: mockLogin
    })
}))

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders login form', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        )
        expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('handles input changes', () => {
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        )
        const emailInput = screen.getByPlaceholderText('Email')
        const passwordInput = screen.getByPlaceholderText('Password')

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })

        expect(emailInput).toHaveValue('test@example.com')
        expect(passwordInput).toHaveValue('password123')
    })

    it('calls login on submit', async () => {
        mockLogin.mockResolvedValue({})
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
            expect(mockNavigate).toHaveBeenCalledWith('/')
        })
    })

    it('displays error on failure', async () => {
        mockLogin.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } })
        render(
            <BrowserRouter>
                <LoginPage />
            </BrowserRouter>
        )

        fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } })
        fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
        })
    })
})
