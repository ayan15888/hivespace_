import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/common/theme-provider"
import React from "react"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HiveSpace",
  description: "Advanced Agentic Coding Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <body className={`${inter.className} bg-[#000000] tracking-tight`}>
        <Toaster position="bottom-right" richColors theme="dark" />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
