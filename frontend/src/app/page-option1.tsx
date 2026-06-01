/* OPTION 1 — Terminal-Asymmetric
 *
 * HALLMARK DNA: monochrome palette, terminal prompts, pill CTAs,
 *   generous whitespace, declarative copy, minimal motion
 * FRONTEND-DNA: asymmetric split layout, noise texture, staggered
 *   Framer Motion reveals, accent glow, hover surprises
 *
 * Synthesis: The page is a terminal session on the left and a
 *   product hero on the right. The dark panel reads as "the
 *   machine working" — the light panel reads as "the result."
 *   The accent is the thread connecting both sides.
 */

"use client"

import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import DashboardContent from "./dash-content"

/* ─── Motion config ─── */
const container = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 22 } },
}
const terminalLine = (i: number) => ({
  hidden: { width: "0%", opacity: 0 },
  show: {
    width: "100%",
    opacity: 1,
    transition: { duration: 1.2 + i * 0.4, ease: "linear" as const, delay: 0.3 + i * 0.25 },
  },
})

const terminalLogs = [
  "> job_search --discover --ai --source=all",
  "> LLM pipeline initialized",
  "> scanning 111+ company boards",
  "> deduplicating results...",
  "> pipeline ready. █",
]

/* ─── Terminal panel ─── */
function TerminalPane() {
  return (
    <div className="noise-heavy relative flex h-screen w-full flex-col justify-center bg-sidebar px-10">
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
        <motion.p
          variants={item}
          className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-accent"
        >
          session active
        </motion.p>
        {terminalLogs.map((line, i) => (
          <motion.div key={line} variants={item} className="overflow-hidden">
            <motion.p
              variants={terminalLine(i)}
              className="whitespace-nowrap font-mono text-sm text-ink-3"
              style={{ display: "inline-block", overflow: "hidden" }}
            >
              {line}
            </motion.p>
          </motion.div>
        ))}
        <motion.p variants={item} className="mt-8 font-mono text-[11px] text-ink-3">
          &copy; 2026 CAREEROS &mdash; build v3.0
        </motion.p>
      </motion.div>
    </div>
  )
}

/* ─── Hero panel ─── */
function HeroPane() {
  return (
    <div className="flex h-screen w-full flex-col justify-center bg-paper px-12">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl">
        <motion.div
          variants={item}
          className="mb-6 flex items-center gap-2 font-mono text-xs text-ink-3"
        >
          <span className="inline-block h-px w-6 bg-accent" />
          direct company job search
        </motion.div>

        <motion.h1
          variants={item}
          className="font-display text-7xl font-bold leading-[0.9] tracking-tighter text-ink sm:text-8xl"
        >
          CAREER
          <br />
          <span className="text-accent">OS</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mt-5 text-balance text-base leading-relaxed text-ink-3"
        >
          Your job search deserves better than the open web. AI-powered discovery, direct
          applications, and a pipeline that actually makes sense.
        </motion.p>

        <motion.div variants={item} className="mt-10 flex items-center gap-4">
          <motion.a
            href="/auth/login"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-sm font-medium text-paper transition-colors hover:bg-ink-2"
          >
            Sign In
            <span className="ml-2 inline-block transition-transform group-hover:translate-x-1">
              &rarr;
            </span>
          </motion.a>
          <motion.a
            href="/auth/register"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-border bg-paper px-8 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Get Started
          </motion.a>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-12 flex items-center gap-6 font-mono text-xs text-ink-3"
        >
          <span>3 ATS sources</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>111+ companies</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>AI matching</span>
        </motion.div>
      </motion.div>
    </div>
  )
}

/* ─── Combined landing ─── */
export function LandingOption1() {
  return (
    <div className="scanline relative flex min-h-screen bg-paper">
      {/* Decorative blur */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Left terminal */}
      <div className="hidden w-2/5 lg:block">
        <TerminalPane />
      </div>

      {/* Right hero */}
      <div className="flex w-full items-center lg:w-3/5">
        <HeroPane />
      </div>
    </div>
  )
}
