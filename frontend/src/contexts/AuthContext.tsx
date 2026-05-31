"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { BASE_URL } from "@/lib/api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    const timer = setTimeout(() => setLoading(false), 1000)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
      clearTimeout(timer)
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const login = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized")
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase not initialized")
    await createUserWithEmailAndPassword(auth, email, password)
    await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid: auth.currentUser?.uid,
        email,
        name: email.split("@")[0],
      }),
    })
  }

  const loginWithGoogle = async () => {
    if (!auth) throw new Error("Firebase not initialized")
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const logout = async () => {
    if (!auth) throw new Error("Firebase not initialized")
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
