import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { getRoleFromEmail, validateWhitelistedCredentials } from '../config/roleWhitelist'

type User = {
  id: string
  name: string
  email: string
  role: 'artist' | 'buyer' | 'csr' | 'admin'
  artistStatus?: 'pending' | 'approved' | 'rejected'
  balance: number
  heldAmount: number // Amount held for active auction bids
  purchasedArtwork?: Array<{
    auctionId: string
    artworkId: string
    title: string
    imageUrl: string
    artistId: string
    artistName: string
    price: number
    purchasedAt: string
  }>
  saleHistory?: Array<{
    auctionId: string
    artworkId: string
    title: string
    imageUrl: string
    buyerId: string
    buyerName: string
    salePrice: number
    earnings: number
    commission: number
    soldAt: string
  }>
  auctionHistory?: Array<{
    auctionId: string
    artworkId: string
    title: string
    imageUrl: string
    startingPrice: number
    finalPrice: number
    winnerId?: string
    winnerName?: string
    highestBidderId?: string | null
    highestBidderName?: string | null
    status: 'sold' | 'reserve_not_met' | 'no_bids'
    endedAt: string
  }>
}

type AuthContextType = {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (email: string, password: string, name: string, role: User['role']) => Promise<User>
  logout: () => Promise<void>
  addFunds: (amount: number) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let userUnsubscribe: (() => void) | null = null

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        // Real-time listener for user data (including balance)
        userUnsubscribe = onSnapshot(doc(db, 'users', fbUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User
            // Ensure balance and heldAmount exist
            setUser({ ...userData, balance: userData.balance ?? 0, heldAmount: userData.heldAmount ?? 0 })
          }
          setLoading(false)
        })
      } else {
        if (userUnsubscribe) userUnsubscribe()
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      unsubscribe()
      if (userUnsubscribe) userUnsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    // Validate credentials for whitelisted accounts
    if (!validateWhitelistedCredentials(email, password)) {
      throw new Error('Invalid credentials for this account')
    }

    const credential = await signInWithEmailAndPassword(auth, email, password)
    const userDocRef = doc(db, 'users', credential.user.uid)
    const userDoc = await getDoc(userDocRef)

    // Check if email is whitelisted for special roles
    const whitelistedRole = getRoleFromEmail(email)

    if (userDoc.exists()) {
      let userData = userDoc.data() as User
      // Update role if whitelisted and role differs
      if (whitelistedRole && userData.role !== whitelistedRole) {
        userData = { ...userData, role: whitelistedRole }
        await setDoc(userDocRef, userData)
      }
      setUser(userData)
      return userData
    } else {
      // Create user doc if it doesn't exist (for whitelisted users)
      const userData: User = {
        id: credential.user.uid,
        name: email.split('@')[0],
        email,
        role: whitelistedRole || 'buyer',
        balance: 0,
        heldAmount: 0,
      }
      await setDoc(userDocRef, userData)
      setUser(userData)
      return userData
    }
  }

  const register = async (
    email: string,
    password: string,
    name: string,
    role: User['role']
  ): Promise<User> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    // Check if email is whitelisted - override provided role if so
    const whitelistedRole = getRoleFromEmail(email)
    const finalRole = whitelistedRole || role

    const userData: User = {
      id: credential.user.uid,
      name,
      email,
      role: finalRole === 'artist' ? 'buyer' : finalRole, // Artists start as buyers until approved
      balance: 0,
      heldAmount: 0,
    }
    // Only add artistStatus if registering as artist
    if (finalRole === 'artist') {
      userData.artistStatus = 'pending'
    }
    await setDoc(doc(db, 'users', credential.user.uid), userData)

    // If registering as artist, also add to artist requests collection
    if (finalRole === 'artist') {
      await setDoc(doc(db, 'artistRequests', credential.user.uid), {
        userId: credential.user.uid,
        name,
        email,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      })
    }

    setUser(userData)
    return userData
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
  }

  const addFunds = async (amount: number) => {
    if (!user?.id) throw new Error('Must be logged in')
    if (amount <= 0) throw new Error('Amount must be positive')

    const newBalance = (user.balance || 0) + amount
    await updateDoc(doc(db, 'users', user.id), { balance: newBalance })
  }

  const refreshUser = async () => {
    if (!firebaseUser) return
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) {
      const userData = userDoc.data() as User
      setUser({ ...userData, balance: userData.balance ?? 0 })
    }
  }

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, login, register, logout, addFunds, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}