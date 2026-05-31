"use client"

import { useState, useEffect } from "react"
import { CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2, AlertCircle, UserRound } from "lucide-react"
import { api } from "@/lib/api"
import type { JobResult } from "./JobCard"

interface SkillsMatch {
  score: number
  matched_skills: string[]
  missing_skills: string[]
  reasoning: string
}

export default function JobDetail({ job }: { job: JobResult }) {
  const [skillsMatch, setSkillsMatch] = useState<SkillsMatch | null>(null)
  const [matchLoading, setMatchLoading] = useState(false)
  const [matchError, setMatchError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchMatch = async () => {
      setMatchLoading(true)
      setMatchError(false)
      try {
        const result = await api.post<SkillsMatch>("/api/jobs/match", {
          job_title: job.title,
          job_description: job.description || "",
        })
        if (!cancelled) setSkillsMatch(result)
      } catch {
        if (!cancelled) setMatchError(true)
      } finally {
        if (!cancelled) setMatchLoading(false)
      }
    }
    fetchMatch()
    return () => {
      cancelled = true
    }
  }, [job.title, job.description])

  const description = job.description
    ? job.description
        .replace(/<[^>]*>/g, "")
        .replace(/&[^;]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : ""

  return (
    <CardContent className="space-y-4 px-4 pb-4 pt-3">
      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          Description
        </p>
        {description ? (
          <p className="line-clamp-[8] whitespace-pre-wrap text-xs leading-relaxed text-ink-2">
            {description}
          </p>
        ) : (
          <p className="text-xs italic text-ink-3">No description available</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          Skills Match
        </p>
        {matchLoading ? (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing...
          </div>
        ) : matchError ? (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <AlertCircle className="h-3 w-3" />
            Skills match unavailable
          </div>
        ) : skillsMatch ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {skillsMatch.matched_skills.map((s) => (
                <Badge key={s} variant="success">
                  {s}
                </Badge>
              ))}
              {skillsMatch.missing_skills.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                {Math.round(skillsMatch.score * 100)}%
              </span>
              <span className="font-mono text-[10px] text-ink-3">match score</span>
            </div>
            {skillsMatch.reasoning && (
              <p className="text-xs italic text-ink-3">{skillsMatch.reasoning}</p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <UserRound className="h-3 w-3" />
            Upload a resume on the Resume page to see skills match
          </div>
        )}
      </div>

      <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
        <Button className="w-full">
          Apply on {job.company} <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </a>
    </CardContent>
  )
}
