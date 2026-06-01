# CareerOS — Frontend

Next.js 16 frontend for [CareerOS](https://careeros-sand.vercel.app/), an AI-powered job search and application tracking platform.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, TypeScript, Tailwind CSS 4, Radix UI primitives
- **Animation**: Framer Motion with spring physics
- **Auth**: Firebase Auth (client-side)
- **Fonts**: Syne, Archivo, JetBrains Mono (via `next/font/google`)

## Design System

**Terminal-Asymmetric** — dark sidebar acts as "the machine working," light content area acts as "the result."

- Monochrome palette with `#0057FF` accent blue
- Noise textures, scanline overlays, glow-pulse animations
- Asymmetric sidebar/content split layout

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
# Create .env.local with:
#   NEXT_PUBLIC_FIREBASE_API_KEY=...
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
#   NEXT_PUBLIC_API_URL=http://localhost:8204

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|---|---|
| `/` | Landing page (unauthenticated) / Dashboard (authenticated) |
| `/auth/login` | Sign in |
| `/auth/register` | Create account |
| `/jobs` | AI job discovery |
| `/applications` | Application pipeline tracker |
| `/resume` | Resume upload & parsing |
| `/cover-letters` | AI cover letter generation |
| `/analytics` | Pipeline analytics |

## Deployment

Deployed on [Vercel](https://vercel.com). Production URL: **https://careeros-sand.vercel.app/**

Set the following environment variables in Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_API_URL` → your Render backend URL
