import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function ArtistProfilePage() {
  const { id } = useParams()
  const [artist, setArtist] = useState<any>(null)
  useEffect(() => {
    if (!id) return
    api.artist.get(id).then((d) => setArtist(d))
  }, [id])

  if (!artist) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold">{artist.name}</h2>
      <p className="mt-2">Role: {artist.role}</p>
      <section className="mt-6">Portfolio preview goes here</section>
    </div>
  )
}