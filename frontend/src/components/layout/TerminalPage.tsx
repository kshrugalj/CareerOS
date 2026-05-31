"use client"

import { motion } from "framer-motion"
import { type ReactNode } from "react"

interface TerminalPageProps {
  command: string
  description?: string
  children: ReactNode
}

export function TerminalPage({ command, description, children }: TerminalPageProps) {
  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-8"
      >
        <div className="group flex items-center gap-2 font-mono text-sm text-ink">
          <span className="text-accent">{">"}</span>
          <span className="tracking-tight">{command}</span>
          <span className="inline-block h-4 w-[2px] bg-accent animate-cursor-blink" />
        </div>
        {description && (
          <p className="mt-1.5 pl-4 font-mono text-xs leading-relaxed text-ink-3">
            <span className="text-ink-3/50">{"//"}</span> {description}
          </p>
        )}
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
