import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'

type Ticket = {
  id: string
  userId: string
  userEmail: string
  userName: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
  responses?: { message: string; from: string; createdAt: string }[]
}

export default function SupportPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchTickets = async () => {
      try {
        const q = query(
          collection(db, 'supportTickets'),
          where('userId', '==', user.id)
        )
        const snapshot = await getDocs(q)
        const ticketList: Ticket[] = []
        snapshot.forEach((doc) => {
          ticketList.push({ id: doc.id, ...doc.data() } as Ticket)
        })
        setTickets(ticketList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } catch (err) {
        console.error('Error fetching tickets:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [user?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('Please log in to submit a support ticket')
      return
    }

    if (!title.trim() || !description.trim()) {
      setError('Please fill in all fields')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const ticketData = {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        title: title.trim(),
        description: description.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        responses: [],
      }

      const docRef = await addDoc(collection(db, 'supportTickets'), ticketData)

      setTickets([{ id: docRef.id, ...ticketData } as Ticket, ...tickets])
      setTitle('')
      setDescription('')
      setSuccess('Your support ticket has been submitted. We\'ll get back to you soon!')
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const statusColors = {
    open: 'bg-red-100 text-red-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
  }

  const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
  }

  const handleReply = async (ticketId: string) => {
    if (!user || !replyMessage.trim()) return

    setReplying(true)
    try {
      const newResponse = {
        message: replyMessage.trim(),
        from: user.name,
        createdAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, 'supportTickets', ticketId), {
        responses: arrayUnion(newResponse),
      })

      // Update local state
      const updatedTickets = tickets.map(t => {
        if (t.id === ticketId) {
          return {
            ...t,
            responses: [...(t.responses || []), newResponse],
          }
        }
        return t
      })
      setTickets(updatedTickets)

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          responses: [...(selectedTicket.responses || []), newResponse],
        })
      }

      setReplyMessage('')
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setReplying(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-semibold dark:text-hf-text">Support</h2>
      <p className="text-gray-600 dark:text-hf-muted mt-1">Need help? Submit a support ticket and we'll assist you.</p>

      {/* Submit New Ticket */}
      <div className="mt-6 border dark:border dark:border-gray-700-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium dark:text-hf-text mb-4">Submit a New Ticket</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Issue Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your issue"
              className="w-full p-2 border dark:border dark:border-gray-700-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe your issue in detail..."
              rows={5}
              className="w-full p-2 border dark:border dark:border-gray-700-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          <button
            type="submit"
            disabled={submitting || !user}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>

          {!user && (
            <p className="text-sm text-gray-500 dark:text-hf-muted">Please log in to submit a support ticket.</p>
          )}
        </form>
      </div>

      {/* Active Tickets */}
      {user && (
        <div className="mt-8">
          <h3 className="text-lg font-medium dark:text-hf-text mb-4">Your Support Tickets</h3>
          {loading ? (
            <p className="text-gray-500 dark:text-hf-muted">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 border dark:border dark:border-gray-700-gray-700 rounded-lg bg-gray-50 dark:bg-hf-card">
              <p className="text-gray-600 dark:text-hf-muted">You haven't submitted any support tickets yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(selectedTicket?.id === ticket.id ? null : ticket)}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedTicket?.id === ticket.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium dark:text-hf-text">{ticket.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-hf-muted mt-1">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                  </div>

                  {selectedTicket?.id === ticket.id && (
                    <div className="mt-4 pt-4 border dark:border dark:border-gray-700-gray-700-t">
                      <p className="text-sm text-gray-700 dark:text-hf-text whitespace-pre-wrap">{ticket.description}</p>

                      {ticket.responses && ticket.responses.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Conversation:</p>
                          <div className="space-y-2">
                            {ticket.responses.map((resp, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded text-sm ${
                                  resp.from.includes('Support') ? 'bg-blue-50' : 'bg-gray-100'
                                }`}
                              >
                                <p className="text-gray-700 dark:text-hf-text">{resp.message}</p>
                                <p className="text-xs text-gray-500 dark:text-hf-muted mt-1">
                                  {resp.from} • {new Date(resp.createdAt).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {ticket.status === 'resolved' ? (
                        <p className="mt-3 text-sm text-green-600">This ticket has been resolved.</p>
                      ) : (
                        <div className="mt-4 pt-4 border dark:border dark:border-gray-700-gray-700-t" onClick={(e) => e.stopPropagation()}>
                          <label className="block text-sm font-medium mb-1">Reply to this ticket</label>
                          <textarea
                            value={selectedTicket?.id === ticket.id ? replyMessage : ''}
                            onChange={(e) => {
                              setSelectedTicket(ticket)
                              setReplyMessage(e.target.value)
                            }}
                            onFocus={() => setSelectedTicket(ticket)}
                            placeholder="Type your reply..."
                            rows={3}
                            className="w-full p-2 border dark:border dark:border-gray-700-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={replying}
                          />
                          <button
                            onClick={() => handleReply(ticket.id)}
                            disabled={replying || !replyMessage.trim() || selectedTicket?.id !== ticket.id}
                            className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {replying && selectedTicket?.id === ticket.id ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
