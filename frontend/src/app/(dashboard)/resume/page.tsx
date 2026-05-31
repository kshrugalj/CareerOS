"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, CheckCircle, Loader2 } from "lucide-react"
import { TerminalPage } from "@/components/layout/TerminalPage"
import { BASE_URL } from "@/lib/api"

interface ParsedProfile {
  skills: string[]
  titles: string[]
  experience_years: number
  education: string[]
  preferences: {
    desired_titles: string[]
    remote: boolean
    locations: string[]
    min_salary: number
  }
}

export default function ResumePage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState("")
  const [profile, setProfile] = useState<ParsedProfile | null>(null)
  const [resumeText, setResumeText] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { auth } = await import("@/lib/firebase")
        const token = auth ? await auth.currentUser?.getIdToken() : null
        const res = await fetch(`${BASE_URL}/api/resume`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setProfile(data.profile)
          setResumeText(data.resume_text)
        }
      } catch { /* no saved resume */ }
      setInitialLoading(false)
    }
    fetchProfile()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      if (f.size > 10 * 1024 * 1024) {
        setError("File too large (max 10MB)")
        return
      }
      setFile(f)
      setError("")
      setProfile(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const token = await (await import("@/lib/firebase")).auth?.currentUser?.getIdToken()
      const res = await fetch(`${BASE_URL}/api/resume/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }))
        throw new Error(err.detail)
      }
      const data = await res.json()
      setProfile(data.profile)
      setResumeText(data.resume_text)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <TerminalPage command="./profile --edit" description="Upload and manage your resume">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        </div>
      </TerminalPage>
    )
  }

  return (
    <TerminalPage
      command="./profile --edit"
      description="Upload your resume for AI-powered job matching"
    >
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center border-2 border-dashed border-border p-12 transition-colors hover:border-ink"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-3 h-8 w-8 text-ink-3" />
            <p className="text-sm font-medium text-ink-2">
              {file ? file.name : "Click to select a resume"}
            </p>
            <p className="mt-1 font-mono text-xs text-ink-3">PDF or DOCX, max 10MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {file && !profile && (
            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpload} disabled={loading}>
                {loading ? "Parsing..." : "Upload & Parse"}
              </Button>
            </div>
          )}
          {error && <p className="mt-3 font-mono text-xs text-danger">{error}</p>}
        </CardContent>
      </Card>

      {profile && (
        <div className="space-y-4">
          <div className="animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-ink" />
                  <CardTitle>Parsed Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Experience</p>
                  <p className="text-sm text-ink-2">{profile.experience_years} years</p>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Titles</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.titles.map((t) => (
                      <Badge key={t} variant="outline">{t}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Education</p>
                  <div className="space-y-1">
                    {profile.education.map((e) => (
                      <p key={e} className="text-sm text-ink-2">{e}</p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">Preferences</p>
                  <div className="space-y-1 text-sm text-ink-2">
                    <p>Remote: {profile.preferences.remote ? "Yes" : "No"}</p>
                    {profile.preferences.locations.length > 0 && (
                      <p>Locations: {profile.preferences.locations.join(", ")}</p>
                    )}
                    {profile.preferences.min_salary > 0 && (
                      <p>Min Salary: ${profile.preferences.min_salary.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {resumeText && (
            <div className="animate-fade-in-up delay-200">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-ink-3" />
                    <CardTitle>Extracted Text</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs text-ink-3">
                    {resumeText}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </TerminalPage>
  )
}
