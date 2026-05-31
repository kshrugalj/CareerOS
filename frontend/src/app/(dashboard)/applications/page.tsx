"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Plus, X } from "lucide-react"
import { TerminalPage } from "@/components/layout/TerminalPage"

interface Application {
  id: string
  job_id: string
  status: string
  company?: string
  job_title?: string
  job_url?: string
  notes?: string
  last_updated?: string
}

const statuses = [
  "Saved", "Applying", "Applied", "Interview Scheduled", "Interviewing",
  "OA Received", "OA Completed", "Final Round", "Offer", "Rejected", "Withdrawn",
]

const statusColors: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "danger"> = {
  saved: "outline",
  applying: "secondary",
  applied: "default",
  oa_received: "secondary",
  oa_completed: "secondary",
  interview_scheduled: "warning",
  interviewing: "warning",
  final_round: "warning",
  offer: "success",
  rejected: "danger",
  withdrawn: "outline",
}

const columns = ["Saved", "Applying", "Applied", "Interviewing", "Offer", "Rejected"]

export default function ApplicationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ company: "", job_title: "", job_url: "", status: "Saved", notes: "" })
  const [submitting, setSubmitting] = useState(false)

  const fetchApps = () => {
    if (!user) return
    setLoading(true)
    api.get<{ applications: Application[] }>(`/api/applications/?user_id=${user.uid}`)
      .then((data) => setApplications(data.applications))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchApps() }, [user])

  const handleCreate = async () => {
    if (!formData.company || !formData.job_title) return
    setSubmitting(true)
    try {
      await api.post("/api/applications/", {
        job_title: formData.job_title,
        company: formData.company,
        job_url: formData.job_url,
        status: formData.status,
        notes: formData.notes,
      })
      setShowForm(false)
      setFormData({ company: "", job_title: "", job_url: "", status: "Saved", notes: "" })
      fetchApps()
    } catch {
      // silent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TerminalPage
      command="./pipeline --list"
      description={`${applications.length} total applications`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div />
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Application
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 animate-scale-in">
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                <span className="text-accent">{">"}</span> new application
              </h3>
              <button onClick={() => setShowForm(false)} className="text-ink-3 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="Company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              <Input placeholder="Job Title" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} />
              <Input placeholder="Job URL (optional)" value={formData.job_url} onChange={(e) => setFormData({ ...formData, job_url: e.target.value })} />
              <select
                className="flex h-10 w-full border-2 border-border bg-paper px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:border-ink"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting || !formData.company || !formData.job_title}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
            loading pipeline...
          </div>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const colApps = applications.filter((a) => a.status.toLowerCase() === col.toLowerCase())
            return (
              <div key={col} className="min-w-[280px] flex-shrink-0">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink-2">{col}</h3>
                  <span className="bg-paper-3 px-2 py-0.5 font-mono text-xs text-ink-3">{colApps.length}</span>
                </div>
                <div className="space-y-2">
                  {colApps.map((app) => (
                    <Card
                      key={app.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/applications/${app.id}`)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-sm font-semibold">{app.job_title || app.job_id}</CardTitle>
                            <p className="text-xs text-ink-3">{app.company || "Unknown Company"}</p>
                          </div>
                          <Badge variant={statusColors[app.status.toLowerCase()] || "outline"}>
                            {app.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      {app.notes && (
                        <CardContent className="px-4 pb-3">
                          <p className="truncate text-xs text-ink-3">{app.notes}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                  {colApps.length === 0 && (
                    <div className="border-2 border-dashed border-border p-6 text-center">
                      <p className="font-mono text-xs text-ink-3">empty</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </TerminalPage>
  )
}
