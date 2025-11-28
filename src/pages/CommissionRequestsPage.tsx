import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, doc, updateDoc, arrayUnion, onSnapshot, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'

type Message = {
  senderId: string
  senderName: string
  message: string
  timestamp: string
}

type Commission = {
  id: string
  artistId: string
  artistName: string
  buyerId: string
  buyerName: string
  buyerEmail: string
  title: string
  description: string
  budget?: string
  deadline?: string
  status: 'pending' | 'in_progress' | 'completed' | 'declined' | 'cancelled'
  createdAt: string
  messages: Message[]
}

export default function CommissionRequestsPage() {
  const { user, loading } = useAuth()
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'declined' | 'cancelled'>('all')

  useEffect(() => {
    if (!user) return

    // Determine query based on user role
    const isArtist = user.role === 'artist'
    const q = query(
      collection(db, 'commissions'),
      where(isArtist ? 'artistId' : 'buyerId', '==', user.id)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comms: Commission[] = []
      snapshot.forEach((docSnap) => {
        comms.push({ id: docSnap.id, ...docSnap.data() } as Commission)
      })
      setCommissions(comms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      setLoadingData(false)
    }, (err) => {
      console.error('Error fetching commissions:', err)
      setLoadingData(false)
    })

    return () => unsubscribe()
  }, [user])

  const handleStatusChange = async (commission: Commission, newStatus: Commission['status']) => {
    try {
      await updateDoc(doc(db, 'commissions', commission.id), {
        status: newStatus
      })

      // Notify the other party about status change
      const isArtistAction = user?.role === 'artist'

      if (isArtistAction) {
        // Artist changing status - notify buyer
        const statusMessages: Record<string, { title: string; message: string }> = {
          in_progress: {
            title: 'Commission Accepted',
            message: `${commission.artistName} has accepted your commission request: "${commission.title}"`
          },
          declined: {
            title: 'Commission Declined',
            message: `${commission.artistName} has declined your commission request: "${commission.title}"`
          },
          completed: {
            title: 'Commission Completed',
            message: `${commission.artistName} has marked your commission as complete: "${commission.title}"`
          }
        }

        if (statusMessages[newStatus]) {
          await addDoc(collection(db, 'notifications'), {
            userId: commission.buyerId,
            type: `commission_${newStatus}`,
            title: statusMessages[newStatus].title,
            message: statusMessages[newStatus].message,
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      } else {
        // Buyer changing status (cancelling) - notify artist
        if (newStatus === 'cancelled') {
          await addDoc(collection(db, 'notifications'), {
            userId: commission.artistId,
            type: 'commission_cancelled',
            title: 'Commission Cancelled',
            message: `${commission.buyerName} has cancelled their commission request: "${commission.title}"`,
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      }
    } catch (err) {
      console.error('Error updating commission status:', err)
    }
  }

  const handleSendReply = async (commission: Commission) => {
    if (!user || !replyText.trim()) return

    setSendingReply(true)
    try {
      const newMessage: Message = {
        senderId: user.id,
        senderName: user.name,
        message: replyText.trim(),
        timestamp: new Date().toISOString()
      }

      await updateDoc(doc(db, 'commissions', commission.id), {
        messages: arrayUnion(newMessage)
      })

      // Notify the other party about new message
      const isArtist = user.role === 'artist'
      const recipientId = isArtist ? commission.buyerId : commission.artistId
      const recipientName = isArtist ? commission.buyerName : commission.artistName

      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        type: 'commission_message',
        title: 'New Commission Message',
        message: `${user.name} sent a message regarding: "${commission.title}"`,
        read: false,
        createdAt: new Date().toISOString(),
      })

      setReplyText('')
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  if (loading || loadingData) return <div className="p-6">Loading...</div>
  if (!user) return <div className="p-6">Please log in to view commissions.</div>

  const isArtist = user.role === 'artist'

  const filteredCommissions = statusFilter === 'all'
    ? commissions
    : commissions.filter(c => c.status === statusFilter)

  const statusCounts = {
    all: commissions.length,
    pending: commissions.filter(c => c.status === 'pending').length,
    in_progress: commissions.filter(c => c.status === 'in_progress').length,
    completed: commissions.filter(c => c.status === 'completed').length,
    declined: commissions.filter(c => c.status === 'declined').length,
    cancelled: commissions.filter(c => c.status === 'cancelled').length,
  }

  const getStatusColor = (status: Commission['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'declined': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold dark:text-hf-text">Commission Requests</h2>
          <p className="text-gray-600 dark:text-hf-muted">
            {isArtist ? 'Manage commission requests from buyers' : 'Track your commission requests'}
          </p>
        </div>
        {!isArtist && (
          <Link to="/artists" className="text-blue-600 hover:underline">
            Browse Artists
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'in_progress', 'completed', 'declined', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${statusFilter === status
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({statusCounts[status]})
          </button>
        ))}
      </div>

      {/* Commission List */}
      {filteredCommissions.length === 0 ? (
        <div className="text-center py-12 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
          <p className="text-gray-600 dark:text-hf-muted">
            {statusFilter === 'all'
              ? (isArtist ? 'No commission requests yet.' : 'You haven\'t made any commission requests yet.')
              : `No ${statusFilter.replace('_', ' ')} commissions.`
            }
          </p>
          {!isArtist && statusFilter === 'all' && (
            <Link to="/artists" className="text-blue-600 hover:underline mt-2 inline-block">
              Browse artists open for commissions
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCommissions.map((commission) => (
            <div
              key={commission.id}
              className="border dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:bg-hf-card"
                onClick={() => setExpandedId(expandedId === commission.id ? null : commission.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium dark:text-hf-text">{commission.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(commission.status)}`}>
                        {commission.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-hf-muted mt-1">
                      {isArtist ? `From: ${commission.buyerName}` : `To: ${commission.artistName}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">
                      {new Date(commission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {commission.messages.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-hf-muted">
                        {commission.messages.length} message{commission.messages.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === commission.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === commission.id && (
                <div className="border-t dark:border-gray-800 bg-gray-50 dark:bg-hf-card p-4" onClick={(e) => e.stopPropagation()}>
                  {/* Budget and Deadline */}
                  {(commission.budget || commission.deadline) && (
                    <div className="mb-4 grid grid-cols-2 gap-4 bg-white dark:bg-gray-800/50 p-3 rounded border dark:border-gray-800">
                      {commission.budget && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-hf-muted uppercase">Budget</h4>
                          <p className="font-medium text-green-700">${commission.budget}</p>
                        </div>
                      )}
                      {commission.deadline && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 dark:text-hf-muted uppercase">Deadline</h4>
                          <p className="font-medium">{new Date(commission.deadline).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Original Request */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium dark:text-hf-text text-gray-700 mb-2">Original Request:</h4>
                    <p className="text-sm text-gray-600 dark:text-hf-muted whitespace-pre-wrap bg-white dark:bg-gray-800/50 p-3 rounded border dark:border-gray-800">
                      {commission.description}
                    </p>
                  </div>

                  {/* Status Actions (for artists) */}
                  {isArtist && commission.status !== 'completed' && commission.status !== 'declined' && commission.status !== 'cancelled' && (
                    <div className="mb-4 flex gap-2">
                      {commission.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(commission, 'in_progress')}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleStatusChange(commission, 'declined')}
                            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {commission.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusChange(commission, 'completed')}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status Actions (for buyers) */}
                  {!isArtist && (commission.status === 'pending' || commission.status === 'in_progress') && (
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this commission request?')) {
                            handleStatusChange(commission, 'cancelled')
                          }
                        }}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Cancel Commission
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  {commission.messages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium dark:text-hf-text text-gray-700 mb-2">Conversation:</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {commission.messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded text-sm ${msg.senderId === user.id
                              ? 'bg-blue-100 dark:bg-blue-900/30 dark:text-hf-text ml-8'
                              : 'bg-white dark:bg-gray-800 dark:text-hf-text border dark:border-gray-700 mr-8'
                              }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-xs">{msg.senderName}</span>
                              <span className="text-xs text-gray-500 dark:text-hf-muted">
                                {new Date(msg.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Input (only if not completed/declined/cancelled) */}
                  {commission.status !== 'completed' && commission.status !== 'declined' && commission.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your message..."
                        rows={2}
                        className="flex-1 p-2 border dark:border-gray-700 rounded text-sm resize-none dark:bg-gray-800 dark:text-hf-text"
                        disabled={sendingReply}
                      />
                      <button
                        onClick={() => handleSendReply(commission)}
                        disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 self-end"
                      >
                        {sendingReply ? '...' : 'Send'}
                      </button>
                    </div>
                  )}

                  {/* View Artist Profile (for buyers) */}
                  {!isArtist && (
                    <div className="mt-4 pt-4 border-t dark:border-gray-800">
                      <Link
                        to={`/artist/${commission.artistId}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View {commission.artistName}'s Profile
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
