# AGENTS.md — CareerOS v3.0

## Goal
AI-powered direct-company job search + application tracking. FastAPI backend, Next.js 16 frontend, Firebase Auth + Firestore.

## Design
- **Terminal-Asymmetric** — dark sidebar (machine) / light content (output), monochrome + accent blue
- Syne + Archivo + JetBrains Mono fonts, noise textures, scanlines, Framer Motion spring reveals

## Backend (port 8204)
```sh
cd /Users/kshrugal/Desktop/CareerOS/backend
nohup uvicorn api.main:app --port 8204 > /tmp/server.log 2>&1 &
```

### Key Endpoints
- `POST /api/jobs/discover` — main search (skills + title → scored jobs)
- `GET /api/jobs/discover` — paginated job list from Firestore
- `POST /api/jobs/match` — Groq resume-vs-job matching  
- `POST /api/resume/upload` — parse resume via Groq (`llama-3.3-70b-versatile`)
- `POST /api/applications` — CRUD for applications
- `GET /api/analytics/dashboard` — stats
- `POST /api/cover-letters/generate` — Groq cover letter generation

### Search Pipeline (`POST /api/jobs/discover`)
1. **ATS parallel fetch** — 111 companies via `asyncio.create_task` + `asyncio.wait(timeout=5|25s)`, `Semaphore(8)`
2. **Jobhive parquet search** — 39 ATS slices, 4 concurrent via `Semaphore(4)`, `pd.read_parquet` + Python keyword matching via `df.itertuples()`
3. **Groq batch title matching** — chunks of 200, 10s timeout, rate-limit handling with class-level `_rate_limited_until`
4. **Keyword fallback** — `_title_match_score()` when Groq rate-limited
5. **US location filter** — `_is_us_location()` heuristic
6. **Score threshold** — `MIN_TITLE_SCORE = 0.3`

### Search Performance
- **~32-38s** total (warm cache). Breakdown:
  - Jobhive: ~28-35s (39 parquet reads, 4 concurrent, Python keyword loop)
  - ATS: 5s timeout (partial results during jobhive)
  - Groq: ~1s (429 is fast; skip remaining chunks)
  - Processing: ~0.5s

### Bottlenecks Found & Fixed
- **111 concurrent ATS cache reads** → `Semaphore(8)` in `fetch_company`
- **CPU GIL contention from pandas regex** → `df.itertuples()` with Python `any(kw in title)` loop instead of `str.contains`
- **Jobhive warmup competing with search I/O** → one `_io_sem` gates everything (disk I/O + filter + iteration)
- **ProcessPoolExecutor deadlock** → subprocess imports orphan the Firestore client; reverted to `ThreadPoolExecutor` (GIL acceptable at 30-35s)

### Jobhive Caching
- Full parquet files cached at `/tmp/jobhive_cache/{ats}.parquet` (24h TTL)
- Recent-filtered (90-day) files at `/tmp/jobhive_cache/{ats}_recent.parquet`
- Warmup: sequential download + recent-filter + parquet write (~172s fresh, ~45s with cache)
- Column projection: `pd.read_parquet(path, columns=NEEDED_COLS)` — 8 columns instead of 20+

### ATS Coverage
- 111 companies (Greenhouse, Lever, Ashby)
- `Semaphore(10)` warmup → ~15-55s
- Firestore cache TTL: 15 min, payload truncated to ≤900 KB
- Partial results via `asyncio.wait(timeout=5|25)`

### Groq Status
- **Rate-limited** (100K TPD free tier exhausted). Falls back to keyword matching.
- Upgrade to Dev Tier at `https://console.groq.com/settings/billing`
- Rate-limit cooldown tracked via class variable `_rate_limited_until`, parsed from 429 response body

### Database
- Firebase project: `careeros-1721f`
- Test user: `test2@careeros.dev` / `Test123!`
- Auth domain: `careeros-1721f.firebaseapp.com`
- Singleton via `get_firebase_db()` with failure caching

### Memory
- RSS: ~570-732 MB (stable; warmup peak higher when processing 442 MB workday parquet)
- No in-memory DataFrame cache (tried, caused 1.4 GB peak)

## Frontend (port 3000)
```sh
cd /Users/kshrugal/Desktop/CareerOS/frontend
npm run dev
```

- `BASE_URL = "http://localhost:8204"` in `src/lib/api.ts`
- Firebase init client-side only (`typeof window !== "undefined"`)
- `AuthContext.tsx` has 1s fallback timer for loading-forever guard

## Known Issues
1. Startup warmup makes `/health` unresponsive (RSS spikes to 1.5+ GB)
2. BambooHR slugs undecodable in `_normalize_company()` (no hyphens)
3. Some Greenhouse boards return 404 (outdated company list)
4. Response size ~8.7 MB for 2700+ jobs (includes full descriptions)

## Next Steps
1. Deploy backend (Render / fly.io) + frontend (Vercel)
2. Upgrade Groq to Dev Tier for reliable semantic matching
3. Add SmartRecruiters live ATS connector
4. Trim response size: omit `description` from search results, fetch on-demand
5. Shard jobhive into smaller slices or pre-index titles for faster search
