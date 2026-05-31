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
  title: "CareerOS",
  description: "AI-Powered Job Search & Application Tracking",
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
