import type { Metadata } from "next"
import { Syne, Archivo, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
})

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://careeros-sand.vercel.app"),
  title: {
    default: "CareerOS",
    template: "%s | CareerOS",
  },
  description: "AI-powered direct-company job search & application tracking. Discover roles at 111+ companies, parse resumes, generate cover letters, and track your pipeline.",
  keywords: ["job search", "AI", "career", "application tracking", "resume", "cover letter", "CareerOS"],
  authors: [{ name: "kshrugalj", url: "https://github.com/kshrugalj" }],
  openGraph: {
    title: "CareerOS",
    description: "AI-powered direct-company job search & application tracking platform.",
    url: "https://careeros-sand.vercel.app",
    siteName: "CareerOS",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerOS",
    description: "AI-powered direct-company job search & application tracking platform.",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${archivo.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
