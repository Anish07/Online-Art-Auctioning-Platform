import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/auth'
import { Navigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

type ContactInfo = {
  bio: string
  website: string
  instagram: string
  twitter: string
  contactEmail: string
  location: string
  commissionsOpen: boolean
  commissionInfo: string
}

export default function ArtistSettingsPage() {
  const { user, loading } = useAuth()
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    bio: '',
    website: '',
    instagram: '',
    twitter: '',
    contactEmail: '',
    location: '',
    commissionsOpen: false,
    commissionInfo: '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    const fetchContactInfo = async () => {
      if (!user?.id) return
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setContactInfo({
            bio: data.bio || '',
            website: data.website || '',
            instagram: data.instagram || '',
            twitter: data.twitter || '',
            contactEmail: data.contactEmail || '',
            location: data.location || '',
            commissionsOpen: data.commissionsOpen || false,
            commissionInfo: data.commissionInfo || '',
          })
        }
      } catch (err) {
        console.error('Error fetching contact info:', err)
      } finally {
        setLoadingData(false)
      }
    }
    fetchContactInfo()
  }, [user?.id])

  if (loading || loadingData) return <div className="p-6">Loading...</div>
  if (!user || user.role !== 'artist') return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    try {
      await updateDoc(doc(db, 'users', user.id), {
        bio: contactInfo.bio,
        website: contactInfo.website,
        instagram: contactInfo.instagram,
        twitter: contactInfo.twitter,
        contactEmail: contactInfo.contactEmail,
        location: contactInfo.location,
        commissionsOpen: contactInfo.commissionsOpen,
        commissionInfo: contactInfo.commissionInfo,
      })
      setSuccess(true)
    } catch (err) {
      console.error('Error saving contact info:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold dark:text-hf-text">Artist Profile Settings</h2>
        <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
          ← Back to Dashboard
        </Link>
      </div>
      <p className="text-gray-600 dark:text-hf-muted mb-6">Update your public profile information visible to buyers.</p>

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border dark:border-gray-700-green-200 rounded-lg">
          <p className="text-green-800">Profile updated successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Bio</label>
          <textarea
            value={contactInfo.bio}
            onChange={(e) => setContactInfo({ ...contactInfo, bio: e.target.value })}
            placeholder="Tell buyers about yourself and your art..."
            className="w-full p-2 border dark:border-gray-700 rounded"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            value={contactInfo.location}
            onChange={(e) => setContactInfo({ ...contactInfo, location: e.target.value })}
            placeholder="e.g., New York, NY"
            className="w-full p-2 border dark:border-gray-700 rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Contact Email</label>
          <input
            type="email"
            value={contactInfo.contactEmail}
            onChange={(e) => setContactInfo({ ...contactInfo, contactEmail: e.target.value })}
            placeholder="Public email for inquiries"
            className="w-full p-2 border dark:border-gray-700 rounded"
          />
          <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">This will be visible to buyers on your profile</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <input
            type="url"
            value={contactInfo.website}
            onChange={(e) => setContactInfo({ ...contactInfo, website: e.target.value })}
            placeholder="https://yourwebsite.com"
            className="w-full p-2 border dark:border-gray-700 rounded"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Instagram</label>
            <input
              value={contactInfo.instagram}
              onChange={(e) => setContactInfo({ ...contactInfo, instagram: e.target.value })}
              placeholder="@username"
              className="w-full p-2 border dark:border-gray-700 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Twitter/X</label>
            <input
              value={contactInfo.twitter}
              onChange={(e) => setContactInfo({ ...contactInfo, twitter: e.target.value })}
              placeholder="@username"
              className="w-full p-2 border dark:border-gray-700 rounded"
            />
          </div>
        </div>

        {/* Commission Settings */}
        <div className="border dark:border-gray-700-t pt-4 mt-4">
          <h3 className="text-lg font-medium dark:text-hf-text mb-3">Commission Settings</h3>

          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="commissionsOpen"
              checked={contactInfo.commissionsOpen}
              onChange={(e) => setContactInfo({ ...contactInfo, commissionsOpen: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="commissionsOpen" className="text-sm font-medium">
              Open for Commissions
            </label>
          </div>

          {contactInfo.commissionsOpen && (
            <div>
              <label className="block text-sm font-medium mb-1">Commission Information</label>
              <textarea
                value={contactInfo.commissionInfo}
                onChange={(e) => setContactInfo({ ...contactInfo, commissionInfo: e.target.value })}
                placeholder="Describe your commission process, pricing, turnaround time, etc."
                className="w-full p-2 border dark:border-gray-700 rounded"
                rows={4}
              />
              <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">This will be shown to buyers on your profile</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
