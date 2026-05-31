"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Briefcase,
  Search,
  FileText,
  BarChart3,
  User,
  LogOut,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/applications", label: "Applications", icon: Briefcase },
  { href: "/jobs", label: "Job Discovery", icon: Search },
  { href: "/cover-letters", label: "Cover Letters", icon: FileText },
  { href: "/resume", label: "Resume", icon: User },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
]

export function Sidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()

  return (
    <aside className="noise-heavy relative flex h-full w-56 flex-col overflow-hidden bg-sidebar text-paper">
      {/* Ghost terminal lines in background */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-mono text-[11px] leading-6 text-paper/5">
        <div className="mt-20 space-y-1.5 px-5">
          {[
            "> npm run dev",
            "> initializing modules...",
            "> connecting to firestore",
            "> loading pipeline data",
            "> session authenticated",
            "> watcher ready.",
            ">  ",
            "> job_search --discover",
            "> scanning 35+ sources",
            "> matching against profile",
            "> results: 247 listings",
          ].map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="relative z-10 flex h-14 items-center border-b-2 border-sidebar-3 px-5">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="font-display text-base font-bold tracking-tight">careeros</span>
          <span className="font-mono text-[10px] text-ink-3">
            ~$
            <span className="ml-0.5 inline-block h-3 w-[1.5px] bg-accent animate-cursor-blink" />
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-2 text-paper"
                  : "text-ink-3 hover:bg-sidebar-2 hover:text-paper",
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent" />
              )}
              <Icon className={cn("h-4 w-4", active && "text-accent")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer status */}
      <div className="relative z-10 flex items-center gap-2 border-t-2 border-sidebar-3 px-5 py-3 font-mono text-[10px] text-ink-3">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-glow-pulse" />
        session active
      </div>

      {/* Sign out */}
      <div className="relative z-10 border-t-2 border-sidebar-3 p-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded px-3 py-2 text-sm font-medium text-ink-3 transition-all duration-150 hover:bg-sidebar-2 hover:text-paper"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
