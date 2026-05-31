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
            "> auth --login",
            "> initializing session...",
            "> firestore connected",
            "> waiting for credentials...",
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
          Your career
          <br />
          <span className="text-accent">deserves better.</span>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-6 font-mono text-xs leading-relaxed text-ink-3">
          AI-powered job search and application tracking.
          <br />
          Direct applications. No job boards. One dashboard.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-12 flex items-center gap-2 font-mono text-xs text-ink-3">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-glow-pulse" />
          ready for credentials
        </motion.div>
      </motion.div>
    </div>
  )
}

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const { login, loginWithGoogle } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      await login(email, password)
      router.push("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
  }

  const handleGoogle = async () => {
    setError("")
    try {
      await loginWithGoogle()
      router.push("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed")
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
            <span className="text-accent">{">"}</span> auth.login
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            <span className="text-accent">C</span>AREEROS
          </h1>
        </motion.div>

        <motion.div variants={fadeUp} className="hidden lg:mb-10 lg:block">
          <div className="mb-2 font-mono text-xs text-ink-3">
            <span className="text-accent">{">"}</span> auth.login
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
            Sign In
          </Button>
        </motion.form>

        <motion.div variants={fadeUp} className="relative my-7">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-paper px-3 font-mono text-[11px] uppercase text-ink-3">or</span>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-7 text-center text-sm text-ink-3">
          Don&apos;t have an account?{" "}
          <a href="/auth/register" className="font-medium text-ink underline-offset-2 hover:underline">
            Create one
          </a>
        </motion.p>
      </div>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <div className="scanline flex min-h-screen">
      <TerminalBrand />
      <LoginForm />
    </div>
  )
}
