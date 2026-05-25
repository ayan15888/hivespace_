"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

// Dynamically import GrainGradient to disable SSR for canvas/WebGL
const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.GrainGradient),
  { ssr: false }
)

export function GradientBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="fixed inset-0 -z-10 bg-background" />
  }

  // Curated, beautiful theme-specific colors for the paper gradient
  let colorBack = "hsl(0, 0%, 98%)" // Warm bone/light base
  let colors = ["hsl(262, 80%, 92%)", "hsl(210, 100%, 95%)", "hsl(320, 80%, 94%)"] // Soft light pastels

  if (resolvedTheme === "dark") {
    colorBack = "hsl(240, 10%, 4%)" // Deep near-black #0E0E10
    colors = ["hsla(263, 100%, 12%, 1.00)", "hsl(195, 70%, 15%)", "hsl(330, 70%, 15%)"] // Deep violet/teal/rose
  } else if (resolvedTheme === "dark-blue") {
    colorBack = "hsla(0, 0%, 0%, 1.00)" // Deep dark blue #090D16
    colors = ["hsl(244, 55%, 18%)", "hsl(199, 89%, 15%)", "hsl(271, 70%, 18%)"] // Indigo/cyan/purple
  } else if (resolvedTheme === "claude") {
    colorBack = "hsla(60, 10%, 10%, 1.00)" // Warm terracotta-charcoal #262624
    colors = ["hsla(13, 88%, 10%, 1.00)", "hsl(35, 30%, 15%)", "hsl(4, 30%, 18%)"] // Terracotta/sand/clay
  }

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <GrainGradient
        style={{ height: "100%", width: "100%" }}
        colorBack={colorBack}
        softness={0.8}
        intensity={0.5}
        noise={0.22} // Premium subtle grain noise overlay
        shape="corners"
        offsetX={0}
        offsetY={0}
        scale={1.2}
        rotation={0}
        speed={1} // Smooth slow fluid animation
        colors={colors}
      />
    </div>
  )
}


