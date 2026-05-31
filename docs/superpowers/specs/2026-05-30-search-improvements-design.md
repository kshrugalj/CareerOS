# Search Improvements — Design Spec

## Problem

Three gaps in the current job search experience:
1. Title matching is purely string-based ("intern" won't match "Summer Associate" or "Graduate Trainee")
2. Minimal filtering (only country toggle)
3. No way to view job descriptions or skills match in-app

## Solution Overview

Four sections, all under Approach A (Smart Search):

1. Groq-based semantic title matching
2. Filter bar (company, source, remote)
3. Expandable job description + skills match
4. Firestore caching + progress bar

---

## Section 1: Semantic Title Matching

### What changes
Replace `_title_match_score()` in `backend/api/routes/jobs.py` with a Groq batch classification call.

### Flow
1. After ATS connectors + jobhive fetch jobs and they're deduplicated (same as today)
2. Collect all unique job titles from the results
3. Send a single Groq request with the user's desired title + all fetched titles
4. Groq returns `[{title, match: "yes"|"partial"|"no", score: 0.0-1.0, reason: ""}]`
5. Jobs with `score < 0.3` are filtered out
6. Results sorted by `score` DESC (primary), `_keyword_score` DESC (secondary)

### Groq prompt
```
System: You are a job title matcher. Given a user's desired role and a list of
job titles, determine how well each title matches the user's intent. Consider
seniority level, domain, and role equivalence (e.g. "intern" matches "summer
associate", "senior engineer" matches "staff engineer").

User query: {desired_title}
Job titles: [{title}, {title}, ...]

Return JSON array:
[{"title": "...", "match": "yes"|"partial"|"no", "score": 0.0-1.0, "reason": "..."}]
```

### Fallback
If Groq call fails (timeout, rate limit, parse error), fall back to the current keyword-based `_title_match_score`.

### Config
- Model: `llama-3.3-70b-versatile` (same as existing)
- Timeout: 5s per call
- Batch size: up to 200 titles per call (should cover all results)

---

## Section 2: Filter Bar

All client-side — no backend changes.

### Filters
| Filter | Type | Source |
|--------|------|--------|
| Company | Multi-select dropdown | `job.company` from results |
| Source | Toggle (All / ATS / Jobhive) | `job.source` prefix |
| Remote | Toggle (All / Remote / Hybrid / On-site) | Parsed from `job.location` |

### Remote detection
- "Remote" or "100% remote" or "Remote - US" → Remote
- "Hybrid" or "Hybrid - NYC" → Hybrid
- "San Francisco, CA" or "London, UK" → On-site
- Empty location → Remote (default for remote-first companies)

### UI placement
Horizontal bar between the search inputs and the results grid. Active filters show as removable badges.

### No backend changes needed
All data is already in the front-end results array. Filtering is purely `Array.filter()`.

---

## Section 3: Job Description + Skills Match

### Expandable card
- Each job card gets a "View details" button
- Clicking expands the card inline (no navigation, no modal)
- Expanded view shows:
  - Formatted job description (sanitized HTML → clean text)
  - Skills match box (from existing `POST /api/jobs/match`)
  - Sticky Apply button at bottom

### Skills match flow
1. When user expands a card, frontend calls `POST /api/jobs/match` with `{job_title, job_description, resume_text}`
2. Backend runs Groq deep match (existing `JobMatcher` endpoint)
3. Returns `{score, matched_skills[], missing_skills[], reasoning}`
4. Display: matched skills as green badges, missing skills as gray badges
5. Cache the result per job in component state (no re-fetch if collapsed/expanded again)

### Edge cases
- No resume uploaded → show "Upload a resume to see skills match" with a link to /resume
- Match call fails → show "Skills match unavailable" and just display the description
- Description is HTML → strip tags, render as plain text with preserved line breaks

---

## Section 4: Caching + Progress

### Firestore cache
- Collection: `cache/ats_jobs/{company}_{source}`
- Document fields: `{jobs: Job[], fetched_at: timestamp}`
- TTL: 15 minutes (check `fetched_at` before using)
- Cache is **global** (shared across all users)
- On cache hit: return cached jobs immediately, optionally refresh in background
- On cache miss: fetch live, store in cache, return

### Cache key
Format: `{company_slug}_{source}` (e.g., `stripe_greenhouse`, `airbnb_ashby`)

### Progress bar
- Frontend shows a progress indicator during the first (uncached) search
- Backend returns progress via a WebSocket or polling endpoint? No — simpler approach:
  - Backend collects results progressively and flushes to the response
  - Use SSE (Server-Sent Events) or streaming response
  - Frontend renders results as they arrive
- **Simpler MVP**: just show "Fetching jobs from 90+ companies..." with a spinner and the count of results found so far. After the search completes, render all results at once. The caching improvement makes subsequent searches fast anyway.

### Cache warmup
On server start, trigger background cache refresh for all 90 companies. This ensures the first user search is fast too.

---

## Files Changed

### Backend
- `backend/api/routes/jobs.py` — replace `_title_match_score()` with Groq batch call, add fallback
- `backend/services/groq_client.py` — add `batch_match_titles()` function
- `backend/services/cache.py` — new file: Firestore cache with TTL
- `backend/jobs/ats_connectors.py` — integrate cache check before fetch, store after fetch
- `backend/api/main.py` — trigger cache warmup on startup

### Frontend
- `frontend/src/app/(dashboard)/jobs/page.tsx` — add filter bar, expandable cards, skills match section
- `frontend/src/components/jobs/FilterBar.tsx` — new component
- `frontend/src/components/jobs/JobCard.tsx` — new component (extract card from page)
- `frontend/src/components/jobs/JobDetail.tsx` — new component (expandable detail view)
- `frontend/src/components/ui/badge.tsx` — already exists, used for skills badges
