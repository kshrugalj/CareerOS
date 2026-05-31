# Search Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve job search with semantic title matching (Groq), client-side filters, expandable job description + skills match, and Firestore caching.

**Architecture:** Backend changes to support cache layer and Groq batch title matching; frontend components for filters and expandable job detail. No new dependencies.

**Tech Stack:** FastAPI + Firestore + Groq (backend), Next.js + framer-motion + Tailwind (frontend)

---

## File Structure

### New files
- `backend/services/cache.py` — Firestore cache with TTL for ATS job results
- `frontend/src/components/jobs/FilterBar.tsx` — company/source/remote filter controls
- `frontend/src/components/jobs/JobCard.tsx` — extracted job card with expand/collapse
- `frontend/src/components/jobs/JobDetail.tsx` — expanded job description + skills match

### Modified files
- `backend/services/groq_client.py` — add `batch_match_titles()` method
- `backend/api/routes/jobs.py` — replace `_title_match_score` with Groq batch call
- `backend/jobs/ats_connectors.py` — integrate cache check before fetch, store after
- `backend/api/main.py` — add cache warmup on startup
- `frontend/src/app/(dashboard)/jobs/page.tsx` — use new components, add filter integration

---

### Task 1: Firestore cache service

**Files:**
- Create: `backend/services/cache.py`

- [ ] **Step 1: Create `backend/services/cache.py`**

```python
import logging
from datetime import datetime, timedelta, timezone

from utils.firebase import get_firebase_db

logger = logging.getLogger(__name__)

CACHE_TTL_MINUTES = 15
CACHE_COLLECTION = "cache_ats_jobs"


def _cache_key(company: str, provider: str) -> str:
    key = f"{company.lower().replace(' ', '_')}_{provider.lower()}"
    key = "".join(c for c in key if c.isalnum() or c in "_")
    return key


async def get_cached_jobs(company: str, provider: str) -> list[dict] | None:
    try:
        db = get_firebase_db()
        doc = db.collection(CACHE_COLLECTION).document(_cache_key(company, provider)).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        fetched_at = data.get("fetched_at")
        if not fetched_at:
            return None
        if isinstance(fetched_at, str):
            fetched_at = datetime.fromisoformat(fetched_at)
        if datetime.now(timezone.utc) - fetched_at > timedelta(minutes=CACHE_TTL_MINUTES):
            logger.info("Cache expired for %s (%s)", company, provider)
            return None
        logger.info("Cache HIT for %s (%s) — %d jobs", company, provider, len(data.get("jobs", [])))
        return data.get("jobs", [])
    except Exception as e:
        logger.warning("Cache read error for %s (%s): %s", company, provider, e)
        return None


async def set_cached_jobs(company: str, provider: str, jobs: list[dict]) -> None:
    try:
        db = get_firebase_db()
        db.collection(CACHE_COLLECTION).document(_cache_key(company, provider)).set({
            "company": company,
            "provider": provider,
            "jobs": jobs,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Cached %d jobs for %s (%s)", len(jobs), company, provider)
    except Exception as e:
        logger.warning("Cache write error for %s (%s): %s", company, provider, e)
```

- [ ] **Step 2: Verify imports work**

Run: `cd backend && python -c "from services.cache import get_cached_jobs, set_cached_jobs; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/services/cache.py
git commit -m "feat: add Firestore cache service for ATS jobs"
```

---

### Task 2: Integrate cache into ATS connectors

**Files:**
- Modify: `backend/jobs/ats_connectors.py`

- [ ] **Step 1: Add cache import and modify `discover_for_skills`**

Add import at the top of `ats_connectors.py` (after line 9):

```python
from services.cache import get_cached_jobs, set_cached_jobs
```

Replace the `fetch_company` inner function (lines 223-232) with cache-aware version:

```python
        async def fetch_company(name, provider, token):
            cached = await get_cached_jobs(name, provider)
            if cached is not None:
                return [Job(**j) for j in cached]

            connector = self._build_connector(name, provider, token)
            async with semaphore:
                try:
                    jobs = await connector.fetch_jobs()
                    logger.info("Fetched %d jobs from %s (%s)", len(jobs), name, provider)
                    await set_cached_jobs(name, provider, [j.model_dump(mode="json") for j in jobs])
                    return jobs
                except Exception as e:
                    logger.error("Failed to fetch from %s: %s", name, e)
                    return []
```

- [ ] **Step 2: Verify the file is syntactically valid**

Run: `cd backend && python -c "from jobs.ats_connectors import JobDiscoveryService; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/jobs/ats_connectors.py
git commit -m "feat: integrate ATS cache into job discovery"
```

---

### Task 3: Cache warmup on startup

**Files:**
- Modify: `backend/api/main.py`

- [ ] **Step 1: Add cache warmup after jobhive warmup**

In `main.py`, add import at top (after line 11):

```python
from jobs.ats_connectors import CURATED_COMPANIES
from services.cache import get_cached_jobs, set_cached_jobs
```

Add warmup function after the `lifespan` function and before `app = FastAPI(...)`:

```python
async def warmup_ats_cache():
    """Prefetch and cache jobs from all ATS companies on startup."""
    logger.info("Starting ATS cache warmup for %d companies...", len(CURATED_COMPANIES))
    from jobs.ats_connectors import JobDiscoveryService
    discovery = JobDiscoveryService()
    for name, provider, token in CURATED_COMPANIES:
        cached = await get_cached_jobs(name, provider)
        if cached is not None:
            continue
        connector = discovery._build_connector(name, provider, token)
        try:
            jobs = await connector.fetch_jobs()
            await set_cached_jobs(name, provider, [j.model_dump(mode="json") for j in jobs])
            logger.info("Warmup: cached %d jobs from %s (%s)", len(jobs), name, provider)
        except Exception as e:
            logger.warning("Warmup failed for %s: %s", name, e)
```

Replace the yield section in lifespan (around line 31):

```python
    asyncio.create_task(jobhive_client.start_warmup())
    asyncio.create_task(warmup_ats_cache())
    logger.info("Cache warmups started in background")

    yield
```

- [ ] **Step 2: Verify imports**

Run: `cd backend && python -c "from api.main import app; print('OK')"`
Expected: `OK` (may have warnings about Firebase, ignore those)

- [ ] **Step 3: Commit**

```bash
git add backend/api/main.py
git commit -m "feat: add ATS cache warmup on startup"
```

---

### Task 4: Groq batch title matcher

**Files:**
- Modify: `backend/services/groq_client.py`

- [ ] **Step 1: Add `batch_match_titles()` method**

Add after `structured_output()` method (after line 54):

```python
    def batch_match_titles(
        self, desired_title: str, job_titles: list[str]
    ) -> list[dict]:
        """Batch classify job titles against a desired title using Groq.

        Returns list of {title, score (0.0-1.0), match, reason}.
        Falls back to keyword matching on error.
        """
        if not job_titles:
            return []

        system_prompt = (
            "You are a job title matcher. Given a user's desired role and a list of "
            "job titles, determine how relevant each title is to the user's intent. "
            "Consider seniority level, domain, and role equivalence. "
            "Examples: 'intern' matches 'Summer Associate' and 'Graduate Trainee'; "
            "'senior engineer' matches 'Staff Engineer' and 'Lead Developer'; "
            "'product manager' matches 'Product Owner' and 'Technical Product Manager'. "
            "Return a JSON array of objects with keys: title, score (0.0-1.0), "
            "match ('yes'|'partial'|'no'), reason."
        )

        user_prompt = f"Desired title: {desired_title}\nJob titles: {job_titles}"

        try:
            result = self.structured_output(system_prompt, user_prompt)
            if isinstance(result, list):
                return result
            return []
        except Exception as e:
            logger.warning("Groq batch title matching failed: %s — falling back to keyword", e)
            return []
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python -c "from services.groq_client import GroqClient; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/services/groq_client.py
git commit -m "feat: add Groq batch title matcher"
```

---

### Task 4.5: Auto-fetch resume_text in match endpoint

**Files:**
- Modify: `backend/api/routes/jobs.py`

- [ ] **Step 1: Modify `match_job` to fetch resume from Firestore**

Replace the `match_job` function (lines 164-174) with:

```python
@router.post("/match", response_model=JobMatchResponse)
async def match_job(
    request: JobMatchRequest,
    user_id: str = Depends(verify_firebase_token),
):
    # Auto-fetch resume from Firestore if available
    resume_text = request.resume_text
    if not resume_text:
        try:
            db = get_firebase_db()
            doc = db.collection("candidates").document(user_id).get()
            if doc.exists:
                resume_text = doc.to_dict().get("resume_text", "")
        except Exception:
            pass

    result = matcher.match(
        job_title=request.job_title,
        job_description=request.job_description,
        resume_text=resume_text,
    )
    return result
```

- [ ] **Step 2: Make `resume_text` optional in `JobMatchRequest`**

In `backend/models/job.py`, change `resume_text: str` to `resume_text: str = ""` (line 25):

```python
class JobMatchRequest(BaseModel):
    job_title: str
    job_description: str
    resume_text: str = ""
```

- [ ] **Step 3: Verify syntax**

Run: `cd backend && python -c "from api.routes.jobs import router; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/api/routes/jobs.py backend/models/job.py
git commit -m "feat: auto-fetch resume_text in match endpoint, make resume_text optional"
```

---

### Task 5: Replace `_title_match_score` with Groq batch in jobs endpoint

**Files:**
- Modify: `backend/api/routes/jobs.py`

- [ ] **Step 1: Add Groq import and modify `search_jobs`**

Add import at the top (after line 12):

```python
from services.groq_client import GroqClient
```

Replace the `search_jobs` function (lines 100-138) with:

```python
groq_client = GroqClient()


@router.post("/discover")
async def search_jobs(
    request: JobSearchRequest,
    user_id: str = Depends(verify_firebase_token),
):
    jobs = await discovery.discover_for_skills(request.skills, request.title)
    desired_title = request.title.strip().lower()

    # Optionally score against user's resume if they have one
    db = get_firebase_db()
    candidate_doc = db.collection("candidates").document(user_id).get()
    resume_text = candidate_doc.to_dict().get("resume_text", "") if candidate_doc.exists else ""

    # Groq batch title matching
    job_titles = [j.title for j in jobs]
    groq_scores = {}
    if desired_title and job_titles:
        try:
            matches = groq_client.batch_match_titles(desired_title, job_titles)
            for m in matches:
                groq_scores[m["title"]] = m.get("score", 0.0)
        except Exception as e:
            logger.warning("Groq matching failed: %s — using keyword fallback", e)

    result_jobs = []
    for job in jobs:
        job_dict = job.model_dump(mode="json")
        # Use Groq score, fall back to keyword title match
        if groq_scores:
            job_dict["title_match_score"] = groq_scores.get(job.title, 0.0)
        else:
            job_dict["title_match_score"] = _title_match_score(desired_title, job.title)
        if resume_text:
            job_dict["score"] = _keyword_score(job.title, job.description, resume_text)
        result_jobs.append(job_dict)

    # Filter out jobs with no title relevance
    MIN_TITLE_SCORE = 0.3
    result_jobs = [j for j in result_jobs if j["title_match_score"] >= MIN_TITLE_SCORE]

    # Sort: title match first, then keyword score
    result_jobs.sort(
        key=lambda j: (j["title_match_score"], j.get("score", 0)),
        reverse=True,
    )

    logger.info(
        "Search: title=%r skills=%s → %d jobs after Groq title filter (from %d raw)",
        desired_title,
        request.skills,
        len(result_jobs),
        len(jobs),
    )

    return {"jobs": result_jobs, "total": len(result_jobs)}
```

- [ ] **Step 2: Verify syntax**

Run: `cd backend && python -c "from api.routes.jobs import router; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/api/routes/jobs.py
git commit -m "feat: replace string title matching with Groq batch semantic matching"
```

---

### Task 6: Frontend FilterBar component

**Files:**
- Create: `frontend/src/components/jobs/FilterBar.tsx`

- [ ] **Step 1: Create `FilterBar.tsx`**

```tsx
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
        {/* Company multi-select */}
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

        {/* Source toggle */}
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

        {/* Remote toggle */}
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx next build 2>&1 | tail -5`
Expected: Build succeeds (no type errors)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/jobs/FilterBar.tsx
git commit -m "feat: add FilterBar component with company, source, remote filters"
```

---

### Task 7: Frontend JobCard + JobDetail components (with skills match)

**Files:**
- Create: `frontend/src/components/jobs/JobCard.tsx`
- Create: `frontend/src/components/jobs/JobDetail.tsx`

- [ ] **Step 1: Create `JobCard.tsx`**

```tsx
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import JobDetail from "./JobDetail"
import { api } from "@/lib/api"

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
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{job.title}</CardTitle>
              <p className="text-xs text-ink-3">
                {job.company}
                {job.location && <> &middot; {job.location}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
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
```

- [ ] **Step 2: Create `JobDetail.tsx`**

```tsx
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
    return () => { cancelled = true }
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
      {/* Description */}
      <div>
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          Description
        </p>
        {description ? (
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-2 line-clamp-[8]">
            {description}
          </p>
        ) : (
          <p className="text-xs italic text-ink-3">No description available</p>
        )}
      </div>

      {/* Skills Match */}
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
                <Badge key={s} variant="success">{s}</Badge>
              ))}
              {skillsMatch.missing_skills.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
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

      {/* Apply button */}
      <a
        href={job.apply_url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button className="w-full">
          Apply on {job.company} <ExternalLink className="ml-2 h-3 w-3" />
        </Button>
      </a>
    </CardContent>
  )
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx next build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/jobs/JobCard.tsx frontend/src/components/jobs/JobDetail.tsx
git commit -m "feat: add JobCard and JobDetail components with skills match"
```

---

### Task 8: Integrate components into jobs page

**Files:**
- Modify: `frontend/src/app/(dashboard)/jobs/page.tsx`

- [ ] **Step 1: Rewrite `jobs/page.tsx` to use new components**

Replace the entire file content with:

```tsx
"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { Search, Loader2, AlertCircle, MapPin } from "lucide-react"
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

function toCountry(location: string): string {
  const knownCountries = [
    "United States", "USA", "US", "Canada", "United Kingdom", "UK",
    "Germany", "France", "Australia", "India", "Singapore", "Japan",
    "Netherlands", "Spain", "Ireland", "Sweden", "Denmark", "Norway",
    "Brazil", "Mexico", "Switzerland", "Italy", "Poland", "South Korea",
  ]
  const loc = location.toLowerCase()
  if (loc.includes("remote")) return "Remote"
  for (const c of knownCountries) {
    if (loc.includes(c.toLowerCase())) return c === "USA" || c === "US" ? "United States" : c
  }
  return "Other"
}

export default function JobsPage() {
  const { user } = useAuth()
  const [skills, setSkills] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [results, setResults] = useState<JobResult[]>([])
  const [error, setError] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("All")
  const [filters, setFilters] = useState({
    companies: [] as string[],
    source: "all" as "all" | "ats" | "jobhive",
    remote: "all" as "all" | "remote" | "hybrid" | "onsite",
  })

  function detectRemote(location: string): "remote" | "hybrid" | "onsite" {
    const loc = location.toLowerCase()
    if (loc.includes("remote")) return "remote"
    if (loc.includes("hybrid")) return "hybrid"
    return "onsite"
  }

  const countryFilters = useMemo(() => {
    const countries = new Set(results.map((j) => toCountry(j.location)))
    return ["All", ...Array.from(countries).sort()]
  }, [results])

  const filteredResults = useMemo(() => {
    let filtered = results

    // Country filter
    if (selectedCountry !== "All") {
      filtered = filtered.filter((j) => toCountry(j.location) === selectedCountry)
    }

    // Company filter
    if (filters.companies.length > 0) {
      filtered = filtered.filter((j) => filters.companies.includes(j.company))
    }

    // Source filter
    if (filters.source !== "all") {
      filtered = filtered.filter((j) => {
        if (filters.source === "ats") return j.source === "greenhouse" || j.source === "lever" || j.source === "ashby"
        return j.source.startsWith("jobhive")
      })
    }

    // Remote filter
    if (filters.remote !== "all") {
      filtered = filtered.filter((j) => detectRemote(j.location) === filters.remote)
    }

    return filtered
  }, [results, selectedCountry, filters])

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<{ profile: ParsedProfile }>("/api/resume")
        if (data) {
          if (data.profile.skills.length > 0) {
            setSkills(data.profile.skills.join(", "))
          }
          const preferredTitle = data.profile.preferences.desired_titles?.[0] || data.profile.titles?.[0] || ""
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
    setSelectedCountry("All")
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
          <div className="mb-4 animate-fade-in-up">
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              <MapPin className="h-3 w-3" />
              Country
            </div>
            <div className="flex flex-wrap gap-2">
              {countryFilters.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  className={`border-2 px-3 py-1 text-xs font-medium transition-all duration-150 ${
                    selectedCountry === c
                      ? "border-ink bg-ink text-paper"
                      : "border-border bg-paper text-ink-3 hover:border-ink hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <FilterBar
            results={results}
            filters={filters}
            onFiltersChange={setFilters}
          />

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
```

- [ ] **Step 2: Verify compilation**

Run: `cd frontend && npx next build 2>&1 | tail -10`
Expected: Build succeeds without errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/(dashboard)/jobs/page.tsx
git commit -m "feat: integrate FilterBar, JobCard, JobDetail into jobs page"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Groq-based semantic title matching | Task 4 (client method) + Task 5 (integration) |
| Fallback to keyword matching on Groq failure | Task 5 (try/except with `_title_match_score`) |
| Client-side filter bar (company, source, remote) | Task 6 (FilterBar) + Task 8 (integration) |
| Expandable job description | Task 7 (JobDetail) |
| Skills match via `/api/jobs/match` | Task 7 (JobDetail) |
| Firestore ATS cache with 15-min TTL | Task 1 (cache service) + Task 2 (integration) |
| Cache warmup on startup | Task 3 (main.py) |
