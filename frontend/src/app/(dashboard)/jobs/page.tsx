"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Search, Loader2, AlertCircle } from "lucide-react"
import { TerminalPage } from "@/components/layout/TerminalPage"
import FilterBar from "@/components/jobs/FilterBar"
import JobCard from "@/components/jobs/JobCard"
import type { JobResult } from "@/components/jobs/JobCard"

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

function detectRemote(location: string): "remote" | "hybrid" | "onsite" {
  const loc = location.toLowerCase()
  if (loc.includes("remote")) return "remote"
  if (loc.includes("hybrid")) return "hybrid"
  return "onsite"
}

export default function JobsPage() {
  const { user } = useAuth()
  const [skills, setSkills] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [results, setResults] = useState<JobResult[]>([])
  const [error, setError] = useState("")
  const [filters, setFilters] = useState({
    companies: [] as string[],
    source: "all" as "all" | "ats" | "jobhive",
    remote: "all" as "all" | "remote" | "hybrid" | "onsite",
  })

  const filteredResults = useMemo(() => {
    let filtered = results

    if (filters.companies.length > 0) {
      filtered = filtered.filter((j) => filters.companies.includes(j.company))
    }

    if (filters.source !== "all") {
      filtered = filtered.filter((j) => {
        if (filters.source === "ats")
          return j.source === "greenhouse" || j.source === "lever" || j.source === "ashby"
        return j.source.startsWith("jobhive")
      })
    }

    if (filters.remote !== "all") {
      filtered = filtered.filter((j) => detectRemote(j.location) === filters.remote)
    }

    return filtered
  }, [results, filters])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<{ profile: ParsedProfile }>("/api/resume")
        if (data) {
          if (data.profile.skills.length > 0) {
            setSkills(data.profile.skills.join(", "))
          }
          const preferredTitle =
            data.profile.preferences.desired_titles?.[0] || data.profile.titles?.[0] || ""
          if (preferredTitle) {
            setTitle(preferredTitle)
          }
        }
      } catch {
        /* no saved resume */
      } finally {
        setInitialLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSearch = async () => {
    if (!skills.trim()) {
      setError("Enter at least one skill")
      return
    }
    setLoading(true)
    setError("")
    setFilters({ companies: [], source: "all", remote: "all" })
    try {
      const data = await api.post<{ jobs: JobResult[] }>("/api/jobs/discover", {
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        title: title.trim() || "software engineer",
      })
      setResults(data.jobs || [])
      if (data.jobs?.length === 0) {
        setError("No jobs found. Try different skills or a broader title.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <TerminalPage command="./discover --query" description="Find and match jobs to your resume">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        </div>
      </TerminalPage>
    )
  }

  return (
    <TerminalPage
      command="./discover --query"
      description="Find and match jobs to your resume"
    >
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                className="pl-9"
                placeholder="e.g. Python, React, FastAPI"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Job title (e.g. software engineer)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching</>
              ) : (
                "Discover"
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 font-mono text-xs text-danger">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <>
          <FilterBar results={results} filters={filters} onFiltersChange={setFilters} />

          <div className="space-y-3">
            {filteredResults.map((job, i) => (
              <JobCard key={i} job={job} index={i} />
            ))}
          </div>
        </>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="border-2 border-dashed border-border p-12 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-ink-3" />
          <p className="font-mono text-xs text-ink-3">Enter skills above to discover jobs</p>
        </div>
      )}
    </TerminalPage>
  )
}
