<div align="center">

# CareerOS

**AI-powered direct-company job search & application tracking**

[![Live Demo](https://img.shields.io/badge/demo-careeros--sand.vercel.app-0057FF?style=for-the-badge)](https://careeros-sand.vercel.app/)
[![Backend](https://img.shields.io/badge/api-FastAPI_v3.0-009688?style=for-the-badge)](https://careeros-sand.vercel.app/)
[![Frontend](https://img.shields.io/badge/frontend-Next.js_16-000000?style=for-the-badge)](https://careeros-sand.vercel.app/)

Your job search deserves better than the open web. CareerOS discovers roles directly from company career pages, matches them to your resume with AI, and tracks your entire pipeline — in one dashboard.

</div>

---

## ✨ Features

- **AI Job Discovery** — Search 111+ company career boards (Greenhouse, Lever, Ashby) plus 39 Jobhive ATS parquet sources in parallel
- **Resume Parsing** — Upload your resume and extract structured skills/experience via Groq LLM (`llama-3.3-70b-versatile`)
- **AI Job Matching** — Groq-powered semantic matching scores every discovered job against your profile
- **Cover Letter Generation** — One-click AI cover letters tailored to each role
- **Application Tracking** — Full pipeline management from discovered → applied → interviewing → offer
- **Analytics Dashboard** — Visual stats on your search progress and pipeline health

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Radix UI |
| **Backend** | FastAPI 0.115, Python 3.11, Uvicorn, httpx, Pydantic v2 |
| **Auth & DB** | Firebase Auth + Firestore |
| **AI/LLM** | Groq API (`llama-3.3-70b-versatile`) |
| **Job Data** | Jobhive parquet datasets, Greenhouse/Lever/Ashby APIs |
| **Deployment** | Frontend on Vercel, Backend on Render (Docker) |

## 🎨 Design

**Terminal-Asymmetric** — dark sidebar (machine) / light content (output), monochrome palette with accent blue.

- **Fonts**: Syne (display), Archivo (body), JetBrains Mono (code/terminal)
- **Effects**: Noise textures, scanlines, Framer Motion spring reveals, glow-pulse animations
- **Layout**: Asymmetric split — terminal panel left, content right

## 📁 Project Structure

```
CareerOS/
├── frontend/               # Next.js 16 app
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   ├── components/     # UI & layout components
│   │   ├── contexts/       # Auth context
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # API client, Firebase, utils
│   └── public/             # Static assets
├── backend/                # FastAPI server
│   ├── api/
│   │   ├── main.py         # App entrypoint + lifespan
│   │   └── routes/         # REST endpoints
│   ├── jobs/               # ATS connectors & discovery
│   ├── services/           # Jobhive client, cache, Groq
│   ├── models/             # Pydantic models
│   └── utils/              # Firebase, helpers
├── docs/                   # Internal specs & plans
├── render.yaml             # Render deployment config
└── AGENTS.md               # AI agent instructions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Firebase project with Auth & Firestore enabled
- Groq API key ([console.groq.com](https://console.groq.com))

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Firebase and Groq credentials

# Start the server (port 8204)
uvicorn api.main:app --port 8204 --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local with:
#   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
#   NEXT_PUBLIC_API_URL=http://localhost:8204

# Start dev server (port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/jobs/discover` | AI-powered job search (skills + title → scored jobs) |
| `GET` | `/api/jobs/discover` | Paginated job list from Firestore |
| `POST` | `/api/jobs/match` | Resume-vs-job matching via Groq |
| `POST` | `/api/resume/upload` | Parse resume via Groq LLM |
| `POST` | `/api/applications` | Create/update applications |
| `GET` | `/api/analytics/dashboard` | Pipeline analytics & stats |
| `POST` | `/api/cover-letters/generate` | AI cover letter generation |
| `GET` | `/health` | Health check |

## 🔍 Search Pipeline

1. **ATS parallel fetch** — 111 companies fetched concurrently via `asyncio.create_task` with `Semaphore(8)`
2. **Jobhive parquet search** — 39 ATS slices, 4 concurrent via `Semaphore(4)`, keyword matching
3. **Groq batch title matching** — chunks of 200, with rate-limit handling and keyword fallback
4. **US location filter** — Heuristic-based location filtering
5. **Score threshold** — `MIN_TITLE_SCORE = 0.3`

**Performance**: ~32–38s total (warm cache)

## 📄 License

This project is private and not licensed for redistribution.

---

<div align="center">

**[Live App](https://careeros-sand.vercel.app/)** · **[Report Bug](https://github.com/kshrugalj/CareerOS/issues)**

Built with ☕ and AI

</div>
