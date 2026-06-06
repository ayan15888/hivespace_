"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { 
  Hexagon, 
  Calendar, 
  FileText, 
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2
} from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getPublicProjectData, SharedProjectResponse } from "@/lib/api/share"
import { PROJECT_COLOR_MAP } from "@/lib/constants/colors"

const DOCUMENTS = [
  { title: "Project Overview" },
  { title: "API Reference" },
]

export default function StakeholderPage() {
  const params = useParams();
  const token = params?.token as string || "";

  const [data, setData] = useState<SharedProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getPublicProjectData(token)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load public project data");
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111113] text-[#E5E1E4] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#7C5CFC]" />
        <span className="text-sm text-zinc-500 font-medium tracking-wide">Loading secure stakeholder dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#111113] text-[#E5E1E4] flex flex-col items-center justify-center gap-6 max-w-md mx-auto px-6 text-center">
        <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
          ⚠️
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-sm text-zinc-500 leading-relaxed">
            This shareable link is invalid, has expired, or has been revoked by the project owner.
          </p>
        </div>
        <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Hivespace Security Gateway</span>
      </div>
    );
  }

  const { project, tasks } = data;
  const themeColor = PROJECT_COLOR_MAP[project.color || ""] || "#7C5CFC";

  // Calculate task statistics dynamically
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status?.toUpperCase() === "DONE").length;
  const inProgressTasks = tasks.filter(t => t.status?.toUpperCase() === "IN_PROGRESS" || t.status?.toUpperCase() === "INPROGRESS").length;
  const reviewTasks = tasks.filter(t => t.status?.toUpperCase() === "REVIEW").length;
  const todoTasks = tasks.filter(t => t.status?.toUpperCase() === "TODO").length;
  const backlogTasks = tasks.filter(t => t.status?.toUpperCase() === "BACKLOG").length;

  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const statusBreakdown = [
    { label: "Done", count: completedTasks, color: "bg-emerald-500", percent: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0 },
    { label: "In Progress", count: inProgressTasks, color: "bg-[#7C5CFC]", percent: totalTasks > 0 ? (inProgressTasks / totalTasks) * 100 : 0 },
    { label: "Review", count: reviewTasks, color: "bg-blue-500", percent: totalTasks > 0 ? (reviewTasks / totalTasks) * 100 : 0 },
    { label: "Todo", count: todoTasks, color: "bg-zinc-500", percent: totalTasks > 0 ? (todoTasks / totalTasks) * 100 : 0 },
    { label: "Backlog", count: backlogTasks, color: "bg-zinc-700", percent: totalTasks > 0 ? (backlogTasks / totalTasks) * 100 : 0 },
  ];

  // Compute days left
  let daysLeft: number | null = null;
  if (project.endDate) {
    const end = new Date(project.endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Format dates
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="min-h-screen bg-[#111113] text-[#E5E1E4] font-sans">
      
      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-50 bg-[#111113]/80 backdrop-blur-md border-b border-zinc-800/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[#E5E1E4]">
            <Hexagon className="h-5 w-5" style={{ color: themeColor }} fill="currentColor" fillOpacity={0.2} strokeWidth={2} />
            <span className="text-sm font-semibold tracking-tight">Hivespace</span>
          </div>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm font-medium text-zinc-400">{project.name} Progress</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
             <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Public Dashboard</span>
             <span className="text-xs text-zinc-400">Real-time update</span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-widest">Powered by Hivespace</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 flex flex-col gap-10">
        
        {/* ─── HERO SECTION ─── */}
        <section className="px-8 flex flex-col items-start">
          <h1 className="text-4xl font-bold tracking-tight text-[#E5E1E4]">{project.name}</h1>
          <p className="text-sm text-zinc-400 mt-2 font-medium">External Stakeholder Console</p>
          <p className="text-base text-zinc-500 mt-4 max-w-2xl leading-relaxed">
            {project.description || "No project description provided. This is a read-only sprint dashboard shared securely with project stakeholders."}
          </p>
          {(project.startDate || project.endDate) && (
            <div className="flex items-center gap-2 mt-6 bg-[#1A1A1C] border border-zinc-800/50 px-3 py-1.5 rounded-full">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
              <span className="text-xs text-zinc-400 font-medium">
                {formatDate(project.startDate)} – {formatDate(project.endDate)}
              </span>
            </div>
          )}
        </section>

        {/* ─── PROGRESS OVERVIEW ─── */}
        <section className="mx-8 bg-[#1A1A1C] border border-zinc-800/20 rounded-2xl p-8 shadow-2xl shadow-black/40">
           <div className="flex items-baseline gap-4 mb-2">
              <span className="text-6xl font-bold tracking-tighter text-[#E5E1E4]">{progressPercentage}%</span>
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Project complete</span>
           </div>
           
           <div className="relative h-3 w-full bg-zinc-950 rounded-full mt-6 overflow-hidden border border-zinc-900">
              <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(124,92,252,0.3)]" style={{ width: `${progressPercentage}%`, backgroundColor: themeColor }} />
           </div>

           <div className="grid grid-cols-4 gap-4 mt-10">
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">{completedTasks}</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tasks Done</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">{totalTasks - completedTasks}</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Remaining</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-3xl font-bold text-[#E5E1E4]">{reviewTasks}</span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">In Review</span>
              </div>
              <div className="flex flex-col gap-1">
                 <span className={cn("text-3xl font-bold", daysLeft !== null && daysLeft <= 3 ? "text-amber-500" : "text-[#E5E1E4]")}>
                   {daysLeft !== null ? (daysLeft > 0 ? daysLeft : 0) : "--"}
                 </span>
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Days Left</span>
              </div>
           </div>
        </section>

        {/* ─── REAL ACTIVE TASKS ─── */}
        <section className="px-8">
            <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">PROJECT TASKS & TIMELINE ({totalTasks})</h3>
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div key={task.id} className="bg-[#1A1A1C] border border-zinc-800/10 rounded-xl p-5 hover:border-zinc-700/50 transition-colors group">
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          {task.status?.toUpperCase() === "DONE" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                          ) : (
                            <Clock className="h-4 w-4 text-zinc-500" strokeWidth={2} />
                          )}
                          <span className="text-sm font-semibold text-zinc-200 group-hover:text-[#E5E1E4] transition-colors">{task.title}</span>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-mono text-zinc-500">{task.taskIdentifier}</span>
                          <Badge className={cn(
                            "border-none text-[10px] font-bold h-5 px-2 rounded-sm uppercase",
                            task.status?.toUpperCase() === "DONE" ? "bg-emerald-500/10 text-emerald-500" : 
                            task.status?.toUpperCase() === "IN_PROGRESS" || task.status?.toUpperCase() === "INPROGRESS" ? "bg-violet-500/10 text-violet-500" :
                            "bg-zinc-800 text-zinc-400"
                          )}>
                            {task.status}
                          </Badge>
                       </div>
                    </div>
                    {task.description && (
                      <p className="text-xs text-zinc-500 mb-3 ml-7 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 ml-7 text-[10px] text-zinc-600 font-mono">
                      <span>Priority: {task.priority || "NORMAL"}</span>
                      {task.points !== undefined && <span>Points: {task.points}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#1A1A1C] border border-zinc-800/10 rounded-xl p-8 text-center text-zinc-500 italic">
                  No active tasks found in this project sprint.
                </div>
              )}
            </div>
        </section>

        {/* ─── TASK STATUS BREAKDOWN ─── */}
        <section className="px-8">
           <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">STATUS SUMMARY</h3>
           <div className="bg-[#1A1A1C] border border-zinc-800/10 rounded-2xl p-6 flex flex-col gap-5 shadow-xl shadow-black/10">
              {statusBreakdown.map((status) => (
                <div key={status.label} className="flex items-center gap-4">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-24 shrink-0">{status.label}</span>
                   <div className="flex-1 h-3 bg-zinc-950 rounded-md overflow-hidden relative">
                      <div className={cn("absolute top-0 left-0 h-full rounded-md", status.color)} style={{ width: `${status.percent}%` }} />
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
             This progress report was shared securely by project leads using Hivespace. Last updated: Real-time.
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
