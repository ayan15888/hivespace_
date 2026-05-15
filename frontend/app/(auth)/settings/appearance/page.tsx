"use client"

import { useState } from "react"
import { Monitor, Moon, Sun, Check } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface ThemeCardProps {
  id: string
  label: string
  active?: boolean
  onClick?: () => void
  comingSoon?: boolean
  children: React.ReactNode
}

function ThemeCard({ id, label, active, onClick, comingSoon, children }: ThemeCardProps) {
  return (
    <div 
      onClick={!comingSoon ? onClick : undefined}
      className={cn(
        "w-36 rounded-lg p-3 border-2 transition-all cursor-pointer flex flex-col items-center",
        comingSoon ? "opacity-50 cursor-not-allowed" : "hover:border-zinc-600",
        active ? "border-hs-accent" : "border-transparent bg-[#272629]/50"
      )}
    >
      <div className="w-full h-20 rounded-md mb-3 overflow-hidden relative border border-zinc-800">
        {children}
        {active && (
          <div className="absolute top-1 right-1 bg-hs-accent rounded-full p-0.5">
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-zinc-300">{label}</span>
      {comingSoon && <span className="text-[10px] text-zinc-600 mt-1">Coming soon</span>}
    </div>
  )
}

export default function AppearanceSettings() {
  const [fontSize, setFontSize] = useState([14])
  const [selectedTheme, setSelectedTheme] = useState("dark")

  return (
    <div className="max-w-2xl px-8 py-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-[#E5E1E4]">Appearance</h1>
        <p className="text-sm text-zinc-400 mt-1">Customize how Hivespace looks on your device</p>
      </header>

      {/* THEME SECTION */}
      <section>
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          THEME
        </h3>
        <div className="flex gap-4">
          <ThemeCard 
            id="dark" 
            label="Dark" 
            active={selectedTheme === "dark"}
            onClick={() => setSelectedTheme("dark")}
          >
            <div className="absolute inset-0 bg-[#0E0E10] flex flex-col p-2 gap-1.5">
              <div className="h-1.5 w-8 bg-zinc-800 rounded-full" />
              <div className="h-1.5 w-12 bg-zinc-800 rounded-full" />
              <div className="mt-auto h-3 w-full bg-[#1B1B1D] rounded-sm" />
            </div>
          </ThemeCard>

          <ThemeCard 
            id="light" 
            label="Light" 
            comingSoon
          >
            <div className="absolute inset-0 bg-zinc-100 flex flex-col p-2 gap-1.5">
              <div className="h-1.5 w-8 bg-zinc-300 rounded-full" />
              <div className="h-1.5 w-12 bg-zinc-300 rounded-full" />
              <div className="mt-auto h-3 w-full bg-zinc-200 rounded-sm" />
            </div>
          </ThemeCard>

          <ThemeCard 
            id="system" 
            label="System" 
            active={selectedTheme === "system"}
            onClick={() => setSelectedTheme("system")}
          >
            <div className="absolute inset-0 flex">
              <div className="flex-1 bg-zinc-100 p-2 overflow-hidden">
                <div className="h-1.5 w-6 bg-zinc-300 rounded-full" />
              </div>
              <div className="flex-1 bg-[#0E0E10] p-2 overflow-hidden">
                <div className="h-1.5 w-6 bg-zinc-800 rounded-full" />
              </div>
            </div>
          </ThemeCard>
        </div>
      </section>

      {/* DENSITY SECTION */}
      <section className="mt-10">
        <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
          UI DENSITY
        </h3>
        <RadioGroup defaultValue="default">
          <div className="space-y-3">
            <div className="flex items-center space-x-3 bg-[#272629] p-3 rounded-lg border border-zinc-800/50 hover:bg-[#2e2d30] transition-colors cursor-pointer">
              <RadioGroupItem value="compact" id="compact" className="text-hs-accent border-zinc-600" />
              <Label htmlFor="compact" className="flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-zinc-200">Compact</span>
                <span className="text-xs text-zinc-500">Tighter spacing, more information on screen</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 bg-[#272629] p-3 rounded-lg border border-hs-accent/30 hover:bg-[#2e2d30] transition-colors cursor-pointer">
              <RadioGroupItem value="default" id="default" className="text-hs-accent border-hs-accent" />
              <Label htmlFor="default" className="flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-zinc-200">Default</span>
                <span className="text-xs text-zinc-500">Balanced spacing — recommended for most users</span>
              </Label>
            </div>
            <div className="flex items-center space-x-3 bg-[#272629] p-3 rounded-lg border border-zinc-800/50 hover:bg-[#2e2d30] transition-colors cursor-pointer">
              <RadioGroupItem value="comfortable" id="comfortable" className="text-hs-accent border-zinc-600" />
              <Label htmlFor="comfortable" className="flex flex-col cursor-pointer">
                <span className="text-sm font-medium text-zinc-200">Comfortable</span>
                <span className="text-xs text-zinc-500">More breathing room between interface elements</span>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </section>

      {/* FONT SIZE SECTION */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            FONT SIZE
          </h3>
          <span className="text-[10px] font-bold text-hs-accent bg-hs-accent/10 px-1.5 py-0.5 rounded">
            {fontSize[0]}px
          </span>
        </div>
        <div className="px-1">
          <Slider 
            defaultValue={[14]} 
            max={18} 
            min={12} 
            step={1} 
            onValueChange={setFontSize}
            className="[&_[role=slider]]:bg-hs-accent [&_[role=slider]]:border-hs-accent"
          />
        </div>
        <div className="mt-6 p-4 rounded-lg bg-[#272629]/30 border border-zinc-800/50">
          <p 
            className="text-zinc-300 leading-relaxed transition-all" 
            style={{ fontSize: `${fontSize[0]}px` }}
          >
            The quick brown fox jumps over the lazy dog. This is a preview of how text will appear in your workspace. You can adjust the font size to your preference for better readability.
          </p>
        </div>
      </section>
    </div>
  )
}
