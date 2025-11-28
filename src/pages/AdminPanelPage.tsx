import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/auth'
import { Navigate, Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

type ArtistRequest = {
  userId: string
  name: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
}

type User = {
  id: string
  email: string
  name: string
  role: 'artist' | 'buyer' | 'csr' | 'admin'
  status?: 'active' | 'suspended'
}

type Artwork = {
  id: string
  title: string
  artistId: string
  artistName: string
  imageUrl: string
  forSale: boolean
  price: number | null
  status: 'portfolio' | 'listed'
  contentStatus?: 'pending' | 'approved' | 'rejected'
}

export default function AdminPanelPage() {
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [artistRequests, setArtistRequests] = useState<ArtistRequest[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'artists' | 'users' | 'content'>('dashboard')
  const [loadingData, setLoadingData] = useState(true)

  // Fetch all data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        // Fetch artist requests
        const requestsSnapshot = await getDocs(collection(db, 'artistRequests'))
        const requests: ArtistRequest[] = []
        requestsSnapshot.forEach((doc) => {
          requests.push(doc.data() as ArtistRequest)
        })
        setArtistRequests(requests.filter(r => r.status === 'pending'))

        // Fetch all users
        const usersSnapshot = await getDocs(collection(db, 'users'))
        const usersList: User[] = []
        usersSnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() } as User)
        })
        setUsers(usersList)

        // Fetch all artworks
        const artworksSnapshot = await getDocs(collection(db, 'artworks'))
        const artworksList: Artwork[] = []
        artworksSnapshot.forEach((doc) => {
          artworksList.push({ id: doc.id, ...doc.data() } as Artwork)
        })
        setArtworks(artworksList)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="p-6 text-center dark:text-hf-text">Loading...</div>
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const handleArtistRequest = async (userId: string, approved: boolean) => {
    try {
      // Update user document
      await updateDoc(doc(db, 'users', userId), {
        role: approved ? 'artist' : 'buyer',
        artistStatus: approved ? 'approved' : 'rejected',
      })

      // Update or delete the request
      if (approved) {
        await deleteDoc(doc(db, 'artistRequests', userId))
      } else {
        await updateDoc(doc(db, 'artistRequests', userId), {
          status: 'rejected',
        })
      }

      // Update local state
      setArtistRequests(artistRequests.filter(r => r.userId !== userId))
    } catch (error) {
      console.error('Error handling artist request:', error)
    }
  }

  const toggleUserStatus = async (userId: string) => {
    const userToUpdate = users.find(u => u.id === userId)
    if (!userToUpdate) return

    const newStatus = userToUpdate.status === 'suspended' ? 'active' : 'suspended'
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus })
      setUsers(users.map(u =>
        u.id === userId ? { ...u, status: newStatus } : u
      ))
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const updateArtworkContentStatus = async (artworkId: string, contentStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'artworks', artworkId), { contentStatus })
      setArtworks(artworks.map(a =>
        a.id === artworkId ? { ...a, contentStatus } : a
      ))
    } catch (error) {
      console.error('Error updating artwork status:', error)
    }
  }

  const deleteArtwork = async (artworkId: string) => {
    if (!confirm('Are you sure you want to delete this artwork?')) return
    try {
      await deleteDoc(doc(db, 'artworks', artworkId))
      setArtworks(artworks.filter(a => a.id !== artworkId))
    } catch (error) {
      console.error('Error deleting artwork:', error)
    }
  }

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status !== 'suspended').length,
    totalArtworks: artworks.length,
    listedArtworks: artworks.filter(a => a.forSale).length,
  }

  const SidebarItem = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === id
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
    >
      {icon}
      {label}
      {id === 'artists' && artistRequests.length > 0 && (
        <span className="ml-auto bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs py-0.5 px-2 rounded-full">
          {artistRequests.length}
        </span>
      )}
    </button>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 dark:bg-hf-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-hf-card border-r dark:border-gray-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin Console</h2>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem
            id="dashboard"
            label="Dashboard"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
          <SidebarItem
            id="users"
            label="Users"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
          />
          <SidebarItem
            id="artists"
            label="Artist Requests"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>}
          />
          <SidebarItem
            id="content"
            label="Content Moderation"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
        </nav>
        <div className="p-4 border-t dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              A
            </div>
            <div>
              <p className="text-sm font-medium dark:text-hf-text">Admin</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">System Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold dark:text-hf-text">Dashboard Overview</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-3xl font-bold mt-2 dark:text-hf-text">{stats.totalUsers}</p>
                  <div className="mt-4 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {stats.activeUsers} Active
                  </div>
                </div>
                <div className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Artworks</p>
                  <p className="text-3xl font-bold mt-2 dark:text-hf-text">{stats.totalArtworks}</p>
                  <div className="mt-4 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    {stats.listedArtworks} Listed
                  </div>
                </div>
                <div className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Requests</p>
                  <p className="text-3xl font-bold mt-2 dark:text-hf-text">{artistRequests.length}</p>
                  <div className="mt-4 text-xs text-orange-600 dark:text-orange-400">
                    Requires attention
                  </div>
                </div>
                <div className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Suspended Users</p>
                  <p className="text-3xl font-bold mt-2 dark:text-hf-text">{users.filter(u => u.status === 'suspended').length}</p>
                  <div className="mt-4 text-xs text-red-600 dark:text-red-400">
                    Restricted access
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Artist Requests View */}
          {activeTab === 'artists' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold dark:text-hf-text">Artist Requests</h1>
              <div className="bg-white dark:bg-hf-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {artistRequests.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-lg font-medium dark:text-hf-text">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">No pending artist requests.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {artistRequests.map(request => (
                        <tr key={request.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium dark:text-hf-text">{request.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{request.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleArtistRequest(request.userId, true)}
                              className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleArtistRequest(request.userId, false)}
                              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Users View */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold dark:text-hf-text">User Management</h1>
              <div className="bg-white dark:bg-hf-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium dark:text-hf-text">{u.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              u.role === 'artist' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${u.status === 'suspended'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => toggleUserStatus(u.id)}
                              className={`text-sm font-medium hover:underline ${u.status === 'suspended'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                              {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content View */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold dark:text-hf-text">Content Moderation</h1>
              <div className="bg-white dark:bg-hf-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artwork</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Artist</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {artworks.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                              <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-medium dark:text-hf-text">{a.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {a.artistName}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                            ${a.contentStatus === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              a.contentStatus === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                            {a.contentStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => updateArtworkContentStatus(a.id, 'approved')}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            title="Approve"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button
                            onClick={() => updateArtworkContentStatus(a.id, 'rejected')}
                            className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Reject"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          </button>
                          <button
                            onClick={() => deleteArtwork(a.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}