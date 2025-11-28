import React, { useState } from 'react'
import { useAuth } from '../context/auth'
import { Navigate } from 'react-router-dom'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function UploadArtworkPage() {
  const { user, loading } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [medium, setMedium] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [year, setYear] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <div className="p-6">Loading...</div>
  if (!user || user.role !== 'artist') return <Navigate to="/dashboard" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select an image')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Convert image to base64 (avoids Firebase Storage CORS issues)
      const imageUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Save artwork to Firestore
      await addDoc(collection(db, 'artworks'), {
        title,
        description,
        medium,
        dimensions,
        year: year || null,
        imageUrl,
        artistId: user.id,
        artistName: user.name,
        status: 'portfolio', // portfolio = not for sale, listed = for sale
        forSale: false,
        price: null,
        createdAt: new Date().toISOString(),
      })

      setSuccess(true)
      setTitle('')
      setDescription('')
      setMedium('')
      setDimensions('')
      setYear('')
      setFile(null)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err?.message || err?.code || 'Upload failed. Check console for details.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-semibold dark:text-hf-text">Upload Artwork to Portfolio</h2>
      <p className="text-gray-600 dark:text-hf-muted mt-1">Add artwork to your portfolio. You can list it for sale later.</p>

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border dark:border-gray-700-green-200 rounded-lg">
          <p className="text-green-800">Artwork uploaded successfully!</p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-2 text-sm text-green-700 underline"
          >
            Upload another
          </button>
        </div>
      )}

      {!success && (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Artwork title"
              className="w-full p-2 border dark:border-gray-700 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your artwork..."
              className="w-full p-2 border dark:border-gray-700 rounded"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Medium</label>
              <input
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
                placeholder="e.g., Oil on canvas"
                className="w-full p-2 border dark:border-gray-700 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dimensions</label>
              <input
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g., 24 x 36 inches"
                className="w-full p-2 border dark:border-gray-700 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Year Created</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024"
              className="w-full p-2 border dark:border-gray-700 rounded"
              type="number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Image *</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 border dark:border-gray-700 rounded"
              required
            />
          </div>

          {error && <div className="text-red-600">{error}</div>}

          <button
            type="submit"
            disabled={uploading}
            className="px-4 py-2 rounded bg-primary text-white disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload to Portfolio'}
          </button>
        </form>
      )}
    </div>
  )
}