import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

type Notification = {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

export default function Nav() {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)

  useEffect(() => {
    if (!user) {
      setNotifications([])
      return
    }

    // Real-time listener for notifications
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = []
      snapshot.forEach((docSnap) => {
        notifs.push({ id: docSnap.id, ...docSnap.data() } as Notification)
      })
      setNotifications(notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    }, (err) => {
      console.error('Error fetching notifications:', err)
    })

    return () => unsubscribe()
  }, [user])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true })
      setNotifications(notifications.map(n => n.id === notifId ? { ...n, read: true } : n))
    } catch (err) {
      console.error('Error marking notification read:', err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read)
      await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })))
      setNotifications(notifications.map(n => ({ ...n, read: true })))
    } catch (err) {
      console.error('Error marking all as read:', err)
    }
  }

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      return savedTheme === 'dark'
    }
    return false
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  return (
    <header className="border-b dark:border-gray-800 dark:bg-hf-bg transition-colors duration-200">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-2xl font-bold dark:text-hf-text">ArtX</Link>
          {user && (
            <span className="text-sm text-gray-600 dark:text-hf-muted">Welcome, {user.name}</span>
          )}
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/marketplace" className="dark:text-hf-text hover:text-purple-600 dark:hover:text-hf-yellow">Marketplace</Link>
          <Link to="/artists" className="dark:text-hf-text hover:text-purple-600 dark:hover:text-hf-yellow">Artists</Link>
          <Link to="/auctions" className="text-purple-600 font-medium dark:text-hf-yellow">Auctions</Link>
          <Link to="/support" className="dark:text-hf-text hover:text-purple-600 dark:hover:text-hf-yellow">Support</Link>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-red-600 font-medium dark:text-red-400">Admin</Link>
              )}
              {user.role === 'csr' && (
                <Link to="/csr" className="text-blue-600 font-medium dark:text-blue-400">CSR Dashboard</Link>
              )}
              <Link to="/dashboard" className="dark:text-hf-text hover:text-purple-600 dark:hover:text-hf-yellow">Dashboard</Link>
              {user.role !== 'csr' && user.role !== 'admin' && (
                <Link to="/commissions" className="dark:text-hf-text hover:text-purple-600 dark:hover:text-hf-yellow">Commissions</Link>
              )}

              {/* Wallet Balance */}
              <Link
                to="/wallet"
                className="flex items-center gap-1 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors dark:bg-green-900/20 dark:border-green-800"
              >
                <span className="text-green-600 font-medium dark:text-green-400">${(user.balance || 0).toFixed(2)}</span>
              </Link>

              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 dark:text-hf-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-hf-card border dark:border-gray-700 rounded-lg shadow-lg z-50">
                    <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
                      <span className="font-medium dark:text-hf-text">Notifications</span>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-hf-muted text-sm">
                          No notifications
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            onClick={() => markAsRead(notif.id)}
                          >
                            <p className="text-sm font-medium dark:text-hf-text">{notif.title}</p>
                            <p className="text-xs text-gray-600 dark:text-hf-muted mt-1 line-clamp-2">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 5 && (
                      <Link
                        to="/dashboard#notifications"
                        className="block p-2 text-center text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setShowNotifDropdown(false)}
                      >
                        View all notifications
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-hf-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <button onClick={logout} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 dark:text-hf-text hover:bg-gray-200 dark:hover:bg-gray-700">Sign out</button>
            </>
          ) : (
            <>
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-hf-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <Link to="/login" className="px-3 py-1 rounded bg-primary text-white hover:bg-purple-700">Sign in</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}