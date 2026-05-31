"use client"

import { useState } from "react"
import { LandingOption1 } from "@/app/page-option1"
import { LandingOption2 } from "@/app/page-option2"
import { LandingOption3 } from "@/app/page-option3"

const options = [
  {
    id: 1,
    name: "Terminal-Asymmetric",
    tagline: "Dark side-panel terminal + light hero. For the developer audience.",
  },
  {
    id: 2,
    name: "Split-Studio",
    tagline: "Canonical two-column Stripe/Linear hero with terminal metric card.",
  },
  {
    id: 3,
    name: "Center-Framed",
    tagline: "Editorial specimen on a pedestal with accent corner brackets.",
  },
]

export default function OptionsPage() {
  const [active, setActive] = useState<1 | 2 | 3>(3)

  return (
    <>
      {/* Floating selector */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-1.5 rounded-full border-2 border-border bg-paper/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActive(opt.id as 1 | 2 | 3)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all duration-150 ${
                active === opt.id
                  ? "bg-ink text-paper"
                  : "text-ink-3 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Render active option */}
      <div className="relative">
        {active === 1 && <LandingOption1 />}
        {active === 2 && <LandingOption2 />}
        {active === 3 && <LandingOption3 />}
      </div>
    </>
  )
}
