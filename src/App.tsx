import React, { JSX } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth'
import { AuctionProvider } from './context/auction'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import MarketplacePage from './pages/MarketplacePage'
import MarketplaceItemPage from './pages/MarketplaceItemPage'
import ArtistProfilePage from './pages/ArtistProfilePage'
import DashboardPage from './pages/DashboardPage'
import UploadArtworkPage from './pages/UploadArtworkPage'
import CommissionRequestsPage from './pages/CommissionRequestsPage'
import SupportPage from './pages/SupportPage'
import AdminPanelPage from './pages/AdminPanelPage'
import CSRDashboardPage from './pages/CSRDashboardPage'
import ArtistSettingsPage from './pages/ArtistSettingsPage'
import AuctionDashboardPage from './pages/AuctionDashboardPage'
import AuctionDetailPage from './pages/AuctionDetailPage'
import CreateAuctionPage from './pages/CreateAuctionPage'
import WalletPage from './pages/WalletPage'
import ArtistsPage from './pages/ArtistsPage'
import AboutUsPage from './pages/AboutUsPage'

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

const CSRRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'csr' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

const ArtistRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'artist' && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <AuctionProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:id" element={<MarketplaceItemPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artist/:id" element={<ArtistProfilePage />} />
            <Route
              path="/dashboard/*"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route path="/upload" element={<UploadArtworkPage />} />
            <Route path="/artist-settings" element={<ArtistSettingsPage />} />
            <Route path="/commissions" element={<CommissionRequestsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route
              path="/csr"
              element={
                <CSRRoute>
                  <CSRDashboardPage />
                </CSRRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanelPage />
                </AdminRoute>
              }
            />
            {/* Auction Routes */}
            <Route path="/auctions" element={<AuctionDashboardPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} />
            <Route
              path="/auctions/create"
              element={
                <ArtistRoute>
                  <CreateAuctionPage />
                </ArtistRoute>
              }
            />
            {/* Wallet Route */}
            <Route
              path="/wallet"
              element={
                <PrivateRoute>
                  <WalletPage />
                </PrivateRoute>
              }
            />
          </Routes>
        </Layout>
      </AuctionProvider>
    </AuthProvider>
  )
}
