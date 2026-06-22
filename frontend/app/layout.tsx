import "./globals.css"
import type { Metadata } from "next"
import { Inter, Cormorant_Garamond, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/common/theme-provider"
import React from "react"
import { GooeyToaster } from "@/components/ui/goey-toaster"
import { QueryProvider } from "@/components/common/query-provider"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
})

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "HiveSpace",
  description: "Advanced Agentic Coding Platform",
  manifest: "/manifest.json",
}

import { CommandPalette } from "@/components/common/CommandPalette"
import { GlobalContextMenu } from "@/components/common/GlobalContextMenu"
import { PwaRegister } from "@/components/common/PwaRegister"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.variable} ${cormorantGaramond.variable} ${jetbrainsMono.variable} font-sans tracking-tight`} suppressHydrationWarning>
        <PwaRegister />
        <GooeyToaster />
        <QueryProvider>
          <ThemeProvider>
            {children}
            <CommandPalette />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

