"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface Filters {
  companies: string[]
  source: "all" | "ats" | "jobhive"
  remote: "all" | "remote" | "hybrid" | "onsite"
}

interface FilterBarProps {
  results: Array<{ company: string; source: string; location: string }>
  filters: Filters
  onFiltersChange: (filters: Filters) => void
}

function detectRemote(location: string): "remote" | "hybrid" | "onsite" {
  const loc = location.toLowerCase()
  if (loc.includes("remote")) return "remote"
  if (loc.includes("hybrid")) return "hybrid"
  return "onsite"
}

export default function FilterBar({ results, filters, onFiltersChange }: FilterBarProps) {
  const companyOptions = useMemo(() => {
    const companies = new Set(results.map((j) => j.company))
    return Array.from(companies).sort()
  }, [results])

  const toggleCompany = (company: string) => {
    const next = filters.companies.includes(company)
      ? filters.companies.filter((c) => c !== company)
      : [...filters.companies, company]
    onFiltersChange({ ...filters, companies: next })
  }

  return (
    <div className="mb-4 animate-fade-in-up">
      {(filters.companies.length > 0 || filters.source !== "all" || filters.remote !== "all") && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {filters.companies.map((c) => (
            <button
              key={c}
              onClick={() => toggleCompany(c)}
              className="border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[10px] text-paper"
            >
              {c} ×
            </button>
          ))}
          {filters.source !== "all" && (
            <button
              onClick={() => onFiltersChange({ ...filters, source: "all" })}
              className="border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[10px] text-paper"
            >
              {filters.source} ×
            </button>
          )}
          {filters.remote !== "all" && (
            <button
              onClick={() => onFiltersChange({ ...filters, remote: "all" })}
              className="border-2 border-ink bg-ink px-2 py-0.5 font-mono text-[10px] text-paper"
            >
              {filters.remote} ×
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <select
            multiple
            value={filters.companies}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value)
              onFiltersChange({ ...filters, companies: selected })
            }}
            className="h-24 w-40 border-2 border-border bg-paper px-2 py-1 font-mono text-[11px] text-ink outline-none focus:border-ink"
          >
            {companyOptions.map((c) => (
              <option key={c} value={c} className="py-0.5">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Source</span>
          <div className="flex gap-1">
            {(["all", "ats", "jobhive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onFiltersChange({ ...filters, source: s })}
                className={cn(
                  "border-2 px-3 py-1 text-[11px] font-medium transition-all duration-150",
                  filters.source === s
                    ? "border-ink bg-ink text-paper"
                    : "border-border bg-paper text-ink-3 hover:border-ink hover:text-ink"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Remote</span>
          <div className="flex gap-1">
            {(["all", "remote", "hybrid", "onsite"] as const).map((r) => (
              <button
                key={r}
                onClick={() => onFiltersChange({ ...filters, remote: r })}
                className={cn(
                  "border-2 px-3 py-1 text-[11px] font-medium transition-all duration-150",
                  filters.remote === r
                    ? "border-ink bg-ink text-paper"
                    : "border-border bg-paper text-ink-3 hover:border-ink hover:text-ink"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
