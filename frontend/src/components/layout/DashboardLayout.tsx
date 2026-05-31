"use client"

import { useAuth } from "@/contexts/AuthContext"
import { Sidebar } from "./Sidebar"
import { useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-3 font-mono text-xs text-ink-3">
          <span className="inline-block h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
          loading
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="scanline flex h-screen">
      <Sidebar />
      <main className="relative flex-1 overflow-auto bg-paper-2 bg-[radial-gradient(oklch(0%_0_0_/_0.02)_1px,transparent_1px)] bg-[length:24px_24px]">
        {children}
      </main>
    </div>
  )
}
