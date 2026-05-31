"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { TerminalPage } from "@/components/layout/TerminalPage"
import { api } from "@/lib/api"

interface Metrics {
  total_applications: number
  active_applications: number
  interviews: number
  offers: number
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 24, delay: i * 0.08 },
  }),
}

export default function DashboardContent() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)

  useEffect(() => {
    if (user) {
      api
        .get<Metrics>(`/api/analytics/metrics?user_id=${user.uid}`)
        .then(setMetrics)
        .catch(() => {})
    }
  }, [user])

  const stats = [
    { label: "Total Applications", value: metrics?.total_applications ?? 0 },
    { label: "Active", value: metrics?.active_applications ?? 0 },
    { label: "Interviews", value: metrics?.interviews ?? 0 },
    { label: "Offers", value: metrics?.offers ?? 0 },
  ]

  return (
    <TerminalPage
      command="./dashboard --status"
      description="Pipeline overview"
    >
      <motion.div initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} variants={fadeUp} custom={i}>
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-display text-4xl font-bold tracking-tight text-ink">
                  {stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </TerminalPage>
  )
}
