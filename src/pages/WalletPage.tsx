import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../context/auth'

type Transaction = {
  id: string
  type: 'deposit' | 'purchase' | 'sale' | 'auction_fee' | 'auction_sale' | 'commission'
  amount: number
  description: string
  createdAt: string
}

export default function WalletPage() {
  const { user, addFunds } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!user?.id) return

    const fetchTransactions = async () => {
      try {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', user.id)
        )
        const snapshot = await getDocs(q)
        const txns: Transaction[] = []
        snapshot.forEach((doc) => {
          txns.push({ id: doc.id, ...doc.data() } as Transaction)
        })
        setTransactions(txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
      } catch (err) {
        console.error('Error fetching transactions:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [user?.id])

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setDepositing(true)
    try {
      await addFunds(amount)

      // Record transaction
      const { addDoc } = await import('firebase/firestore')
      await addDoc(collection(db, 'transactions'), {
        userId: user?.id,
        type: 'deposit',
        amount,
        description: 'Funds deposited to wallet',
        createdAt: new Date().toISOString(),
      })

      setSuccess(`Successfully added $${amount.toFixed(2)} to your wallet!`)
      setDepositAmount('')

      // Refresh transactions
      const q = query(collection(db, 'transactions'), where('userId', '==', user?.id))
      const snapshot = await getDocs(q)
      const txns: Transaction[] = []
      snapshot.forEach((doc) => {
        txns.push({ id: doc.id, ...doc.data() } as Transaction)
      })
      setTransactions(txns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err: any) {
      setError(err.message || 'Failed to add funds')
    } finally {
      setDepositing(false)
    }
  }

  const quickDeposit = (amount: number) => {
    setDepositAmount(String(amount))
  }

  const getTransactionIcon = (type: string) => {
    return '$'
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-600'
    return 'text-red-600'
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-center text-gray-600 dark:text-hf-muted">Please log in to view your wallet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold dark:text-hf-text mb-6">My Wallet</h1>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
        <p className="text-sm opacity-80">Total Balance</p>
        <p className="text-4xl font-bold mt-1">${(user.balance || 0).toFixed(2)}</p>
        {(user.heldAmount || 0) > 0 && (
          <div className="mt-2 pt-2 border-t border-white/30">
            <div className="flex justify-between text-sm">
              <span className="opacity-80">Held in auction bids:</span>
              <span className="font-medium">-${(user.heldAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="opacity-80">Available to spend:</span>
              <span className="font-medium">${((user.balance || 0) - (user.heldAmount || 0)).toFixed(2)}</span>
            </div>
          </div>
        )}
        <p className="text-sm opacity-80 mt-2">{user.name} • {user.role}</p>
      </div>

      {/* Add Funds Section */}
      <div className="border dark:border-gray-700 rounded-lg p-6 mb-6 bg-white dark:bg-hf-card">
        <h2 className="text-lg font-semibold dark:text-hf-text mb-4">Add Funds</h2>

        <div className="flex gap-2 mb-4">
          {[25, 50, 100, 250, 500].map((amount) => (
            <button
              key={amount}
              onClick={() => quickDeposit(amount)}
              className="px-4 py-2 border dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 dark:text-hf-text text-sm transition-colors"
            >
              ${amount}
            </button>
          ))}
        </div>

        <form onSubmit={handleDeposit} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-hf-muted">$</span>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              min="1"
              step="0.01"
              className="w-full pl-7 pr-3 py-2 border dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-hf-text"
              disabled={depositing}
            />
          </div>
          <button
            type="submit"
            disabled={depositing || !depositAmount}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {depositing ? 'Processing...' : 'Add Funds'}
          </button>
        </form>

        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-2">{success}</p>}

        <p className="text-xs text-gray-500 dark:text-hf-muted mt-3">
          Note: This is a demo. No real payment processing occurs.
        </p>
      </div>

      {/* Fee Information */}
      <div className="border dark:border-gray-700 rounded-lg p-6 mb-6 bg-gray-50 dark:bg-hf-card">
        <h2 className="text-lg font-semibold dark:text-hf-text mb-3">Fee Structure</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-hf-muted">Auction Hosting Fee:</span>
            <span className="font-medium">$10.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-hf-muted">Sales Commission:</span>
            <span className="font-medium">15%</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-hf-muted mt-3">
          A $10 fee is charged when creating an auction. 15% commission is deducted from all artwork and auction sales.
        </p>
      </div>

      {/* Transaction History */}
      <div className="border dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-hf-card">
        <h2 className="text-lg font-semibold dark:text-hf-text mb-4">Transaction History</h2>

        {loading ? (
          <p className="text-gray-500 dark:text-hf-muted">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 dark:text-hf-muted">No transactions yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl dark:text-hf-text">{getTransactionIcon(txn.type)}</span>
                  <div>
                    <p className="font-medium dark:text-hf-text">{txn.description}</p>
                    <p className="text-xs text-gray-500 dark:text-hf-muted">
                      {new Date(txn.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className={`font-bold ${getTransactionColor(txn.type, txn.amount)}`}>
                  {txn.amount > 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
