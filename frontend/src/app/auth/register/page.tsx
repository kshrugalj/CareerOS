"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 24 } },
}

const container = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
}

function TerminalBrand() {
  return (
    <div className="noise-heavy relative hidden h-screen w-full flex-col justify-center overflow-hidden bg-sidebar px-12 lg:flex">
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-[11px] leading-6 text-paper/5">
        <div className="mt-20 space-y-1.5 px-5">
          {[
            "> auth --register",
            "> creating workspace...",
            "> generating keys...",
            "> ready for user input.",
          ].map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="relative">
        <motion.p variants={fadeUp} className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          careeros v3.0
        </motion.p>
        <motion.h1 variants={fadeUp} className="font-display text-5xl font-bold leading-[1.05] tracking-tighter text-paper">
          Join the
          <br />
          <span className="text-accent">future of search.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 font-mono text-xs leading-relaxed text-ink-3">
          Direct company job search meets AI-powered matching.
          <br />
          Create your account and transform your pipeline.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-12 flex items-center gap-2 font-mono text-xs text-ink-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-glow-pulse" />
          awaiting registration
        </motion.div>
      </motion.div>
    </div>
  )
}

function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await register(email, password)
      router.push("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed")
    }
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex h-screen w-full items-center justify-center bg-paper px-6"
    >
      <div className="w-full max-w-sm">
        <motion.div variants={fadeUp} className="mb-10 text-center lg:hidden">
          <div className="mb-2 font-mono text-xs text-ink-3">
            <span className="text-accent">{">"}</span> auth.register
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            <span className="text-accent">C</span>AREEROS
          </h1>
        </motion.div>

        <motion.div variants={fadeUp} className="hidden lg:mb-10 lg:block">
          <div className="mb-2 font-mono text-xs text-ink-3">
            <span className="text-accent">{">"}</span> auth.register
          </div>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="font-mono text-xs text-danger">{error}</p>}
          <Button type="submit" className="w-full">
            Create Account
          </Button>
        </motion.form>

        <motion.p variants={fadeUp} className="mt-7 text-center text-sm text-ink-3">
          Already have an account?{" "}
          <a href="/auth/login" className="font-medium text-ink underline-offset-2 hover:underline">
            Sign in
          </a>
        </motion.p>
      </div>
    </motion.div>
  )
}

export default function RegisterPage() {
  return (
    <div className="scanline flex min-h-screen">
      <TerminalBrand />
      <RegisterForm />
    </div>
  )
}
