"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import JobDetail from "./JobDetail"

export interface JobResult {
  title: string
  company: string
  location: string
  apply_url: string
  source: string
  description?: string
  score?: number
  title_match_score?: number
}

interface JobCardProps {
  job: JobResult
  index: number
}

export default function JobCard({ job, index }: JobCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 24, delay: index * 0.03 }}
    >
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm font-semibold">{job.title}</CardTitle>
              <p className="text-xs text-ink-3">
                {job.company}
                {job.location && <> &middot; {job.location}</>}
              </p>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-2">
              {job.score !== undefined && (
                <Badge variant={job.score >= 0.7 ? "success" : "warning"}>
                  {Math.round(job.score * 100)}%
                </Badge>
              )}
              <Badge variant="secondary">{job.source}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"
            >
              Apply <ExternalLink className="h-3 w-3" />
            </a>
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"
            >
              {expanded ? "Hide details" : "View details"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        </CardContent>
        {expanded && (
          <div className="border-t-2 border-border">
            <JobDetail job={job} />
          </div>
        )}
      </Card>
    </motion.div>
  )
}
