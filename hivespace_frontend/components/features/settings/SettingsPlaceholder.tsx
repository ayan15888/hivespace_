"use client"

import { Construction } from "lucide-react"

export default function SettingsPlaceholder({ title, description }: { title: string, description: string }) {
  return (
    <div className="max-w-2xl px-8 py-6 h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="h-16 w-16 rounded-full bg-hs-accent/10 flex items-center justify-center mb-6">
        <Construction className="h-8 w-8 text-hs-accent" strokeWidth={1.5} />
      </div>
      <h1 className="text-xl font-semibold text-[#E5E1E4] mb-2">{title}</h1>
      <p className="text-sm text-zinc-400 max-w-sm">
        {description || "We're currently building this part of the settings. Check back soon for more updates."}
      </p>
      
      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-md">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-[#272629] rounded-lg border border-zinc-800/50 flex flex-col p-3 gap-2">
            <div className="h-2 w-12 bg-zinc-800 rounded-full" />
            <div className="h-2 w-full bg-zinc-800 rounded-full" />
            <div className="h-2 w-2/3 bg-zinc-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
