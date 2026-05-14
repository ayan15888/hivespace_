"use client"

import { 
  Hexagon, 
  Calendar, 
  FileText, 
  ChevronRight, 
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// --- MOCK DATA ---

const MILESTONES = [
  { name: "Authentication & Auth", progress: 100, tasks: "5/5", status: "Done", icon: CheckCircle2 },
  { name: "GitHub Integration", progress: 80, tasks: "4/5", status: "Apr 12", icon: Clock },
  { name: "Real-time Chat", progress: 40, tasks: "2/5", status: "Apr 15", icon: Clock },
]

const STATUS_BREAKDOWN = [
  { label: "Done", count: 8, color: "bg-emerald-500", width: "w-[80%]" },
  { label: "In Progress", count: 3, color: "bg-[#7C5CFC]", width: "w-[30%]" },
  { label: "Review", count: 2, color: "bg-blue-500", width: "w-[20%]" },
  { label: "Todo", count: 4, color: "bg-zinc-600", width: "w-[40%]" },
  { label: "Backlog", count: 3, color: "bg-zinc-700", width: "w-[30%]" },
]

const DOCUMENTS = [
  { title: "Project Overview" },
  { title: "API Reference" },
]

export default function StakeholderPage() {
  return (
    <div className="min-h-screen bg-[#111113] text-[#E5E1E4] font-sans">
      
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#111113]/80 backdrop-blur-md border-b border-zinc-800/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#E5E1E4]">
            <Hexagon className="h-5 w-5 text-[#7C5CFC]" fill="currentColor" fillOpacity={0.2} strokeWidth={2} />
            <span className="text-sm font-semibold tracking-tight">Hivespace</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm font-medium text-zinc-400">Sprint 3 Progress</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Last updated</span>
             <span className="text-xs text-zinc-400">2 hours ago</span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Powered by Hivespace</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 flex flex-col gap-10">
        
        {/* ─── HERO SECTION ─── */}
        <section className="px-8 flex flex-col items-start">
          <h1 className="text-4xl font-bold tracking-tight text-[#E5E1E4]">Sprint 3</h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">Acme Corp · Engineering</p>
          <p className="text-base text-zinc-500 mt-4 max-w-2xl leading-relaxed">
            Focused backend infrastructure sprint targeting real-time communication, GitHub deployment hooks, and document collaboration stability.
          </p>
          <div className="flex items-center gap-2 mt-6 bg-[#1A1A1C] border border-zinc-800/50 px-3 py-1.5 rounded-full">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
            <span className="text-xs text-zinc-400 font-medium">Apr 1 – Apr 15, 2026</span>
          </div>
        </section>

        {/* ─── PROGRESS OVERVIEW ─── */}
        <section className="mx-8 bg-[#1A1A1C] border border-zinc-800/20 rounded-2xl p-8 shadow-2xl shadow-black/40">
           <div className="flex items-baseline gap-4 mb-2">
              <span className="text-6xl font-bold tracking-tighter text-[#E5E1E4]">68%</span>
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Sprint complete</span>
           </div>
           
           <div className="relative h-3 w-full bg-zinc-950 rounded-full mt-6 overflow-hidden border border-zinc-900">
              <div className="absolute top-0 left-0 h-full bg-[#7C5CFC] rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(124,92,252,0.3)]" style={{ width: '68%' }} />
           </div>

           <div className="grid grid-cols-4 gap-4 mt-10">
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">17</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tasks Done</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">8</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Remaining</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">2</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">In Review</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-amber-500">5</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Days Left</span>
              </div>
           </div>
        </section>

        {/* ─── MILESTONE SECTION ─── */}
        <section className="px-8">
           <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">MILESTONES</h3>
           <div className="flex flex-col gap-3">
              {MILESTONES.map((m) => {
                const Icon = m.icon
                return (
                  <div key={m.name} className="bg-[#1A1A1C] border border-zinc-800/10 rounded-xl p-5 hover:border-zinc-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", m.progress === 100 ? "text-emerald-500" : "text-zinc-500")} strokeWidth={2} />
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-[#E5E1E4] transition-colors">{m.name}</span>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-zinc-500">{m.tasks} tasks</span>
                          <Badge className={cn(
                            "border-none text-[10px] font-bold h-5 px-2 rounded-sm",
                            m.progress === 100 ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-800 text-zinc-400"
                          )}>
                            {m.status}
                          </Badge>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="h-1.5 flex-1 bg-zinc-950 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", m.progress === 100 ? "bg-emerald-500" : "bg-[#7C5CFC]")} style={{ width: `${m.progress}%` }} />
                       </div>
                       <span className="text-[10px] font-bold text-zinc-500 w-8 text-right">{m.progress}%</span>
                    </div>
                  </div>
                )
              })}
           </div>
        </section>

        {/* ─── TASK STATUS BREAKDOWN ─── */}
        <section className="px-8">
           <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">TASK STATUS BREAKDOWN</h3>
           <div className="bg-[#1A1A1C] border border-zinc-800/10 rounded-2xl p-6 flex flex-col gap-5 shadow-xl shadow-black/10">
              {STATUS_BREAKDOWN.map((status) => (
                <div key={status.label} className="flex items-center gap-4">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-24 shrink-0">{status.label}</span>
                   <div className="flex-1 h-3 bg-zinc-950 rounded-md overflow-hidden relative">
                      <div className={cn("absolute top-0 left-0 h-full rounded-md", status.color)} style={{ width: status.width.replace('w-[', '').replace(']', '') }} />
                   </div>
                   <span className="text-xs font-bold text-zinc-400 w-6 text-right">{status.count}</span>
                </div>
              ))}
           </div>
        </section>

        {/* ─── SHARED DOCS ─── */}
        <section className="px-8">
           <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">DOCUMENTS</h3>
           <div className="grid grid-cols-2 gap-4">
              {DOCUMENTS.map((doc) => (
                <div key={doc.title} className="bg-[#1A1A1C] border border-zinc-800/10 rounded-xl p-4 flex items-center hover:bg-zinc-800/30 transition-all group cursor-pointer">
                   <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-violet-400 transition-colors">
                      <FileText className="h-5 w-5" strokeWidth={1.5} />
                   </div>
                   <span className="ml-4 text-sm font-medium text-zinc-300 group-hover:text-[#E5E1E4] transition-colors">{doc.title}</span>
                   <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">View</span>
                      <ArrowRight className="h-3 w-3 text-violet-400" />
                   </div>
                </div>
              ))}
           </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="mt-8 px-8 py-12 border-t border-zinc-800/50 flex flex-col items-center gap-3 text-center">
           <p className="text-xs text-zinc-600 max-w-sm leading-relaxed">
             This progress report was shared by <span className="text-zinc-400 font-medium">Acme Corp</span> using Hivespace. Generated on April 15, 2026.
           </p>
           <div className="flex items-center gap-2 text-zinc-500 opacity-60">
              <Hexagon className="h-4 w-4" strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Hivespace — All-in-one team workspace</span>
           </div>
        </footer>

      </main>
    </div>
  )
}
