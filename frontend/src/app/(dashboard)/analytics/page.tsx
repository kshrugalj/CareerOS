"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { TerminalPage } from "@/components/layout/TerminalPage"

interface Metrics {
  total_applications: number
  active_applications: number
  interviews: number
  offers: number
  rejections: number
  response_rate: number
  interview_rate: number
  offer_rate: number
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    if (user) {
      api.get<Metrics>(`/api/analytics/metrics?user_id=${user.uid}`)
        .then(setMetrics)
        .catch(() => {})
    }
  }, [user])

  const rateCards = [
    { label: "Response Rate", value: metrics?.response_rate ?? 0, format: "percent" },
    { label: "Interview Rate", value: metrics?.interview_rate ?? 0, format: "percent" },
    { label: "Offer Rate", value: metrics?.offer_rate ?? 0, format: "percent" },
  ]

  const countCards = [
    { label: "Total", value: metrics?.total_applications ?? 0 },
    { label: "Active", value: metrics?.active_applications ?? 0 },
    { label: "Interviews", value: metrics?.interviews ?? 0 },
    { label: "Offers", value: metrics?.offers ?? 0 },
    { label: "Rejections", value: metrics?.rejections ?? 0 },
  ]

  return (
    <TerminalPage
      command="./metrics --summary"
      description="Track your job search performance"
    >
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {rateCards.map((card, i) => (
          <div key={card.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold tracking-tight text-ink">
                  {(card.value * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        {countCards.map((card, i) => (
          <div key={card.label} className="animate-fade-in-up" style={{ animationDelay: `${(i + 3) * 100}ms` }}>
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tracking-tight text-ink">{card.value}</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </TerminalPage>
  )
}
