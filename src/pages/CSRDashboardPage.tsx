import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/auth'
import { Navigate } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../lib/firebase'

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

export default function CSRDashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tickets'>('dashboard')
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all')

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'supportTickets'))
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
  }, [])

  if (authLoading) {
    return <div className="p-6 text-center dark:text-hf-text">Loading...</div>
  }

  if (!user || (user.role !== 'csr' && user.role !== 'admin')) {
    return <Navigate to="/" replace />
  }

  const updateTicketStatus = async (ticketId: string, status: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), { status })
      setTickets(tickets.map(t =>
        t.id === ticketId ? { ...t, status } : t
      ))
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status })
      }
    } catch (err) {
      console.error('Error updating ticket status:', err)
    }
  }

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !response.trim()) return

    setSending(true)
    try {
      const newResponse = {
        message: response.trim(),
        from: `${user.name} (Support)`,
        createdAt: new Date().toISOString(),
      }

      await updateDoc(doc(db, 'supportTickets', selectedTicket.id), {
        responses: arrayUnion(newResponse),
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status,
      })

      const updatedTicket = {
        ...selectedTicket,
        responses: [...(selectedTicket.responses || []), newResponse],
        status: selectedTicket.status === 'open' ? 'in_progress' as const : selectedTicket.status,
      }

      setTickets(tickets.map(t =>
        t.id === selectedTicket.id ? updatedTicket : t
      ))
      setSelectedTicket(updatedTicket)
      setResponse('')
    } catch (err) {
      console.error('Error sending response:', err)
    } finally {
      setSending(false)
    }
  }

  const statusColors = {
    open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  const filteredTickets = ticketFilter === 'all'
    ? tickets
    : tickets.filter(t => t.status === ticketFilter)

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length

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
      {id === 'tickets' && openCount > 0 && (
        <span className="ml-auto bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs py-0.5 px-2 rounded-full">
          {openCount}
        </span>
      )}
    </button>
  )

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 dark:bg-hf-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-hf-card border-r dark:border-gray-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Support Console</h2>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <SidebarItem
            id="dashboard"
            label="Dashboard"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          />
          <SidebarItem
            id="tickets"
            label="Tickets"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          />
        </nav>
        <div className="p-4 border-t dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-medium dark:text-hf-text">Support</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">CSR Agent</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold dark:text-hf-text">Dashboard Overview</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                  onClick={() => { setTicketFilter('all'); setActiveTab('tickets') }}
                  className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-blue-500 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tickets</p>
                  <p className="text-3xl font-bold mt-2 dark:text-hf-text">{tickets.length}</p>
                </div>
                <div
                  onClick={() => { setTicketFilter('open'); setActiveTab('tickets') }}
                  className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-red-500 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Tickets</p>
                  <p className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">{openCount}</p>
                  <div className="mt-4 text-xs text-red-600 dark:text-red-400">
                    Requires attention
                  </div>
                </div>
                <div
                  onClick={() => { setTicketFilter('in_progress'); setActiveTab('tickets') }}
                  className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-yellow-500 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600 dark:text-yellow-400">{inProgressCount}</p>
                </div>
                <div
                  onClick={() => { setTicketFilter('resolved'); setActiveTab('tickets') }}
                  className="bg-white dark:bg-hf-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer hover:border-green-500 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</p>
                  <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">{resolvedCount}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tickets View */}
          {activeTab === 'tickets' && (
            <div className="h-[calc(100vh-120px)] flex gap-6">
              {/* Ticket List */}
              <div className="w-1/3 flex flex-col bg-white dark:bg-hf-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-800">
                  <h2 className="font-semibold dark:text-hf-text mb-4">Tickets</h2>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['all', 'open', 'in_progress', 'resolved'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setTicketFilter(status)}
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${ticketFilter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                      >
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {loading ? (
                    <p className="text-center text-gray-500 dark:text-hf-muted py-4">Loading...</p>
                  ) : filteredTickets.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-hf-muted py-4">No tickets found.</p>
                  ) : (
                    filteredTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedTicket?.id === ticket.id
                          ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${statusColors[ticket.status]}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-medium text-sm dark:text-hf-text truncate">{ticket.title}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticket.userEmail}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="flex-1 bg-white dark:bg-hf-card rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
                {selectedTicket ? (
                  <>
                    <div className="p-6 border-b dark:border-gray-800">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold dark:text-hf-text">{selectedTicket.title}</h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[selectedTicket.status]}`}>
                            {selectedTicket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as Ticket['status'])}
                          className="text-sm border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-hf-text"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-900 dark:text-hf-text">{selectedTicket.userName}</span>
                        <span>&lt;{selectedTicket.userEmail}&gt;</span>
                        <span>•</span>
                        <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Original Request */}
                      <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border dark:border-gray-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>

                      {/* Conversation */}
                      {selectedTicket.responses?.map((resp, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-1">
                            <span className="font-medium">{resp.from}</span>
                            <span>{new Date(resp.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-gray-800 dark:text-gray-200 border border-blue-100 dark:border-blue-800/50">
                            <p className="whitespace-pre-wrap">{resp.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                      <form onSubmit={handleRespond}>
                        <label className="block text-sm font-medium mb-2 dark:text-hf-text">Reply to Ticket</label>
                        <textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          className="w-full p-3 border dark:border-gray-700 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-hf-text resize-none"
                          rows={3}
                          placeholder="Type your response..."
                          disabled={sending}
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={sending || !response.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors"
                          >
                            {sending ? 'Sending...' : 'Send Response'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      <p>Select a ticket to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
