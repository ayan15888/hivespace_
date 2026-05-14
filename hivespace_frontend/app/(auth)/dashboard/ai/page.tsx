"use client";

import React, { useState } from "react";
import { 
  Sparkles, 
  Search, 
  GitPullRequest, 
  Zap, 
  Filter, 
  FileText, 
  MessageSquare, 
  ArrowLeft, 
  Share2, 
  KanbanSquare, 
  RefreshCw, 
  ArrowUp, 
  CheckCircle, 
  ChevronRight,
  MoreVertical,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Home Quick Actions
const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    title: "Generate Tasks",
    desc: "Paste a feature spec or description and AI will break it into structured subtasks with priorities and suggested assignees.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    desc: "Search across all tasks, docs, and messages in natural language. Find anything instantly.",
  },
  {
    icon: GitPullRequest,
    title: "Review PR",
    desc: "Get an AI summary of any pull request — key changes, potential issues, and review checklist.",
  },
  {
    icon: Zap,
    title: "Sprint Retrospective",
    desc: "Generate a complete sprint retrospective doc with completed work, blockers, and velocity trends.",
  },
  {
    icon: Filter,
    title: "Smart Triage",
    desc: "Auto-classify and prioritize a list of issues or tickets. Recommends assignees based on history.",
  },
  {
    icon: FileText,
    title: "Draft Document",
    desc: "Generate a first draft for RFCs, runbooks, meeting notes, or any structured document.",
  },
];

const RECENT_CONVS = [
  { title: "Generate tasks for Tiptap editor feature", time: "2h ago" },
  { title: "Summarize #backend-ops last 50 messages", time: "Yesterday" },
  { title: "PR #76 review summary", time: "2 days ago" },
  { title: "Sprint 2 retrospective", time: "Last week" },
];

// Active Conversation Data
const GENERATED_TASKS = [
  { priority: "High", color: "bg-red-500", title: "Setup Tiptap editor with ProseMirror config", assignee: "RS", points: 3 },
  { priority: "High", color: "bg-red-500", title: "Implement auto-save with 30s debounce", assignee: "RS", points: 2 },
  { priority: "Normal", color: "bg-blue-500", title: "Add slash command menu for block types", assignee: "RK", points: 5 },
  { priority: "Normal", color: "bg-blue-500", title: "Build inline task embed [[HS-XXX]] syntax", assignee: "MV", points: 3 },
  { priority: "Normal", color: "bg-blue-500", title: "Implement page linking [[page name]]", assignee: "DK", points: 3 },
  { priority: "Low", color: "bg-zinc-500", title: "Add version history with restore capability", assignee: "SA", points: 5 },
];

export default function AIAssistantPage() {
  const [state, setState] = useState<"home" | "conversation">("home");

  return (
    <div className="flex h-full bg-[#201F21] overflow-hidden">
      {state === "home" ? (
        <AIHome onStart={() => setState("conversation")} />
      ) : (
        <AIConversation onBack={() => setState("home")} />
      )}
    </div>
  );
}

function AIHome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto scrollbar-none">
      <div className="max-w-3xl w-full flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 border border-violet-500/20">
            <Sparkles className="h-7 w-7 text-[#7C5CFC]" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-semibold text-[#E5E1E4]">Hivespace AI</h1>
          <p className="text-sm text-zinc-400 mt-1">Your intelligent workspace assistant</p>
        </div>

        {/* Quick Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {QUICK_ACTIONS.map((card, i) => (
            <div 
              key={i} 
              onClick={onStart}
              className="group bg-[#272629] border border-zinc-800/50 rounded-lg p-5 hover:border-[#7C5CFC]/30 hover:bg-[#7C5CFC]/5 cursor-pointer transition-all duration-200"
            >
              <div className="h-9 w-9 rounded-md bg-[#7C5CFC]/10 flex items-center justify-center text-[#7C5CFC]">
                <card.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-medium text-[#E5E1E4] mt-4">{card.title}</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{card.desc}</p>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C5CFC] mt-4 block opacity-0 group-hover:opacity-100 transition-opacity">
                Try it →
              </span>
            </div>
          ))}
        </div>

        {/* Prompt Bar */}
        <div className="mt-10 w-full max-w-2xl">
          <div className="bg-zinc-800 border border-zinc-700/50 rounded-xl px-4 h-12 flex items-center gap-3 focus-within:border-[#7C5CFC]/50 transition-colors shadow-xl shadow-black/20">
            <Sparkles className="h-4 w-4 text-[#7C5CFC]/60" />
            <input 
              type="text" 
              placeholder="Ask anything, generate tasks, search docs..." 
              className="bg-transparent border-none outline-none text-sm text-[#E5E1E4] placeholder:text-zinc-500 flex-1"
              onKeyDown={(e) => e.key === 'Enter' && onStart()}
            />
            <div className="flex items-center gap-1.5 bg-zinc-700 rounded px-1.5 py-0.5 border border-zinc-600/50">
               <span className="text-[10px] text-zinc-500 font-mono">⌘</span>
               <span className="text-[10px] text-zinc-500 font-mono">K</span>
            </div>
          </div>

          {/* Recent */}
          <div className="mt-8">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Recent</h4>
            <div className="space-y-1">
              {RECENT_CONVS.map((conv, i) => (
                <div 
                  key={i} 
                  onClick={onStart}
                  className="group h-8 flex items-center justify-between px-2 hover:bg-zinc-800/40 rounded-md cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-3 w-3 text-zinc-500" />
                    <span className="text-xs text-zinc-400 truncate group-hover:text-zinc-300">{conv.title}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">{conv.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Capabilities Footer */}
          <div className="mt-12 flex justify-center gap-3">
             <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-full px-3 py-1 text-[10px] text-zinc-500">Reads your tasks</div>
             <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-full px-3 py-1 text-[10px] text-zinc-500">Searches your docs</div>
             <div className="bg-zinc-800/50 border border-zinc-700/30 rounded-full px-3 py-1 text-[10px] text-zinc-500">Understands your projects</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIConversation({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#201F21]">
        {/* Header */}
        <header className="h-12 border-b border-zinc-800/50 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400">
               <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-medium text-[#E5E1E4]">Generate tasks for Tiptap editor</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs text-zinc-500 hover:text-zinc-300 font-medium px-2 py-1">New conversation</button>
            <button className="p-1.5 text-zinc-500 hover:text-zinc-300">
               <Share2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-none">
          {/* User Message */}
          <div className="flex flex-col items-end gap-2 max-w-2xl ml-auto">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl rounded-tr-sm px-4 py-3 shadow-lg shadow-black/10">
              <p className="text-sm text-[#E5E1E4] leading-relaxed">
                I need to implement the Tiptap rich text editor for the docs module. Can you break this into tasks?
              </p>
            </div>
            <Avatar className="h-5 w-5 rounded-sm">
               <AvatarFallback className="bg-zinc-700 text-[8px] text-zinc-400 rounded-sm">JD</AvatarFallback>
            </Avatar>
          </div>

          {/* AI Message */}
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-1.5 mb-1 px-1">
               <Sparkles className="h-3 w-3 text-[#7C5CFC]" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hivespace AI</span>
            </div>
            <div className="bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-r-xl px-5 py-4 space-y-4">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Here are the structured tasks I&apos;ve generated for the Tiptap editor implementation. I&apos;ve broken this into 6 tasks across 2 phases:
              </p>

              {/* Task Cards */}
              <div className="space-y-2">
                 {GENERATED_TASKS.map((task, i) => (
                   <div key={i} className="bg-[#272629] border border-zinc-800/80 rounded-lg p-3 group hover:border-[#7C5CFC]/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", task.color)} />
                          <span className="text-[10px] font-medium text-zinc-500">{task.priority}</span>
                          <span className="bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] text-[9px] font-bold px-1 py-0 rounded-sm ml-1">NEW TASK</span>
                        </div>
                        <MoreVertical className="h-3 w-3 text-zinc-700" />
                      </div>
                      <p className="text-sm font-medium text-[#E5E1E4] mb-3">{task.title}</p>
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Avatar className="h-5 w-5 rounded-md">
                              <AvatarFallback className="bg-zinc-800 text-[9px] text-zinc-500 rounded-md">{task.assignee}</AvatarFallback>
                           </Avatar>
                           <span className="text-[10px] text-zinc-400">{task.assignee === 'RS' ? 'Rahul S.' : task.assignee}</span>
                         </div>
                         <span className="text-[10px] text-zinc-600">{task.points} points</span>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="pt-2 text-sm text-zinc-300">
                 <p className="mb-4">
                   Total estimate: <span className="text-[#E5E1E4] font-medium">21 story points</span>. Suggested sprint: <span className="text-[#7C5CFC] font-medium">Sprint 3</span> (has capacity). Suggested assignees based on past ownership.
                 </p>
                 <p className="text-zinc-500 italic">Ready to add these to Sprint 3?</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                 <button className="h-8 px-4 flex items-center gap-2 rounded-md bg-[linear-gradient(145deg,#CABEFF,#947DFF)] text-black text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
                   <KanbanSquare className="h-3.5 w-3.5" />
                   Add all to Sprint 3
                 </button>
                 <button className="h-8 px-3 text-[10px] font-bold text-zinc-500 hover:text-zinc-300 uppercase tracking-wider">
                   Edit tasks first
                 </button>
                 <button className="h-8 px-3 flex items-center gap-2 text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-wider">
                   <RefreshCw className="h-3 w-3" />
                   Regenerate
                 </button>
              </div>

              {/* Source Tags */}
              <div className="pt-4 flex items-center gap-2 border-t border-[#7C5CFC]/10 text-[10px] text-zinc-600">
                 <span>Based on:</span>
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Tiptap docs</span>
                 <span className="h-1 w-1 rounded-full bg-zinc-800" />
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Sprint 3 board</span>
                 <span className="h-1 w-1 rounded-full bg-zinc-800" />
                 <span className="hover:text-[#7C5CFC] cursor-pointer">Team velocity data</span>
              </div>
            </div>
          </div>

          {/* User Success Reply */}
          <div className="flex flex-col items-end gap-2 max-w-2xl ml-auto">
            <div className="bg-zinc-800 border border-zinc-700 rounded-xl rounded-tr-sm px-4 py-3 shadow-lg shadow-black/10">
              <p className="text-sm text-[#E5E1E4]">Add all to Sprint 3 and assign to the suggested people</p>
            </div>
          </div>

          {/* AI Success Message */}
          <div className="flex flex-col gap-2 max-w-3xl pb-10">
             <div className="flex items-center gap-1.5 mb-1 px-1">
               <Sparkles className="h-3 w-3 text-[#7C5CFC]" />
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Hivespace AI</span>
            </div>
            <div className="bg-[#7C5CFC]/5 border-l-2 border-[#7C5CFC] rounded-r-xl px-5 py-4 space-y-4">
               <p className="text-sm text-zinc-300">
                 Done! I&apos;ve created 6 tasks in Sprint 3. <span className="font-mono text-xs text-zinc-400">HS-046</span> through <span className="font-mono text-xs text-zinc-400">HS-051</span> are now in your Backlog with suggested assignees.
               </p>
               
               <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-start gap-3 max-w-sm shadow-lg shadow-green-950/10">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-green-400">6 tasks created successfully</p>
                    <button className="text-[10px] text-[#7C5CFC] mt-1 font-medium hover:underline">View in board →</button>
                  </div>
               </div>

               <div className="pt-2 flex items-center gap-2 text-[10px] text-zinc-600 italic">
                 Total: 21 points added to Sprint 3 capacity.
               </div>
            </div>
          </div>
        </div>

        {/* Compose Bar */}
        <div className="p-6 bg-gradient-to-t from-[#201F21] via-[#201F21] to-transparent">
          <div className="max-w-3xl mx-auto w-full">
            <div className="bg-zinc-800 border border-[#7C5CFC]/20 rounded-xl px-4 py-2 flex items-center gap-3 focus-within:border-[#7C5CFC]/40 transition-colors shadow-2xl shadow-black/30">
              <Sparkles className="h-4 w-4 text-[#7C5CFC]/40" />
              <input 
                type="text" 
                placeholder="Follow up, ask for changes..." 
                className="bg-transparent border-none outline-none text-sm text-[#E5E1E4] placeholder:text-zinc-600 flex-1 py-1"
              />
              <button className="h-7 w-7 rounded-md bg-[#7C5CFC] flex items-center justify-center text-white hover:bg-[#947DFF] transition-colors">
                 <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-600 text-center mt-3 uppercase tracking-wider font-semibold opacity-60">
              AI has access to tasks, docs, and channels in Engineering workspace
            </p>
          </div>
        </div>
      </div>

      {/* Context Panel (Right) */}
      <aside className="w-[280px] bg-[#1B1B1D] border-l border-zinc-800/50 p-5 flex flex-col gap-6 overflow-y-auto scrollbar-none">
        <section>
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Activity className="h-3 w-3" /> Context
          </h4>
          
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Tasks Referenced</p>
              <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-zinc-800/50 rounded transition-colors group cursor-pointer border border-transparent hover:border-zinc-800">
                <div className="h-1 w-1 rounded-full bg-red-500" />
                <span className="font-mono text-[10px] text-zinc-600">HS-044</span>
                <span className="text-[10px] text-zinc-400 truncate flex-1">STOMP WebSocket chat...</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Docs Referenced</p>
              <div className="flex items-center gap-2 py-1 px-1.5 hover:bg-zinc-800/50 rounded transition-colors group cursor-pointer">
                <FileText className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] text-zinc-400 truncate">Tiptap specs v2.pdf</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-zinc-700 uppercase tracking-tight mb-2">Tasks Created</p>
              <div className="bg-green-500/5 border border-green-500/10 rounded-md p-3">
                 <p className="text-xs font-semibold text-green-500 mb-1">6 tasks added</p>
                 <p className="font-mono text-[9px] text-zinc-600 leading-relaxed">
                   HS-046, HS-047, HS-048, HS-049, HS-050, HS-051
                 </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-auto pt-6 border-t border-zinc-800/50">
           <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3">Scope</h4>
           <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-zinc-400">Engineering workspace</span>
              <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-600 rounded-sm">Active</Badge>
           </div>
           <div className="flex items-center justify-between group">
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">Include all workspaces</span>
              <Switch className="data-[state=checked]:bg-[#7C5CFC]" />
           </div>
        </section>
      </aside>
    </div>
  );
}
