/* OPTION 3 — Center-Framed (Editorial Specimen)
 *
 * HALLMARK DNA: centered composition, terminal prompt, pill CTAs,
 *   monochrome with sharp accent, generous whitespace, technical voice
 * FRONTEND-DNA: decorative corner brackets (accent L-shapes), frame
 *   around the hero, noise + grid background, staggered spring reveals,
 *   Framer Motion typewriter effect, scanline overlay
 *
 * Synthesis: The hero is a specimen on a pedestal — framed by
 *   accent corner brackets that literally draw attention. The
 *   terminal line above the wordmark types in. Below it, the
 *   wordmark & tagline sit inside the frame. CTAs below. The
 *   page says "this is important. look here."
 */

"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import DashboardContent from "./dash-content"

/* ─── Motion config ─── */
const container = {
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 24 } },
}

/* ─── Typewriter line ─── */
function TypewriterLine({ text, delay = 0 }: { text: string; delay?: number }) {
  const chars = text.split("")
  return (
    <span className="inline-flex overflow-hidden">
      {chars.map((ch, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + i * 0.04, duration: 0.08, ease: "easeOut" }}
          className="inline-block"
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
      <motion.span
        initial={{ opacity: 1 }}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ delay: delay + chars.length * 0.04, duration: 0.8, repeat: Infinity, repeatDelay: 0.4 }}
        className="ml-0.5 inline-block h-[1em] w-[2px] bg-accent"
      />
    </span>
  )
}

/* ─── Corner brackets ─── */
function CornerBrackets() {
  return (
    <>
      {/* Top-left */}
      <motion.div
        initial={{ clipPath: "inset(0 100% 100% 0)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="corner-bracket--tl corner-bracket"
      />
      {/* Top-right */}
      <motion.div
        initial={{ clipPath: "inset(0 0 100% 100%)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
        className="corner-bracket--tr corner-bracket"
      />
      {/* Bottom-left */}
      <motion.div
        initial={{ clipPath: "inset(100% 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
        className="corner-bracket--bl corner-bracket"
      />
      {/* Bottom-right */}
      <motion.div
        initial={{ clipPath: "inset(100% 0 0 100%)" }}
        animate={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.7 }}
        className="corner-bracket--br corner-bracket"
      />
    </>
  )
}

/* ─── Scroll-triggered section ─── */
function BelowFold() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="mx-auto mt-32 max-w-4xl px-6 pb-32 text-center"
    >
      <div className="grid gap-6 sm:grid-cols-3">
        {[
          { value: "35+", label: "companies" },
          { value: "3", label: "ATS sources" },
          { value: "95%", label: "match accuracy" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
            className="rounded-xl border-2 border-border bg-paper p-8"
          >
            <p className="font-display text-5xl font-bold tracking-tight text-ink">
              {stat.value}
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink-3">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}

/* ─── Landing ─── */
export function LandingOption3() {
  return (
    <div className="relative min-h-screen bg-paper">
      {/* Background layers */}
      <div className="grid-pattern-lg noise absolute inset-0" />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/4 blur-3xl" />
      </div>

      {/* Hero frame */}
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative w-full px-12 py-16"
        >
          <CornerBrackets />

          {/* Terminal line */}
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <p className="font-mono text-sm text-ink-3">
              <TypewriterLine text="> job_search --terminate 2026" delay={0.3} />
            </p>
          </motion.div>

          {/* Wordmark */}
          <motion.h1
            variants={fadeUp}
            className="text-center font-display text-7xl font-bold leading-[0.9] tracking-tighter text-ink sm:text-8xl"
          >
            CAREER
            <br />
            <span className="relative text-accent">
              OS
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-accent/10 blur-xl"
              />
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-md text-balance text-center text-base leading-relaxed text-ink-3"
          >
            AI-powered job search and application tracking. Discover roles, parse resumes,
            generate cover letters, and track your pipeline &mdash; in one place.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-4">
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

        {/* Footer line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="border-t-2 border-border px-12 pt-6 text-center font-mono text-xs text-ink-3"
        >
          &gt; 3 ATS sources &middot; 35+ companies &middot; AI matching
        </motion.div>
      </div>

      {/* Below fold */}
      <BelowFold />
    </div>
  )
}
