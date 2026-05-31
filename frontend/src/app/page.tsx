"use client"

import { useAuth } from "@/contexts/AuthContext"
import { LandingOption1 } from "@/app/page-option1"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import DashboardContent from "./dash-content"

export default function Home() {
  const { user, loading } = useAuth()

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

  if (!user) return <LandingOption1 />

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
