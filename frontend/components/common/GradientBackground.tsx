"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

// Dynamically import GrainGradient to disable SSR for canvas/WebGL
const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((mod) => mod.GrainGradient),
  { ssr: false }
)

export function GradientBackground({ theme }: { theme?: string }) {
  const { resolvedTheme } = useTheme()
  const activeTheme = theme || resolvedTheme
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

  if (activeTheme === "dark") {
    colorBack = "hsl(240, 10%, 4%)" // Deep near-black #0E0E10
    colors = ["hsla(263, 100%, 12%, 1.00)", "hsl(195, 70%, 15%)", "hsl(330, 70%, 15%)"] // Deep violet/teal/rose
  } else if (activeTheme === "dark-blue") {
    colorBack = "hsla(0, 0%, 0%, 1.00)" // Deep dark blue #090D16
    colors = ["hsl(244, 55%, 18%)", "hsl(199, 89%, 15%)", "hsl(271, 70%, 18%)"] // Indigo/cyan/purple
  } else if (activeTheme === "claude") {
    colorBack = "hsl(40, 20%, 97%)" // Warm cream canvas (#faf9f5 equivalent)
    colors = ["hsl(36, 40%, 93%)", "hsl(20, 30%, 91%)", "hsl(45, 20%, 94%)"] // Cozy clay, warm coral, and light cream/amber tints
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


