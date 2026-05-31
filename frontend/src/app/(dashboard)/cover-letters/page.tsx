"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { TerminalPage } from "@/components/layout/TerminalPage"

export default function CoverLettersPage() {
  const [company, setCompany] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [style, setStyle] = useState<"formal" | "conversational">("conversational")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    if (!company || !jobTitle || !jobDescription || !resumeText) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const data = await api.post<{ cover_letter: string }>("/api/cover-letters/generate", {
        company,
        job_title: jobTitle,
        job_description: jobDescription,
        resume_text: resumeText,
        style,
      })
      setResult(data.cover_letter)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <TerminalPage
      command="./generate --cover-letter"
      description="AI-powered cover letter generation"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
            <Input placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            <textarea
              className="flex h-24 w-full border-2 border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-ink"
              placeholder="Job Description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <textarea
              className="flex h-32 w-full border-2 border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:border-ink"
              placeholder="Your Resume / Experience"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant={style === "conversational" ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle("conversational")}
              >
                Conversational
              </Button>
              <Button
                variant={style === "formal" ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle("formal")}
              >
                Formal
              </Button>
            </div>
            {error && <p className="font-mono text-xs text-danger">{error}</p>}
            <Button className="w-full" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="max-w-none whitespace-pre-wrap text-sm text-ink-2">
                {result}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center border-2 border-dashed border-border">
                <p className="font-mono text-xs text-ink-3">Generated cover letter will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TerminalPage>
  )
}
