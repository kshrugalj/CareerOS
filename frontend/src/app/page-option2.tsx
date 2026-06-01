/* OPTION 2 — Split-Studio
 *
 * HALLMARK DNA: two-column canonical hero (title left, lede right),
 *   single-family typography (Syne + Archivo), pill CTAs, hairline
 *   rules, monochrome with restrained accent, declarative copy
 * FRONTEND-DNA: staggered Framer Motion with spring physics, noise
 *   texture overlay, hover-reveal on right-panel cards, glow pulse
 *   on stat values, grid-pattern background
 *
 * Synthesis: The Stripe/Linear canonical hero — but with character.
 *   The right side is a terminal-output card that animates in with
 *   staggered lines. The left side is pure product messaging. The
 *   two halves talk to each other.
 */

"use client"

import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import DashboardContent from "./dash-content"

/* ─── Motion config ─── */
const container = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 24 } },
}
const scaleFade = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 90, damping: 20 } },
}

/* ─── Left column — hero copy ─── */
function HeroCopy() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-lg">
      <motion.div
        variants={fadeUp}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-surface bg-accent-surface px-4 py-1.5 font-mono text-xs text-accent"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-glow-pulse" />
        v3.0 &middot; now with AI matching
      </motion.div>

      <motion.h1 variants={fadeUp} className="font-display text-6xl font-bold leading-[1.05] tracking-tighter text-ink sm:text-7xl">
        Your career
        <br />
        deserves better
        <br />
        than <span className="text-accent">job boards.</span>
      </motion.h1>

      <motion.p variants={fadeUp} className="mt-5 text-balance text-base leading-relaxed text-ink-3">
        Direct company job search powered by AI. We parse resumes, discover roles at 111+
        companies, generate cover letters, and track your entire pipeline &mdash; in one
        dashboard.
      </motion.p>

      <motion.div variants={fadeUp} className="mt-10 flex items-center gap-4">
        <motion.a
          href="/auth/login"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-sm font-medium text-paper transition-colors hover:bg-ink-2"
        >
          Sign In &rarr;
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
    </motion.div>
  )
}

/* ─── Right column — terminal metric card ─── */
function TerminalMetrics() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="noise relative overflow-hidden rounded-xl border-2 border-border bg-paper p-8 shadow-lg"
    >
      {/* Decorative accent line top */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-accent" />

      <motion.div variants={fadeUp} className="mb-6 flex items-center gap-3 font-mono text-xs text-ink-3">
        <span className="inline-block h-2 w-2 rounded-full bg-accent animate-glow-pulse" />
        pipeline status
        <span className="ml-auto text-accent">active</span>
      </motion.div>

      <div className="space-y-4">
        {[
          { label: "companies scanned", value: "35", suffix: "+" },
          { label: "active listings", value: "247", suffix: "" },
          { label: "match score", value: "92", suffix: "%" },
          { label: "applications queued", value: "14", suffix: "" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={scaleFade}
            className="flex items-center justify-between border-b-2 border-border pb-3 last:border-0 last:pb-0"
          >
            <span className="font-mono text-xs text-ink-3">&gt; {stat.label}</span>
            <span className="font-display text-2xl font-bold tracking-tight text-ink">
              {stat.value}
              <span className="text-accent">{stat.suffix}</span>
            </span>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} className="mt-6 flex items-center gap-2 border-t-2 border-border pt-4 font-mono text-xs text-ink-3">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
        last updated 2m ago
      </motion.div>
    </motion.div>
  )
}

/* ─── Landing ─── */
export function LandingOption2() {
  return (
    <div className="relative min-h-screen bg-paper">
      {/* Background */}
      <div className="grid-pattern noise absolute inset-0" />
      <div className="pointer-events-none absolute left-1/3 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent/3 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <HeroCopy />
          <TerminalMetrics />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mx-auto mt-20 flex w-full max-w-2xl items-center justify-center gap-6 border-t-2 border-border pt-6 font-mono text-xs text-ink-3"
        >
          <span>greenhouse</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>lever</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>ashby</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>111+ companies</span>
          <span className="h-1 w-1 rounded-full bg-ink-3" />
          <span>ai matching</span>
        </motion.div>
      </div>
    </div>
  )
}
