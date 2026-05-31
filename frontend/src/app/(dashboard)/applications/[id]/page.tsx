"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { ArrowLeft, Trash2 } from "lucide-react"
import { TerminalPage } from "@/components/layout/TerminalPage"

interface TimelineEvent {
  old_status: string
  new_status: string
  timestamp: string
}

interface Application {
  id: string
  job_id: string
  company?: string
  role?: string
  status: string
  notes: string
  recruiter_name: string
  recruiter_email: string
  applied_at?: string
  last_updated?: string
  timeline: TimelineEvent[]
}

const statuses = [
  "Saved", "Applying", "Applied", "OA Received", "OA Completed",
  "Interview Scheduled", "Interviewing", "Final Round", "Offer", "Rejected", "Withdrawn",
]

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [app, setApp] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState("")
  const [recruiterName, setRecruiterName] = useState("")
  const [recruiterEmail, setRecruiterEmail] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  useEffect(() => {
    api.get<Application>(`/api/applications/${id}`)
      .then((data) => {
        setApp(data)
        setNotes(data.notes || "")
        setRecruiterName(data.recruiter_name || "")
        setRecruiterEmail(data.recruiter_email || "")
        setSelectedStatus(data.status)
      })
      .catch(() => setError("Failed to load application"))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.patch<Application>(`/api/applications/${id}`, {
        notes: notes || undefined,
        recruiter_name: recruiterName || undefined,
        recruiter_email: recruiterEmail || undefined,
        status: selectedStatus !== app?.status ? selectedStatus : undefined,
      })
      setApp(updated)
    } catch {
      setError("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this application?")) return
    try {
      await api.delete(`/api/applications/${id}`)
      router.push("/applications")
    } catch {
      setError("Failed to delete")
    }
  }

  if (loading) {
    return (
      <TerminalPage command="./pipeline --inspect" description={`Inspecting application ${id.slice(0, 8)}...`}>
        <div className="flex h-64 items-center justify-center">
          <div className="flex items-center gap-2 font-mono text-xs text-ink-3">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
            loading...
          </div>
        </div>
      </TerminalPage>
    )
  }

  if (error && !app) {
    return (
      <TerminalPage command="./pipeline --inspect" description={`Failed to load ${id.slice(0, 8)}`}>
        <div className="border-2 border-danger/20 bg-danger/10 p-6 text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/applications")}>
            Back to Applications
          </Button>
        </div>
      </TerminalPage>
    )
  }

  if (!app) return null

  return (
    <TerminalPage
      command={`./pipeline --inspect --id=${id.slice(0, 8)}`}
      description={`${app.company || "Unknown"} / ${app.role || app.job_id}`}
    >
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/applications")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1" />
        <Badge
          variant={
            app.status === "Offer" ? "success" :
            app.status === "Rejected" ? "danger" :
            app.status === "Interviewing" || app.status === "Interview Scheduled" ? "warning" :
            "default"
          }
        >
          {app.status}
        </Badge>
      </div>

      {error && (
        <div className="mb-4 border-2 border-danger/20 bg-danger/10 px-4 py-2">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Job ID</p>
                  <p className="mt-1 text-sm text-ink-2">{app.job_id}</p>
                </div>
                {app.applied_at && (
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Applied At</p>
                    <p className="mt-1 text-sm text-ink-2">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {app.last_updated && (
                  <div>
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Last Updated</p>
                    <p className="mt-1 text-sm text-ink-2">
                      {new Date(app.last_updated).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes &amp; Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Notes</p>
                <textarea
                  className="flex h-24 w-full border-2 border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-ink"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Recruiter Name</p>
                  <Input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="e.g. Jane Smith" />
                </div>
                <div>
                  <p className="mb-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Recruiter Email</p>
                  <Input value={recruiterEmail} onChange={(e) => setRecruiterEmail(e.target.value)} placeholder="e.g. jane@company.com" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={`border-2 px-3 py-1 text-xs font-medium transition-all duration-150 ${
                      selectedStatus === s
                        ? "border-ink bg-ink text-paper"
                        : "border-border bg-paper text-ink-3 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" onClick={handleDelete} className="text-danger hover:border-danger hover:text-danger">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {app.timeline.length === 0 ? (
                <p className="font-mono text-xs text-ink-3">No events yet</p>
              ) : (
                <div className="space-y-4">
                  {[...app.timeline].reverse().map((event, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="h-2 w-2 border-2 border-ink-3" />
                        {event.old_status ? (
                          <span className="text-ink-2">
                            <span className="text-ink-3">{event.old_status}</span>
                            {" → "}
                            <span className="font-medium text-ink">{event.new_status}</span>
                          </span>
                        ) : (
                          <span className="text-ink-2">Created as <span className="font-medium text-ink">{event.new_status}</span></span>
                        )}
                      </div>
                      <p className="ml-4 mt-0.5 font-mono text-xs text-ink-3">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TerminalPage>
  )
}
