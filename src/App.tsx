import React, { JSX } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import MarketplacePage from './pages/MarketplacePage'
import ArtistProfilePage from './pages/ArtistProfilePage'
import DashboardPage from './pages/DashboardPage'
import UploadArtworkPage from './pages/UploadArtworkPage'
import CommissionRequestsPage from './pages/CommissionRequestsPage'
import SupportPage from './pages/SupportPage'
import AdminPanelPage from './pages/AdminPanelPage'

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
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
          <Route path="/commissions" element={<CommissionRequestsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/admin" element={<AdminPanelPage />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}